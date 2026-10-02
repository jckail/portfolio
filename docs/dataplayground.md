# Data Playground integration

`/dataplayground` is a lazy React page with its own indexable document, canonical URL,
and sitemap entry. Its default experience is an offline-generated synthetic dataset.
The homepage does not import the lab's chart/table code or catalog.

## Dataset ownership and refresh

The independent engine is in [jckail/data_playground](https://github.com/jckail/data_playground),
package `playground`, engine version `1.0.0`. From a checkout of that repository:

```bash
python -m playground export --output /path/to/portfolio/backend/app/data/dataplayground.json
```

Commit the generated artifact with the engine change when refreshing it. Never edit
its numbers manually. The portfolio validates it through `LabCatalog`; unknown schema
versions and invalid values fail validation. Current scenarios are baseline,
acquisition, stronger retention, and a data-quality incident. Duplicate/bad-record
injection changes quality counts but leaves the valid business stream unchanged.

Metrics are derived by SQLite over validated events. Amounts are integer USD cents;
collected revenue is not MRR. Cohorts group customers by first-payment date and measure
retention at weekly ages. Null cells have not yet been observed. Event and quarantine
views are samples, not complete datasets; counts describe the full run.

## Optional custom runs

Start the separate Python service with its `requirements-lab.txt` environment:

```bash
uvicorn playground.api:app --host 127.0.0.1 --port 8010 --workers 1
```

Configure the portfolio backend with `DATAPLAYGROUND_API_URL=http://127.0.0.1:8010`.
Use an HTTPS origin for a hosted service, with no credentials, path, query, or fragment.
This setting belongs to the existing frozen Settings object. The browser always calls
the same-origin adapter; it never chooses an upstream URL.

`GET /api/dataplayground` returns the catalog and whether custom runs are configured.
`POST /api/dataplayground/simulate` validates a maximum 4 KB JSON body, caps simulation
parameters, and admits two concurrent upstream requests per instance. Its existing
rate limiter admits six requests/minute per client and thirty/minute per instance.
Upstream calls have a 20-second wall-clock ceiling, refuse redirects, cap decoded
responses at 2 MB, and validate the returned configuration and result contract.
Failures preserve the current UI result and do not masquerade as saved runs.

Leaving the setting empty is supported: all four saved runs, comparisons, quality
reports, event exploration, and SQL lineage still work. The page explains that custom
runs can be performed locally. No simulation service is automatically provisioned.

## Validation and release

Run normal frontend lint, type-check, tests, coverage, and build; run backend Ruff and
pytest. `backend/tests/test_dataplayground.py` checks the generated artifact and proxy
boundaries, with fake upstream responses. SPA/discovery tests cover direct navigation,
canonical metadata, ETags, no-JavaScript content, and sitemap inclusion.

The portfolio refresh is integrated into `main`; review this feature against `main`.
Do not copy these changes onto the older audit checkout.
Production release uses `.github/workflows/deploy.yml` after integration into `main`.
Never use `helpers/deploy.sh` or a laptop deploy command.

## Graph and vector dataset

The catalog also includes an independent, seeded commerce dataset under the optional
`exploration` field. It is separate from the lifecycle scenarios: switching a scenario
or running custom lifecycle parameters does not regenerate these products or purchases.
The same export command regenerates both datasets.

The exploration contains 48 products across six categories, 32 synthetic customers,
and 160 purchase rows. Graph nodes represent customers, products, and categories.
Customer-to-product edges aggregate purchased quantities; product-to-category edges
represent category membership. The graph view shows a bounded one-hop neighborhood,
with the relationship table providing the complete selected neighborhood.

Each product carries an eight-dimensional, nonnegative unit vector. The six category
features plus portability and premium positioning are deliberately handcrafted.
They are not language-model embeddings. The browser ranks other products by cosine
similarity, excludes the selected product, and breaks ties by product ID. Feature
contributions explain the score; similarity is not a probability or a learned
recommendation. No graph database, vector database, external API, or paid service is
required for this small reproducible example.

Backend validation checks IDs, references, vector dimensions and normalization, and
graph consistency before serving the artifact. Frontend and browser tests cover
selection, product search, graph neighborhoods, similarity rankings, and mobile layout.
