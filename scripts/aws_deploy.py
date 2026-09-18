"""Put the demo's data and model on AWS (ticket #9).

    python scripts/aws_deploy.py data       # upload data/sales.parquet to s3://<bucket>/data/
    python scripts/aws_deploy.py endpoint   # package the model, create the Serverless endpoint
    python scripts/aws_deploy.py status     # what exists right now
    python scripts/aws_deploy.py down --yes # delete endpoint, config and model (the bucket stays)

Resources are created by boto3, tagged like everything else, and named from backend/config.py, so
the app needs no extra configuration beyond DATA_SOURCE=s3 / STORE_BACKEND=aws / MODEL_BACKEND=sagemaker.
See docs/adr/0001-serverless-inference-endpoint.md for why the endpoint is serverless.
"""
import io
import json
import sys
import tarfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import boto3
from botocore.exceptions import ClientError

from backend.config import settings

REGION = settings.AWS_REGION                       # data and Runs: ap-southeast-7 (Thailand)
MODEL_REGION = settings.SAGEMAKER_REGION           # the endpoint: see the note on IMAGE below
session = boto3.Session(region_name=REGION)
ACCOUNT = session.client("sts").get_caller_identity()["Account"]
BUCKET = settings.S3_BUCKET or f"demand-demo-{ACCOUNT}"
# SageMaker will only read a model artifact from a bucket in the endpoint's own region
MODEL_BUCKET = f"{BUCKET}-models"
ENDPOINT = settings.SAGEMAKER_ENDPOINT
MODEL_NAME = f"{ENDPOINT}-model"
CONFIG_NAME = f"{ENDPOINT}-config"
ARTIFACT_KEY = "models/model.tar.gz"
TAGS = [{"Key": "Project", "Value": "demand-demo"}, {"Key": "Environment", "Value": "demo"},
        {"Key": "Owner", "Value": "phatphong"}]

# Two regional facts, both measured against this account rather than assumed:
#   - ap-southeast-7 refuses a serverless endpoint config ("This region does not support the
#     serverless endpoint"), so the endpoint runs in MODEL_REGION while the data stays in Thailand.
#   - the scikit-learn framework container is not published there either, so the PyTorch CPU
#     deep-learning container is used purely as a Python serving base; inference.py never imports
#     torch. The image is large, so cold start sits at the long end of ADR-0001's range.
DLC_ACCOUNT = {"ap-southeast-1": "763104351884", "ap-southeast-7": "590183813437"}[MODEL_REGION]
IMAGE = f"{DLC_ACCOUNT}.dkr.ecr.{MODEL_REGION}.amazonaws.com/pytorch-inference:2.6.0-cpu-py312"

s3 = session.client("s3")                                        # data bucket, in REGION
ms3 = boto3.client("s3", region_name=MODEL_REGION)               # model bucket, in MODEL_REGION
sm = boto3.client("sagemaker", region_name=MODEL_REGION)

INFERENCE_PY = '''"""SageMaker handler for the demand-forecast LightGBM model.

The container gives us Python; everything below is the same code the API runs in-process, so the
endpoint and the fallback cannot answer differently.
"""
import json
import os
import pickle

import numpy as np
import pandas as pd

FEATURES = ["product_group", "flavor", "size", "year", "month", "month_id",
            "promo_flag", "promo_days_in_month", "promo_discount_pct", "promo_type"]
CATEGORICAL = ["product_group", "flavor", "size", "promo_type"]


def to_X(df, categories):
    X = df[FEATURES].copy()
    for c in CATEGORICAL:
        X[c] = pd.Categorical(X[c], categories=categories[c])
    return X


def model_fn(model_dir):
    with open(os.path.join(model_dir, "model.pkl"), "rb") as f:
        art = pickle.load(f)
    art["explainer"] = None
    return art


def input_fn(body, content_type="application/json"):
    return json.loads(body)


def predict_fn(payload, art):
    rows, explain = payload["rows"], payload.get("explain", False)
    X = to_X(pd.DataFrame(rows), art["categories"])
    pred = art["model"].predict(X)
    out = [{"prediction": float(p), "p10": float(p * (1 + art["q10"])), "p90": float(p * (1 + art["q90"]))} for p in pred]
    if explain:
        import shap
        if art["explainer"] is None:
            art["explainer"] = shap.TreeExplainer(art["model"])
        contributions = np.asarray(art["explainer"].shap_values(X))
        base = float(np.ravel(art["explainer"].expected_value)[0])
        for o, row in zip(out, contributions):
            o["explanations"] = {f: float(v) for f, v in zip(FEATURES, row)}
            o["base"] = base
    return {"predictions": out, "model_version": f"{art['model_name']} {art['version']}"}


def output_fn(prediction, accept="application/json"):
    return json.dumps(prediction), "application/json"
'''

