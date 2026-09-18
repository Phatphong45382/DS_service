---
status: accepted
---

# Serve the forecast model on a SageMaker Serverless Inference endpoint, not a real-time instance

The forecast model is called only when a person clicks in the web app — a handful of times per demo, nothing in between — and the project runs on a fixed AWS credit with a $50 budget. A real-time endpoint bills every hour it exists (roughly $45–100/month for the smallest useful instances) and is the one resource in this stack that keeps costing money when forgotten. Serverless Inference bills per invocation and scales to zero, so an idle endpoint costs nothing and there is nothing to remember to switch off.

The price is a cold start of roughly 10–30 seconds after the endpoint has been idle. We accept it: before a demo the endpoint is woken with one warm-up call, a keep-alive ping runs during the demo, and the API falls back to the same model loaded in-process if the endpoint does not answer in time.

## Considered options

- **Real-time endpoint** — instant responses, but bills continuously; rejected on cost and "forgot to turn it off" risk.
- **SageMaker Processing / Batch Transform job per Run** — a real job row in the console, but 2–4 minutes of instance provisioning per click; rejected because nobody inspects the console and the wait is unacceptable in a live demo.
- **No SageMaker at all (model in the API process)** — cheapest and fastest, but the demo's purpose is to show the model served on AWS; kept only as the fallback path.
