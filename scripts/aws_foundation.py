"""AWS foundation for the demand demo (ticket #3): bucket, table, backend IAM user, tags, budget.

    python scripts/aws_foundation.py up      # create everything (idempotent); IAM/billing steps it cannot do are listed for an admin
    python scripts/aws_foundation.py check   # prove the acceptance criteria against the live account
    python scripts/aws_foundation.py iam     # print the admin checklist: policies, user, role, budget action
    python scripts/aws_foundation.py down --yes   # tear everything down

Uses the `demand` AWS profile (or whatever AWS_PROFILE/.env says). Reads OWNER_TAG and BUDGET_EMAIL from .env.
"""
import json
import os
import sys
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parent.parent
for line in (ROOT / ".env").read_text().splitlines() if (ROOT / ".env").exists() else []:
    if line.strip() and not line.startswith("#") and "=" in line:
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip())

REGION = os.getenv("BEDROCK_REGION", "ap-southeast-7")  # Thailand: data and inference enter the account here
session = boto3.Session(profile_name=os.getenv("AWS_PROFILE"), region_name=REGION)
sts = session.client("sts")
IDENTITY = sts.get_caller_identity()
ACCOUNT = IDENTITY["Account"]
CALLER = IDENTITY["Arn"].rsplit("/", 1)[-1]

BUCKET = f"demand-demo-{ACCOUNT}"
TABLE = "demand-demo"
BUDGET = "demand-demo"
ENDPOINT = "demand-demo-forecast"  # SageMaker Serverless endpoint created by ticket #9
USER = "demand-render"
POLICY = "demand-render"
DENY_POLICY = "demand-demo-deny-invoke"
BUDGET_ROLE = "demand-demo-budget-action"
PREFIXES = ["data/", "models/", "runs/", "uploads/", "docs/"]
MODELS = [  # must match backend/config.py BEDROCK_MODEL_*
    "anthropic.claude-haiku-4-5-20251001-v1:0",
    "anthropic.claude-sonnet-4-6",
    "anthropic.claude-opus-4-6-v1",
]
TAGS = {"Project": "demand-demo", "Environment": "demo", "Owner": os.getenv("OWNER_TAG") or CALLER}
TAG_LIST = [{"Key": k, "Value": v} for k, v in TAGS.items()]
BUDGET_EMAIL = os.getenv("BUDGET_EMAIL", "")
RENDER_ENV = ROOT / ".env.render"  # gitignored; Render copies its values from here

s3 = session.client("s3")
ddb = session.client("dynamodb")
iam = session.client("iam")
budgets = session.client("budgets", region_name="us-east-1")
ce = session.client("ce", region_name="us-east-1")
tagging = session.client("resourcegroupstaggingapi")

ADMIN_TODO = []


def ok(msg):
    print(f"  ok   {msg}")


def admin(msg):
    ADMIN_TODO.append(msg)
    print(f"  ADMIN {msg}")


def code(e):
    return e.response["Error"]["Code"]


def render_policy():
    return {
        "Version": "2012-10-17",
        "Statement": [
            {"Sid": "Bucket", "Effect": "Allow", "Action": "s3:ListBucket", "Resource": f"arn:aws:s3:::{BUCKET}"},
            {"Sid": "Objects", "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
             "Resource": f"arn:aws:s3:::{BUCKET}/*"},
            {"Sid": "Table", "Effect": "Allow",
             "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem",
                        "dynamodb:Query", "dynamodb:Scan", "dynamodb:BatchGetItem", "dynamodb:BatchWriteItem"],
             "Resource": f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/{TABLE}"},
            {"Sid": "Claude", "Effect": "Allow", "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
             # a global inference profile needs the profile ARN plus the foundation model in every region it routes to
             "Resource": [f"arn:aws:bedrock:{REGION}:{ACCOUNT}:inference-profile/global.{m}" for m in MODELS]
                         + [f"arn:aws:bedrock:*::foundation-model/{m}" for m in MODELS]},
            {"Sid": "Endpoint", "Effect": "Allow", "Action": ["sagemaker:InvokeEndpoint", "sagemaker:DescribeEndpoint"],
             "Resource": f"arn:aws:sagemaker:{REGION}:{ACCOUNT}:endpoint/{ENDPOINT}"},
        ],
    }


