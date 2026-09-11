import assert from "node:assert/strict";
import test from "node:test";
import { createDemoForecastResult, getDemoInputData } from "./demo-data.ts";

test("demo input has enough complete history for the prediction flow", () => {
  const data = getDemoInputData();

  assert.equal(data.summary.rowCount, 120);
  assert.equal(data.summary.emptyCells, 0);
  for (const header of ["customer", "destination", "year", "month", "product", "flavor", "size", "quantity"]) {
    assert.ok(data.headers.includes(header), `missing required header: ${header}`);
  }
});

test("demo forecast result contains chartable actual and forecast months", () => {
  const result = createDemoForecastResult();

  assert.equal(result.filename, "demo_sales_history.csv");
  assert.equal(result.rows.length, 30);
  assert.ok(result.rows.some((row) => row.sales && !row.forecast));
  assert.ok(result.rows.some((row) => row.forecast && !row.sales));
});
