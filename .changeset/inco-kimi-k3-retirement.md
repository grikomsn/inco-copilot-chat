---
"inco-copilot-chat": patch
---

Retire Kimi K3 and adopt Kimi K3.1 Pro (Fast). Inco removed `kimi-k3:fast` from the catalog and `kimi-k3` refuses requests with a 404 `model_not_found` error from 2026-11-06; requests now offer `kimi-k3.1-pro:fast`, live-probed to accept all seven reasoning-effort values with a working `none` Off switch and structured function calls. The bundled public catalog snapshot was refreshed, routing classification re-verified against the Inco model directory, and `docs/models.md` updated with the 2026-11-06 probe results.