def deny_policy():
    return {"Version": "2012-10-17", "Statement": [{"Effect": "Deny", "Resource": "*",
            "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream", "sagemaker:InvokeEndpoint"]}]}


def budget_role_trust():
    return {"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "sts:AssumeRole",
            "Principal": {"Service": "budgets.amazonaws.com"}}]}


def budget_role_policy():
    return {"Version": "2012-10-17", "Statement": [{"Effect": "Allow",
            "Action": ["iam:AttachUserPolicy", "iam:DetachUserPolicy"], "Resource": f"arn:aws:iam::{ACCOUNT}:user/{USER}"}]}


# ── up ──────────────────────────────────────────────────────────────────────

def up_bucket():
    try:
        s3.create_bucket(Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": REGION})
        ok(f"bucket {BUCKET} created in {REGION}")
    except ClientError as e:
        if code(e) not in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
            raise
        ok(f"bucket {BUCKET} exists")
    s3.put_public_access_block(Bucket=BUCKET, PublicAccessBlockConfiguration={
        "BlockPublicAcls": True, "IgnorePublicAcls": True, "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
    s3.put_bucket_tagging(Bucket=BUCKET, Tagging={"TagSet": TAG_LIST})
    for p in PREFIXES:
        s3.put_object(Bucket=BUCKET, Key=p)
    ok(f"bucket private, tagged, prefixes {PREFIXES}")


def up_table():
    try:
        ddb.create_table(TableName=TABLE, BillingMode="PAY_PER_REQUEST",
                         AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}, {"AttributeName": "sk", "AttributeType": "S"}],
                         KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}, {"AttributeName": "sk", "KeyType": "RANGE"}],
                         Tags=TAG_LIST)
        ok(f"table {TABLE} created")
    except ClientError as e:
        if code(e) != "ResourceInUseException":
            raise
        ok(f"table {TABLE} exists")
    ddb.get_waiter("table_exists").wait(TableName=TABLE)
    arn = ddb.describe_table(TableName=TABLE)["Table"]["TableArn"]
    ddb.tag_resource(ResourceArn=arn, Tags=TAG_LIST)


def ensure_policy(name, doc):
    arn = f"arn:aws:iam::{ACCOUNT}:policy/{name}"
    try:
        iam.create_policy(PolicyName=name, PolicyDocument=json.dumps(doc), Tags=TAG_LIST)
        ok(f"policy {name} created")
    except ClientError as e:
        if code(e) != "EntityAlreadyExists":
            raise
        ok(f"policy {name} exists")
    return arn


def up_iam():
    try:
        policy_arn = ensure_policy(POLICY, render_policy())
        ensure_policy(DENY_POLICY, deny_policy())
        try:
            iam.create_user(UserName=USER, Tags=TAG_LIST)
            ok(f"user {USER} created")
        except ClientError as e:
            if code(e) != "EntityAlreadyExists":
                raise
            ok(f"user {USER} exists")
        iam.attach_user_policy(UserName=USER, PolicyArn=policy_arn)
        if not iam.list_access_keys(UserName=USER)["AccessKeyMetadata"]:
            key = iam.create_access_key(UserName=USER)["AccessKey"]
            RENDER_ENV.write_text(f"AWS_ACCESS_KEY_ID={key['AccessKeyId']}\nAWS_SECRET_ACCESS_KEY={key['SecretAccessKey']}\n"
                                  f"AWS_REGION={REGION}\nS3_BUCKET={BUCKET}\nDYNAMODB_TABLE={TABLE}\nSAGEMAKER_ENDPOINT={ENDPOINT}\n")
            ok(f"access key for {USER} written to {RENDER_ENV.name} (gitignored) - copy it into Render")
        else:
            ok(f"user {USER} already has an access key (not regenerated)")
        try:
            iam.create_role(RoleName=BUDGET_ROLE, AssumeRolePolicyDocument=json.dumps(budget_role_trust()), Tags=TAG_LIST)
        except ClientError as e:
            if code(e) != "EntityAlreadyExists":
                raise
        iam.put_role_policy(RoleName=BUDGET_ROLE, PolicyName="attach-deny", PolicyDocument=json.dumps(budget_role_policy()))
        ok(f"role {BUDGET_ROLE} ready for the budget action")
        return True
    except ClientError as e:
        if code(e) not in ("AccessDenied", "AccessDeniedException"):
            raise
        admin(f"IAM denied for {CALLER}: run `python scripts/aws_foundation.py iam` and hand the output to an admin")
        return False


