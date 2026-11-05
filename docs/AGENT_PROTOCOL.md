# Agent Protocol

Task states BACKLOG → READY → IN_PROGRESS → REVIEW → TEST → ACCEPTED. Exceptions BLOCKED, FAILED, NEEDS_FIX, CANCELLED. Use a task branch and declare file ownership before edits. Return artifact paths, test commands, output, SHA, and limitations. Codex verifies evidence before accepting. Source may be published after security checks.

The [task ledger](TASK_LEDGER.md) records the ten required fields for integrated work and open tasks, with actual merge SHAs, changed-file ownership, QA evidence and current external dependencies. The original requests below map to that ledger: RB-001/RB-005 → RB-PR-1 and later scoped QA; RB-002 → RB-GEMINI (pending) and Codex's separate RB-ART-SPEC; RB-003 → RB-PR-1 fallback implementation (Antigravity report NOT_RECEIVED); RB-004 → the received read-only Qoder proposal in P0 and Codex integration in RB-PR-1. Requested ownership is not a claim of delivery.

| Task | Requested owner | Ownership | Acceptance |
| --- | --- | --- | --- |
| RB-001 | Codex | docs, QA and repo | Setup and gates executable |
| RB-002 | Gemini Argon Web High | Future assets and Art Bible review | Original meshes or Blender generation script, manifest, animation and portrait spec |
| RB-003 | Antigravity | Scene integration on a separate branch | Arena, character and boss render, build and screenshot evidence |
| RB-004 | Qoder Qwen Flash | Independent combat proposal | Damage and phase boundaries with tests |
| RB-005 | Codex | Working vertical slice | Play a raid from local chat and record browser evidence |

Bridge failure leaves handoffs in this file. Use an issue or branch handoff when the destination becomes reachable. ChatGPT Leader review is tracked in LEADER_REVIEW_REQUEST.md. A published report does not establish receipt.
