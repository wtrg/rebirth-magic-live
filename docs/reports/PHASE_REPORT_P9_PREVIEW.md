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