def up_budget(have_iam):
    if not BUDGET_EMAIL:
        admin("BUDGET_EMAIL not set in .env (wizard stage 5) - budget skipped")
        return
    try:
        budgets.describe_budget(AccountId=ACCOUNT, BudgetName=BUDGET)
        ok(f"budget {BUDGET} exists")
    except ClientError as e:
        if code(e) != "NotFoundException":
            raise
        budgets.create_budget(
            AccountId=ACCOUNT,
            Budget={"BudgetName": BUDGET, "BudgetType": "COST", "TimeUnit": "MONTHLY",
                    "BudgetLimit": {"Amount": "50", "Unit": "USD"},
                    "CostFilters": {"TagKeyValue": ["user:Project$demand-demo"]}},
            NotificationsWithSubscribers=[{
                "Notification": {"NotificationType": "ACTUAL", "ComparisonOperator": "GREATER_THAN", "Threshold": t, "ThresholdType": "PERCENTAGE"},
                "Subscribers": [{"SubscriptionType": "EMAIL", "Address": BUDGET_EMAIL}]} for t in (50, 75, 90)])
        ok(f"budget {BUDGET} $50/month, alerts 50/75/90% -> {BUDGET_EMAIL}")
    try:
        ce.update_cost_allocation_tags_status(CostAllocationTagsStatus=[{"TagKey": "Project", "Status": "Active"}])
        ok("cost-allocation tag Project active")
    except ClientError:
        admin("activate the `Project` cost-allocation tag from the payer account (Billing > Cost allocation tags); until then the budget sees $0")
    if not have_iam:
        admin("budget action (90% -> deny invoke) needs the IAM role and deny policy from the checklist")
        return
    if budgets.describe_budget_actions_for_budget(AccountId=ACCOUNT, BudgetName=BUDGET)["Actions"]:
        ok("budget action exists")
        return
    budgets.create_budget_action(
        AccountId=ACCOUNT, BudgetName=BUDGET, NotificationType="ACTUAL",
        ActionType="APPLY_IAM_POLICY", ActionThreshold={"ActionThresholdValue": 90, "ActionThresholdType": "PERCENTAGE"},
        Definition={"IamActionDefinition": {"PolicyArn": f"arn:aws:iam::{ACCOUNT}:policy/{DENY_POLICY}", "Users": [USER]}},
        ExecutionRoleArn=f"arn:aws:iam::{ACCOUNT}:role/{BUDGET_ROLE}", ApprovalModel="AUTOMATIC",
        Subscribers=[{"SubscriptionType": "EMAIL", "Address": BUDGET_EMAIL}])
    ok(f"budget action: at 90% attach {DENY_POLICY} to {USER}")


def up():
    print(f"account {ACCOUNT} as {CALLER}, region {REGION}, tags {TAGS}")
    up_bucket()
    up_table()
    have_iam = up_iam()
    up_budget(have_iam)
    if ADMIN_TODO:
        print("\nstill needed from an admin:")
        for t in ADMIN_TODO:
            print(f"  - {t}")


# ── iam checklist ───────────────────────────────────────────────────────────

