# Demo runbook

What to do in the fifteen minutes before a demo, what to watch during it, and what to do when something is slow. Everything here is one command or one click.

Replace `<api>` with the Render URL and `<password>` with the demo password.

## Ten minutes before

**1. Get a token.** Every call below needs it, and it is how you find out the password is set.

```bash
TOKEN=$(curl -s -X POST https://<api>/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"password":"<password>"}' \
  | python -c "import json,sys; print(json.load(sys.stdin)['data']['token'])")
```

If this prints an error instead of a token, Render is still asleep (wait a minute and retry) or the password on Render is not what you typed.

**2. Wake everything with one call, twice.**

```bash
curl -s https://<api>/api/v1/health/warm -H "Authorization: Bearer $TOKEN"
```

The first call wakes Render if it was asleep, then wakes the model endpoint, and takes up to a minute. Run it again: the second should answer in well under two seconds and say `"served_by": "endpoint"`. That is the state you want on stage.

| second call says | meaning | do |
|---|---|---|
| `served_by: endpoint`, under 2 s | ready | nothing |
| `served_by: fallback` | the endpoint did not answer in 25 s; the in-process model did | run once more; if it stays on fallback, see *If the endpoint is cold on stage* |
| an error | the API itself is down | check Render's dashboard and the deploy log |

**3. Read the health line.**

```bash
curl -s https://<api>/api/v1/health | python -m json.tool
```

Four dependencies, each with a status and a latency:

| name | should say | if not |
|---|---|---|
| `data` | `10,368 rows from s3` | the bucket or the key is wrong; the app will not start the demo pages |
| `store` | `N Runs in aws store` | DynamoDB is unreachable or the table name is wrong |
| `model` | `endpoint demand-demo-forecast is InService (endpoint)` | `Creating`/`Updating` means it is being redeployed; `error` means it does not exist; `(fallback)` means it exists but the last prediction did not come from it |
| `ai` | the model tier and `bedrock` | `degraded` with `no API key` means `AI_BACKEND` or its key is missing; the six AI pages will show an error on use |

`status: degraded` at the top means at least one line above is not `ok`. Read the line, not the summary.

**4. Open the app in a fresh browser window** and log in. Click Forecast, then Runs. Both should show a Run. If Runs is empty, create one from New Prediction now rather than on stage.

## During the demo

Render's free plan sleeps after fifteen idle minutes and the endpoint scales to zero after a quiet spell. One line keeps both awake; run it in a spare terminal and leave it:

```bash
while true; do curl -s -o /dev/null https://<api>/api/v1/health/warm -H "Authorization: Bearer $TOKEN"; sleep 600; done
```

Stop it with Ctrl-C when you are done. It costs one prediction every ten minutes, a fraction of a cent.

**Switching the AI tier.** Every AI page has a tier picker at the top: Fast, Balanced, Advanced. Pick one and the next request uses it; nothing to restart. From a terminal:

```bash
curl -s https://<api>/api/v1/ai/model -H "Authorization: Bearer $TOKEN"      # what is available and current
curl -s -X POST https://<api>/api/v1/ai/model -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"current":"<id from the list>"}'
```

## If the endpoint is cold on stage

Nothing breaks. A cold endpoint takes about twelve seconds to answer; the API waits up to twenty-five, and if the endpoint has not answered by then the same model answers in-process with the same numbers. The person watching sees one slow click, not an error.

What you will notice: the first Run or Planner prediction takes ten to twenty seconds instead of one. Say "the model is waking up" and it will not happen again for the rest of the session. If it keeps happening, the keep-alive above is not running.

If a Run or a prediction returns an error rather than a slow answer, open `/health`: the `model` line will say which of the two paths failed and why.

## Checking spend

```bash
python scripts/aws_cost.py
```

It prints this month's cost for the whole account by service, and separately the cost carrying the `Project=demand-demo` tag. The tagged figure reads zero until the payer account activates the cost-allocation tag; until then, the services the demo uses are marked in the list, and anything else in the account is someone else's.

The $50 budget in AWS Budgets (`demand-demo`) emails at 50, 75 and 90 percent and cuts model invocation at 90. It, too, only sees spend once the tag is active.

## After the demo

Nothing to switch off. The endpoint scales to zero on its own, Render sleeps on its own, and the stores cost nothing while idle. Stop the keep-alive loop and close the terminal.
