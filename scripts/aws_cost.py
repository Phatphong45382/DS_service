"""This month's AWS spend: the whole account by service, and the slice that carries the demo's tag.

    python scripts/aws_cost.py

The tagged figure stays at zero until the payer account activates the `Project` cost-allocation
tag (see DEPLOYMENT.md). Until then the services the demo uses are marked, and the rest of the
list is other work in the same account. Cost Explorer lags real usage by about a day.
"""
import datetime as dt
import sys

import boto3
from botocore.exceptions import ClientError

DEMO_SERVICES = {"Amazon SageMaker", "Amazon Simple Storage Service", "Amazon DynamoDB", "Amazon Bedrock", "AWS Budgets"}

ce = boto3.client("ce", region_name="us-east-1")  # Cost Explorer lives in us-east-1 for every account
today = dt.date.today()
period = {"Start": today.replace(day=1).isoformat(), "End": (today + dt.timedelta(days=1)).isoformat()}


def cost(**extra):
    r = ce.get_cost_and_usage(TimePeriod=period, Granularity="MONTHLY", Metrics=["UnblendedCost"], **extra)
    return r["ResultsByTime"][0]


try:
    by_service = cost(GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}])
except ClientError as e:
    sys.exit(f"Cost Explorer refused: {e.response['Error']['Code']} - {e.response['Error']['Message'][:200]}")

rows = sorted(((g["Keys"][0], float(g["Metrics"]["UnblendedCost"]["Amount"])) for g in by_service["Groups"]),
              key=lambda r: -r[1])
rows = [(n, a) for n, a in rows if a >= 0.005]
print(f"account spend {period['Start']} to {today}: ${sum(a for _, a in rows):,.2f}")
for name, amount in rows:
    print(f"  {amount:>9,.2f}  {name}{'   <- a service the demo uses; the amount may be other work' if name in DEMO_SERVICES else ''}")
if not rows:
    print("  nothing billed yet this month")

try:
    tagged = float(cost(Filter={"Tags": {"Key": "Project", "Values": ["demand-demo"]}})["Total"]["UnblendedCost"]["Amount"])
    print(f"\ntagged Project=demand-demo: ${tagged:,.2f}")
    if tagged == 0:
        print("  zero means billing cannot see the tag yet: the payer account has to activate it")
except ClientError as e:
    print(f"\ntag filter refused: {e.response['Error']['Code']}")
