# Demand Forecasting

A demand-forecasting platform for a packaged-snack business: it tracks sales, measures forecast accuracy against plan, and simulates promotion scenarios.

## Language

### Product catalog

**Product**:
A sellable item, identified by the triple Product Group × Flavor × Size. There is no other product identity.
_Avoid_: SKU (as a key), item, material

**Product Group**:
The top-level category a Product belongs to (e.g. Chips, Crackers, Rice Crackers).
_Avoid_: category, product type

**Flavor**:
The taste variant within a Product Group (e.g. BBQ, Sour Cream).

**Size**:
The pack size of a Product, expressed in grams (e.g. 30g, 75g).
_Avoid_: pack, variant, ml

**SKU**:
A display label composed from a Product's Flavor and Size (e.g. "BBQ 30g"). Used only for presentation; never as an identifier.
_Avoid_: using SKU as a lookup key or a data column

### Parties and places

**Customer**:
A retail chain that buys Products (e.g. FreshMart, MegaStore). The party Actual and Plan are recorded against.
_Avoid_: client, account, retailer, channel

**Site**:
A distribution centre a Customer's orders ship to (e.g. DC Central 1). A Customer has one or more Sites.
_Avoid_: location, ship-to, DC (in prose)

### Promotions

**Promotion**:
A Mechanic applied to a Product for one month, across every Customer and Site, with its Discount and Promo Days. A month with no Promotion has Mechanic "No Promotion", zero Discount and zero Promo Days.
_Avoid_: per-Customer or per-Site promotions (the model and the Scenario Planner see a Promotion at Product-month grain)
_Avoid_: promo (in prose), campaign, deal

**Mechanic**:
The kind of Promotion: Weekly Deal, B2B Program, Loyalty Points, or No Promotion. One closed list shared by every screen and the model.
_Avoid_: MechGroup, promo type, promo_type, mechanism

**Discount**:
The percentage price reduction of a Promotion, from 0 to 100.
_Avoid_: discount_pct (in prose), price cut

**Promo Days**:
How many days of the month a Promotion was active.
_Avoid_: duration, promotion_dt

### Quantities

**Actual**:
The quantity of a Product actually sold to a Customer in a month.
_Avoid_: sales, quantity (unqualified)

**Plan**:
The quantity the business committed to sell, set by people before the month began. Independent of any model.
_Avoid_: target, forecast, planned forecast

**Forecast**:
The quantity a model predicts will be sold. Produced by a Run; never entered by people.
_Avoid_: plan, prediction (when meaning the series), estimate

### Accuracy

**Plan Accuracy**:
How close Plan was to Actual. What the Deep Dive measures.
_Avoid_: forecast accuracy (when comparing to Plan)

**Forecast Accuracy**:
How close a Run's Forecast was to Actual. What the Forecast and Runs pages measure.

**WAPE**:
Weighted absolute percentage error: the sum of absolute errors divided by the sum of Actuals, over a set of Products and months.
_Avoid_: MAPE, accuracy %

**Bias**:
The signed tendency of a Plan or Forecast to be above or below Actual, as a percentage of Actual. Negative means under-planning or under-forecasting.

### Forecasting

**Run**:
One on-demand execution of the forecast model over the sales history, started by a user from the web, producing a Forecast for every Product over a Horizon plus that Forecast's accuracy on recent months.
_Avoid_: job, scenario, prediction run, batch

**Horizon**:
How many months ahead a Run forecasts (1, 3 or 6).
_Avoid_: period, window, range
