## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Credit Limit Module Rules
Before making any changes to Credit Limit (`/credit-limit/data`, `/credit-limit/approval`, or `/api/po/credit-limit`), ALWAYS read and strictly follow the invariants in `src/app/credit-limit/RULES.md`.
- Never allow a batch with APPROVED or APPROVED_DIREKSI POs to accept newly submitted POs.
- Never allow closing a batch with < 50 POs unless all POs are APPROVED_DIREKSI.
- Never retain rejected POs in batches (they must have creditLimitBatchId: null and return to Data page).
- Never allow Direksi approval without Nota Dinas (noNd).
- Terminal status APPROVED_DIREKSI is immutable.
- Build & Lint Protocol: Always apply surgical fixes only on build/lint errors; NEVER rewrite unaffected logic or delete existing validations/handlers.

