---
"inco-copilot-chat": patch
---

Cap the honored Retry-After delay at 5 seconds, matching the family's bounded backoff, so a long server-provided delay can no longer stall a request.