def iam_checklist():
    dump = lambda d: json.dumps(d, indent=2)  # noqa: E731
    print(f"""# Admin checklist for the demand demo (account {ACCOUNT})

The IAM user `{CALLER}` has PowerUserAccess and cannot touch IAM. Either attach
IAMFullAccess to `{CALLER}` temporarily and re-run `python scripts/aws_foundation.py up`,
or run these once with an admin profile:

```sh
cat > /tmp/render.json <<'EOF'
{dump(render_policy())}
EOF
cat > /tmp/deny.json <<'EOF'
{dump(deny_policy())}
EOF
cat > /tmp/trust.json <<'EOF'
{dump(budget_role_trust())}
EOF
cat > /tmp/role.json <<'EOF'
{dump(budget_role_policy())}
EOF
T="Key=Project,Value=demand-demo Key=Environment,Value=demo Key=Owner,Value={TAGS['Owner']}"
aws iam create-policy --policy-name {POLICY} --policy-document file:///tmp/render.json --tags $T
aws iam create-policy --policy-name {DENY_POLICY} --policy-document file:///tmp/deny.json --tags $T
aws iam create-user --user-name {USER} --tags $T
aws iam attach-user-policy --user-name {USER} --policy-arn arn:aws:iam::{ACCOUNT}:policy/{POLICY}
aws iam create-access-key --user-name {USER}      # -> hand the pair to the developer for Render, never commit it
aws iam create-role --role-name {BUDGET_ROLE} --assume-role-policy-document file:///tmp/trust.json --tags $T
aws iam put-role-policy --role-name {BUDGET_ROLE} --policy-name attach-deny --policy-document file:///tmp/role.json
```

Then, from the payer account: Billing > Cost allocation tags > activate `Project`
(the $50 budget filters on `Project=demand-demo` and reads $0 until this is done).

Finally re-run `python scripts/aws_foundation.py up` as `{CALLER}` to add the budget action.
""")


# ── check ───────────────────────────────────────────────────────────────────

def check():
    fails = []
    tagged = tagging.get_resources(TagFilters=[{"Key": "Project", "Values": ["demand-demo"]}])["ResourceTagMappingList"]
    arns = sorted(r["ResourceARN"] for r in tagged)
    print("tagged Project=demand-demo:")
    for a in arns:
        print(f"  {a}")
    for want in (f"arn:aws:s3:::{BUCKET}", f"arn:aws:dynamodb:{REGION}:{ACCOUNT}:table/{TABLE}"):
        if want not in arns:
            fails.append(f"not tagged: {want}")
    if f"arn:aws:iam::{ACCOUNT}:policy/{POLICY}" not in arns:
        fails.append(f"IAM policy {POLICY} missing or untagged (admin step)")

    s3.put_object(Bucket=BUCKET, Key="runs/_check", Body=b"ok")
    assert s3.get_object(Bucket=BUCKET, Key="runs/_check")["Body"].read() == b"ok"
    s3.delete_object(Bucket=BUCKET, Key="runs/_check")
    ddb.put_item(TableName=TABLE, Item={"pk": {"S": "_check"}, "sk": {"S": "1"}})
    assert ddb.get_item(TableName=TABLE, Key={"pk": {"S": "_check"}, "sk": {"S": "1"}})["Item"]["sk"]["S"] == "1"
    ddb.delete_item(TableName=TABLE, Key={"pk": {"S": "_check"}, "sk": {"S": "1"}})
    ok(f"put/get in {BUCKET} and {TABLE} as {CALLER}")

    if RENDER_ENV.exists():
        env = dict(l.split("=", 1) for l in RENDER_ENV.read_text().split() if "=" in l)
        r = boto3.Session(aws_access_key_id=env["AWS_ACCESS_KEY_ID"], aws_secret_access_key=env["AWS_SECRET_ACCESS_KEY"], region_name=REGION)
        rs3, rddb = r.client("s3"), r.client("dynamodb")
        rs3.put_object(Bucket=BUCKET, Key="runs/_render", Body=b"ok")
        assert rs3.get_object(Bucket=BUCKET, Key="runs/_render")["Body"].read() == b"ok"
        rs3.delete_object(Bucket=BUCKET, Key="runs/_render")
        rddb.put_item(TableName=TABLE, Item={"pk": {"S": "_render"}, "sk": {"S": "1"}})
        rddb.delete_item(TableName=TABLE, Key={"pk": {"S": "_render"}, "sk": {"S": "1"}})
        other = next((b["Name"] for b in s3.list_buckets()["Buckets"] if b["Name"] != BUCKET), None)
        if other:
            try:
                rs3.list_objects_v2(Bucket=other, MaxKeys=1)
                fails.append(f"{USER} can read bucket {other}")
            except ClientError as e:
                assert code(e) == "AccessDenied", e
        ok(f"{USER} key: put/get on bucket + table, denied on {other}")
    else:
        fails.append(f"{RENDER_ENV.name} missing: {USER} key not created yet (admin step)")

    try:
        b = budgets.describe_budget(AccountId=ACCOUNT, BudgetName=BUDGET)["Budget"]
        n = budgets.describe_notifications_for_budget(AccountId=ACCOUNT, BudgetName=BUDGET)["Notifications"]
        acts = budgets.describe_budget_actions_for_budget(AccountId=ACCOUNT, BudgetName=BUDGET)["Actions"]
        thresholds = sorted(x["Threshold"] for x in n)
        ok(f"budget ${b['BudgetLimit']['Amount']} thresholds {thresholds} actions {len(acts)}")
        if thresholds != [50, 75, 90]:
            fails.append(f"budget thresholds {thresholds}")
        if not acts:
            fails.append("budget has no action (admin step)")
    except ClientError as e:
        fails.append(f"budget: {code(e)}")

    print("\nFAIL" if fails else "\nPASS")
    for f in fails:
        print(f"  - {f}")
    sys.exit(1 if fails else 0)


