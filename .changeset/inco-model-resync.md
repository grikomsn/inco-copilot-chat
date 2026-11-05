---
"inco-copilot-chat": patch
---

Refresh the bundled public Inco model catalog snapshot. The live `/v1/models` payload now reports reasoning modes and efforts in a structured `supported`/`default` shape; the reader ignores the block and per-route profiles cover every id, so runtime behavior is unchanged (compiled output verified identical).
