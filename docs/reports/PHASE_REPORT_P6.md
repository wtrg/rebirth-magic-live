# P6 · Combat feedback

Date 2026-11-05. Status partial. Leader review pending.

The 3D client displays a short boss introduction, element-colored attack rings and pooled geometry for skill, ultimate and gift sparks. Low quality uses six spark instances and high quality uses twelve. The HUD respects reduced motion for its DOM animations. Combat cues are synthesized locally with Web Audio and muted by default. Replay version 4 records typed feedback while keeping the preceding replay versions readable.

Windows typecheck, lint, build, 11 tests and Chrome smoke passed. The smoke confirms the boss intro, an oscillator created after operator opt-in, a typed gift reaction and deterministic replay. OBS audio routing and combined render load with the new effects are unverified. Production character assets, broader animation polish and Leader review are still open. See [OBS audio setup](../OBS_SETUP.md).