# ── down ────────────────────────────────────────────────────────────────────

def quiet(fn, *a, **kw):
    try:
        fn(*a, **kw)
        return True
    except ClientError as e:
        print(f"  skip {fn.__name__}: {code(e)}")
        return False


def down():
    try:
        for act in budgets.describe_budget_actions_for_budget(AccountId=ACCOUNT, BudgetName=BUDGET)["Actions"]:
            budgets.delete_budget_action(AccountId=ACCOUNT, BudgetName=BUDGET, ActionId=act["ActionId"])
    except ClientError:
        pass
    quiet(budgets.delete_budget, AccountId=ACCOUNT, BudgetName=BUDGET)
    quiet(ddb.delete_table, TableName=TABLE)
    try:
        for page in s3.get_paginator("list_object_versions").paginate(Bucket=BUCKET):
            objs = [{"Key": o["Key"], "VersionId": o["VersionId"]} for k in ("Versions", "DeleteMarkers") for o in page.get(k, [])]
            if objs:
                s3.delete_objects(Bucket=BUCKET, Delete={"Objects": objs})
        s3.delete_bucket(Bucket=BUCKET)
    except ClientError as e:
        print(f"  skip bucket: {code(e)}")
    try:
        for k in iam.list_access_keys(UserName=USER)["AccessKeyMetadata"]:
            iam.delete_access_key(UserName=USER, AccessKeyId=k["AccessKeyId"])
        for p in iam.list_attached_user_policies(UserName=USER)["AttachedPolicies"]:
            iam.detach_user_policy(UserName=USER, PolicyArn=p["PolicyArn"])
        iam.delete_user(UserName=USER)
        iam.delete_role_policy(RoleName=BUDGET_ROLE, PolicyName="attach-deny")
        iam.delete_role(RoleName=BUDGET_ROLE)
        for name in (POLICY, DENY_POLICY):
            iam.delete_policy(PolicyArn=f"arn:aws:iam::{ACCOUNT}:policy/{name}")
    except ClientError as e:
        print(f"  skip iam: {code(e)} (admin must delete {USER}, {BUDGET_ROLE}, {POLICY}, {DENY_POLICY})")
    RENDER_ENV.unlink(missing_ok=True)
    print("down complete")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "up"
    if cmd == "up":
        up()
    elif cmd == "check":
        check()
    elif cmd == "iam":
        iam_checklist()
    elif cmd == "down":
        if "--yes" not in sys.argv:
            sys.exit("down deletes the bucket and its data: add --yes")
        down()
    else:
        sys.exit(__doc__)
