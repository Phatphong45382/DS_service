---
status: accepted
---

# The inference endpoint runs in ap-southeast-1, not in the Thai region

Data for this demo enters AWS in **ap-southeast-7** (Thailand): the S3 bucket and the DynamoDB table are there, and that is where the sales history, Runs, uploads and documents live. The intention was to run the SageMaker endpoint there too.

Two things measured against account 272175291580 say otherwise.

**Serverless Inference does not exist in ap-southeast-7.** Creating the endpoint config returns `ValidationException: This region does not support the serverless endpoint`. Note that the error only appears once the referenced Model exists — a probe against a non-existent model name reports the missing model first, in every region, so this cannot be checked cheaply. The alternative inside Thailand is a real-time endpoint on a dedicated instance, which bills continuously and is the outcome ADR-0001 rejected on cost. Keeping the endpoint serverless and moving it one region away preserves the decision that matters for the $50 budget: idle costs nothing.

**The scikit-learn framework container is not published in ap-southeast-7 either.** Only the deep-learning containers are, and serving a 600 KB LightGBM model from a multi-gigabyte PyTorch image is the wrong trade for a demo whose cost is a cold start: an endpoint built that way was still in `Creating` after eight minutes. Once the endpoint had to move regions anyway, the small `sagemaker-scikit-learn:1.2-1-cpu-py3` container became available, and it is the shape this model needs — a pickled estimator plus a `code/` directory. LightGBM and SHAP install from `code/requirements.txt` at container start, which is not cached between cold starts, so a cold start sits at the long end of ADR-0001's 10–30 s and `GET /health/warm` exists to pay that cost before anyone is watching.

## Consequences

- The endpoint, its Model, its EndpointConfig and a small `*-models` bucket holding `model.tar.gz` are in **ap-southeast-1**; SageMaker will only read a model artifact from a bucket in the endpoint's own region. Everything else stays in Thailand.
- A forecast request therefore leaves Thailand. It carries Product, month and Promotion attributes — no customer names, no personal data. The same is already true of the AI features: Claude on Bedrock is reachable in this account only through `global.` and `apac.` inference profiles, so no Thailand-only inference path exists today for either model.
- `SAGEMAKER_REGION` is a single setting. When ap-southeast-7 gains Serverless Inference, point it back and re-run `scripts/aws_deploy.py endpoint`; nothing else changes.
- If the residency of inference turns out to be a legal requirement rather than a preference, the choice is a real-time endpoint in Thailand with its continuous cost, and ADR-0001 should be revisited.

## Considered options

- **Real-time endpoint in ap-southeast-7** — keeps everything in Thailand, but bills every hour it exists and reintroduces the "forgot to turn it off" risk that ADR-0001 exists to avoid.
- **Asynchronous Inference in ap-southeast-7** — also scales to zero, but answers by writing an S3 object the caller polls for, which does not fit a click-and-wait demo or the one-call `predict` seam.
- **Build a small custom container and push it to ECR in ap-southeast-7** — the fastest cold start and fully inside Thailand, but it needs a Docker build in the delivery pipeline and does not solve the serverless gap, which is the blocking one.
- **The PyTorch deep-learning container** — the only family published in ap-southeast-7, so it was the first attempt. It does not fix the serverless gap, and its image is roughly an order of magnitude larger than the model warrants, which lands squarely on the one cost ADR-0001 accepts.
