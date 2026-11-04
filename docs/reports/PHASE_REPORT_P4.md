# P4 · Pet collection and upgrades

Date 2026-11-05. Status verified in MOCK. Leader review pending.

Three pets are unlocked from ranked raid shards. Extra shards upgrade owned companions to level 5. Each pet has an individual skill triggered by skill II. Upgrades and summon state persist in player profiles, and the browser supports selection, levels, and shard balance. Procedural meshes have distinct silhouettes, paw or wing motion, and a lunge tied to attacks.

QA on Windows passed typecheck, lint, build, 11 tests and the browser smoke. Combat tests verify shard spending, skill effects, SQLite reload and old replay rules. The browser selected Hỏa Hồ, captured it in the portrait scene and confirmed it after restoring the save. See [the render](evidence/portrait-pet.png).

The render captures Hỏa Hồ in one pose. All three skill effects were verified in simulation. The animation and appearance are prototype assets. Gemini and Antigravity reports NOT_RECEIVED. Leader review remains open.