# shap pulls numba; both are installed at container start, which is why the cold start is slow.
REQUIREMENTS = "lightgbm==4.5.0\nshap==0.46.0\npandas\n"


def artifact() -> bytes:
    """model.tar.gz = the trained artifact plus code/ that SageMaker runs."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in ("model.pkl", "metadata.json"):
            path = Path(settings.MODEL_PATH) / name
            if path.exists():
                tar.add(path, arcname=name)
        for name, text in (("code/inference.py", INFERENCE_PY), ("code/requirements.txt", REQUIREMENTS)):
            info = tarfile.TarInfo(name)
            data = text.encode()
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def upload_data():
    for local, key in [(ROOT / "data" / "sales.parquet", settings.S3_DATA_KEY)]:
        if not local.exists():
            sys.exit(f"missing {local}: run python -m backend.data.generator first")
        s3.put_object(Bucket=BUCKET, Key=key, Body=local.read_bytes())
        print(f"  ok   s3://{BUCKET}/{key} ({local.stat().st_size:,} bytes)")


def model_bucket(role_arn: str):
    """A tagged bucket in the endpoint's region holding just model.tar.gz.

    The execution role is a Studio role whose AmazonSageMakerFullAccess only reaches buckets with
    "sagemaker" in the name, so a bucket policy grants it this one. Writing a bucket policy needs
    no IAM permission, which is what makes this work without an admin (see #3)."""
    try:
        ms3.create_bucket(Bucket=MODEL_BUCKET, CreateBucketConfiguration={"LocationConstraint": MODEL_REGION})
    except ClientError as e:
        if e.response["Error"]["Code"] not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            raise
    ms3.put_public_access_block(Bucket=MODEL_BUCKET, PublicAccessBlockConfiguration={
        "BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
    ms3.put_bucket_tagging(Bucket=MODEL_BUCKET, Tagging={"TagSet": TAGS})
    ms3.put_bucket_policy(Bucket=MODEL_BUCKET, Policy=json.dumps({"Version": "2012-10-17", "Statement": [{
        "Sid": "SageMakerEndpointReadsModels", "Effect": "Allow", "Principal": {"AWS": role_arn},
        "Action": ["s3:GetObject", "s3:ListBucket"],
        "Resource": [f"arn:aws:s3:::{MODEL_BUCKET}", f"arn:aws:s3:::{MODEL_BUCKET}/*"]}]}))
    print(f"  ok   bucket {MODEL_BUCKET} in {MODEL_REGION}, readable by {role_arn.rsplit('/', 1)[-1]}")


def execution_role() -> str:
    """Reuse the SageMaker Studio execution role already in the account: creating one needs IAM
    rights this user does not have (see #3)."""
    domains = sm.list_domains()["Domains"]
    for d in domains:
        role = sm.describe_domain(DomainId=d["DomainId"])["DefaultUserSettings"].get("ExecutionRole")
        if role:
            return role
    sys.exit("no SageMaker execution role found in this region: an admin must create one (see #3)")


def create_endpoint():
    role = execution_role()
    print(f"  role {role}")
    model_bucket(role)
    data = artifact()
    ms3.put_object(Bucket=MODEL_BUCKET, Key=ARTIFACT_KEY, Body=data)
    print(f"  ok   s3://{MODEL_BUCKET}/{ARTIFACT_KEY} ({len(data):,} bytes)")

    drop_model()
    sm.create_model(
        ModelName=MODEL_NAME, ExecutionRoleArn=role, Tags=TAGS,
        PrimaryContainer={"Image": IMAGE, "ModelDataUrl": f"s3://{MODEL_BUCKET}/{ARTIFACT_KEY}",
                          "Environment": {"SAGEMAKER_PROGRAM": "inference.py",
                                          "SAGEMAKER_SUBMIT_DIRECTORY": "/opt/ml/model/code",
                                          "SAGEMAKER_CONTAINER_LOG_LEVEL": "20"}})
    print(f"  ok   model {MODEL_NAME}")
    sm.create_endpoint_config(
        EndpointConfigName=CONFIG_NAME, Tags=TAGS,
        ProductionVariants=[{"VariantName": "AllTraffic", "ModelName": MODEL_NAME,
                             "ServerlessConfig": {"MemorySizeInMB": 2048, "MaxConcurrency": 2}}])
    print(f"  ok   config {CONFIG_NAME} (serverless, 2 GB, concurrency 2 - scales to zero)")
    try:
        sm.create_endpoint(EndpointName=ENDPOINT, EndpointConfigName=CONFIG_NAME, Tags=TAGS)
    except ClientError as e:
        if e.response["Error"]["Code"] != "ValidationException":
            raise
        sm.update_endpoint(EndpointName=ENDPOINT, EndpointConfigName=CONFIG_NAME)
    print(f"  ..   endpoint {ENDPOINT} creating; this takes a few minutes")
    wait()


def wait():
    for _ in range(60):
        state = sm.describe_endpoint(EndpointName=ENDPOINT)["EndpointStatus"]
        if state in ("InService", "Failed"):
            print(f"  {'ok  ' if state == 'InService' else 'FAIL'} endpoint {state}")
            if state == "Failed":
                print("      ", sm.describe_endpoint(EndpointName=ENDPOINT).get("FailureReason"))
            return state
        time.sleep(15)
    print("  ..   still creating; run `status` later")
    return "Creating"


def status():
    try:
        e = sm.describe_endpoint(EndpointName=ENDPOINT)
        print(f"  endpoint {ENDPOINT}: {e['EndpointStatus']}  {e.get('FailureReason', '')}")
    except ClientError:
        print(f"  endpoint {ENDPOINT}: absent")
    for cli, bucket, key in ((s3, BUCKET, settings.S3_DATA_KEY), (ms3, MODEL_BUCKET, ARTIFACT_KEY)):
        try:
            print(f"  s3://{bucket}/{key}: {cli.head_object(Bucket=bucket, Key=key)['ContentLength']:,} bytes")
        except ClientError:
            print(f"  s3://{bucket}/{key}: absent")


def drop_model():
    """A Model and EndpointConfig are immutable, so recreating means deleting first."""
    for call, kwargs in ((sm.delete_endpoint_config, {"EndpointConfigName": CONFIG_NAME}),
                         (sm.delete_model, {"ModelName": MODEL_NAME})):
        try:
            call(**kwargs)
        except ClientError:
            pass


def down():
    try:
        sm.delete_endpoint(EndpointName=ENDPOINT)
        print(f"  ok   endpoint {ENDPOINT} deleted")
    except ClientError as e:
        print(f"  skip endpoint: {e.response['Error']['Code']}")
    drop_model()
    print("  ok   model and endpoint config deleted (bucket and table untouched)")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    print(f"account {ACCOUNT}, data in {REGION} ({BUCKET}), endpoint in {MODEL_REGION}")
    if cmd == "data":
        upload_data()
    elif cmd == "endpoint":
        create_endpoint()
    elif cmd == "status":
        status()
    elif cmd == "wait":
        wait()
    elif cmd == "down":
        if "--yes" not in sys.argv:
            sys.exit("down deletes the endpoint: add --yes")
        down()
    else:
        sys.exit(__doc__)
