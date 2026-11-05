# P9 paired art preview for Leader review

The built Windows MOCK client rendered the skinned Varkhazar and eight skinned Fire Mages together at 1080 × 1920 using Intel UHD through Chrome ANGLE D3D11. Build and start the branch, then open `/?overlay&fire-preview=1&boss-preview=1`.

[Portrait capture](evidence/p9-paired-portrait.png)

The preview combines Fire Mage source and integration (#44, #45) with Varkhazar source and integration (#46, #47). Each asset loads independently. Forced 404s verified the Fire Mage-only fallback, Varkhazar-only fallback and procedural rendering when all three GLBs are missing. The default overlay requested neither preview asset.

| Mode | Median draw calls | p95 interval between draw submissions |
| --- | ---: | ---: |
| Existing GLB baseline | 218 | 33.5 ms |
| Both skinned previews | 130 | 33.8 ms |
| Fire Mage asset missing | 202 | 33.6 ms |
| Varkhazar asset missing | 146 | 49.7 ms |
| All GLBs missing | 218 | 49.1 ms |

Each observation lasted roughly three seconds with eight synthetic Fire Mages at low quality. These figures do not measure presentation FPS, long-duration stability or GPU memory.

Typecheck, lint, 36 tests, build, Fire Mage animation QA and boss timing QA passed. Leader art review is pending. Review the pair's scale, silhouette, attack readability and fit with the arena before extending this treatment to the other classes and pets. LIVE remains unverified.

## Telegraph evidence at phone scale

The built 540 × 960 Windows MOCK overlay used both preview assets and eight synthetic players. The capture script read the server WebSocket deadline and verified the boss impact timestamp after the deadline. These stills span successive attack cycles in the same raid. Times are the browser screenshot call windows relative to the corresponding server deadline.

| Pose | Capture window | Evidence |
| --- | ---: | --- |
| Idle | −1295 to −813 ms | [Idle](evidence/p9-motion-idle.png) |
| Windup | −484 to −241 ms | [Windup](evidence/p9-motion-windup.png) |
| Charged | −189 to −49 ms | [Charged](evidence/p9-motion-charged.png) |
| Impact | +188 to +342 ms | [Impact](evidence/p9-motion-impact.png) |
| Recovery | +657 to +790 ms | [Recovery](evidence/p9-motion-recovery.png) |

The pre-impact cue is visible as a change in weapon and torso pose. The impact adds the CHẤN ĐỘNG label, ground ring and visible player recoil. These stills document the phases and relative server timing. They do not show continuous motion or measure how reliably viewers recognize the cue.
