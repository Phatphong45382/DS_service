# Deployment

Three things to stand up: the AWS resources, the API on Render, the web app on Vercel. The scripts do everything a normal IAM user can; the rest is a short list for the account owner and an administrator.

## 1. AWS resources

Set `AWS_PROFILE` to a profile in the account, then:

```bash
python scripts/aws_foundation.py up      # bucket, DynamoDB table, tags, budget
python scripts/aws_foundation.py check   # proves each acceptance criterion against the live account
python scripts/aws_deploy.py data        # uploads data/sales.parquet and data/catalog.json
python scripts/aws_deploy.py endpoint    # packages the model, creates the Serverless endpoint
```

`up` is idempotent. `endpoint` invokes the new endpoint once before it reports success: an endpoint can reach `InService` and still fail every call, and the application would hide that behind its fallback.

To take it down: `python scripts/aws_deploy.py down --yes` removes the endpoint, its config, its model and the models bucket. `python scripts/aws_foundation.py down --yes` removes the data bucket and the table.

### What only an administrator can do

`scripts/aws_foundation.py up` prints these when it cannot do them itself. `python scripts/aws_foundation.py iam` prints the exact commands and policy documents.

- Create the IAM user `demand-render`, its least-privilege policy, the deny policy the budget attaches, and the budget's execution role. A user with PowerUserAccess can do everything else in this document but cannot write IAM.
- Activate the `Project` cost-allocation tag. This is done from the payer account, in Billing → Cost allocation tags. Until it is active the budget filters on a tag the billing system does not know and reports zero spend.
- Request Bedrock model access and quota for the Claude models, in the region the app calls. A new account starts with every Claude quota at zero and allows one open quota case at a time.

### What only the account owner can decide

- The email that receives budget alerts, and the value of the `Owner` tag. Put them in `.env` as `BUDGET_EMAIL` and `OWNER_TAG`, or run `scripts/setup-aws-account.sh`.
- The demo password.

## 2. API on Render

Build `pip install -r requirements.txt`, start `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. The Dockerfile installs `libgomp1`, which LightGBM needs and the slim image does not have.

`scripts/aws_foundation.py` writes `.env.render` with the backend's access key and every switch already set. It is gitignored; copy its values into Render's environment.

| Variable | Value |
|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | the `demand-render` key |
| `AWS_REGION` | `ap-southeast-7` |
| `SAGEMAKER_REGION` | `ap-southeast-1` |
| `S3_BUCKET`, `DYNAMODB_TABLE`, `SAGEMAKER_ENDPOINT` | as created by the scripts |
| `DATA_SOURCE`, `STORE_BACKEND`, `MODEL_BACKEND` | `s3`, `aws`, `sagemaker` |
| `SEED_RUN_ON_START` | `1` (default): with `STORE_BACKEND=local` a redeploy leaves no Runs, so the app makes one at startup. Set `0` once the store is DynamoDB |
| `AI_BACKEND` | `bedrock` once the quota is granted, `gemini` until then |
| `ENV` | `production` — hides the API docs and enforces the CORS list |
| `DEMO_PASSWORD` | the demo password |
| `CORS_ORIGINS` | the Vercel origin |

`ENV=production` with no `DEMO_PASSWORD` refuses to start rather than serving the demo to anyone who finds the URL.

## 3. Web app on Vercel

Root directory `malee-sales-app`. The only variable is `NEXT_PUBLIC_API_URL`, pointing at the Render service with no trailing `/api/v1`. The password is not configured here: the browser gets its token from the backend, and the login page asks the backend whether a password is needed at all.

## 4. Check it

```bash
curl https://<api>/api/v1/health
```

Every dependency should read `ok`: the dataset row count and its source, the number of Runs and the store behind them, the endpoint's status, and the AI backend. Anything degraded says why in the same line.

`GET /api/v1/health/warm` runs one real prediction and reports which path answered, `endpoint` or `fallback`. It needs a token, because on SageMaker it is a billable call.

## Before a demo

Follow [`docs/runbook.md`](docs/runbook.md): one token, one warm-up call run twice, the health line to read, a keep-alive loop for the session, what to do if the endpoint is cold on stage, and how to check spend.
