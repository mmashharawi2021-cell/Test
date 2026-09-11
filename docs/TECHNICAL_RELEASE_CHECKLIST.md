# Technical release checklist

## Code correctness
- [ ] `python -m compileall api python tests`
- [ ] `pytest -q`
- [ ] Python formatter/linter passes (`ruff` recommended)
- [ ] TypeScript type-check passes with dependencies installed
- [ ] Web production build succeeds (`npm run build`)
- [ ] Docker Compose stack starts from an empty volume
- [ ] SQL migrations run twice only where intended and fail safely otherwise
- [ ] Database smoke tests pass
- [ ] API `/health` and `/ready` pass
- [ ] API spatial bbox test verifies exact `ST_Intersects` semantics
- [ ] ETL rejects missing CRS, invalid geometry and overlapping-zone duplicates
- [ ] Offline sync tests cover retry, idempotency, stale base version and conflict

## Reproducibility
- [ ] Python dependencies locked
- [ ] Node dependencies locked
- [ ] Container images pinned to supported versions (optionally digest-pinned for release tag)
- [ ] Book release tag recorded (`book-vX.Y.Z`)
- [ ] Dataset checksum recorded

## Standards
- [ ] GeoJSON output is WGS 84 longitude/latitude (RFC 7946)
- [ ] Metric area/distance examples do not compute planar meters directly in EPSG:4326
- [ ] OGC API claims are labelled correctly: "compliant" only after conformance testing
- [ ] OpenAPI document validates
- [ ] HTTP status codes and caching semantics follow HTTP standards

## Security
- [ ] No secrets committed
- [ ] CORS is explicit, not wildcard with credentials
- [ ] Parameterized SQL everywhere
- [ ] Authentication/authorization example is tested in the security chapter
- [ ] Rate/resource limits documented
- [ ] OWASP API Security Top 10 review completed

## Publishing
- [ ] Every code block in the book maps to a runnable file or is explicitly labelled pseudocode
- [ ] Every external code/image/data source has license/attribution recorded
- [ ] Repository LICENSE, dataset license and book copyright are distinct and clear
- [ ] References use a single citation style and stable identifiers where available
