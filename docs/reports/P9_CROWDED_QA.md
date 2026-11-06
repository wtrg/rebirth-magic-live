# P9 crowded portrait QA

Local-only QA branch based on 9963579. Candidate GLBs are from PR #58 at 113d301 and PR #59 at fd7519e. Run the build and then `node scripts/p9-crowded-qa.mjs`. The script starts an isolated MOCK server, joins eight synthetic players across six classes, and captures the production HUD at 1080 x 1920. It checks request isolation and forces each candidate GLB to fail separately. It writes screenshots to the ignored test-results directory.

The paired still shows recognizable ice spears at both ends of the formation. Fire Fox's glowing tail is visible on the left and right. The center fox is partially occluded by other actors. This check covers scene composition, loading and fallback. The QA hook uses the existing companion placement and plays the fox's skinned idle, movement and attack clips. The browser check issues a real MOCK attack from a fox owner, observes the attack clip start and confirms return to idle. It does not measure frame delivery or guarantee that every pet stays visible throughout a crowded raid.

## Intel UHD render sample

Run `node scripts/p9-crowded-qa.mjs --benchmark` after building. The harness samples draw-submitting animation callbacks for three seconds per foreground window during phase one, in default/pair/pair/default order. Fire Mage and Varkhazar remain enabled in all four windows. The eight-player roster and HUD are identical. No player commands are injected during the benchmark.

| Order | Candidates | Draw samples | Median draws | p95 gap | Largest gap |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Off | 89 | 248 | 33.5 ms | 33.5 ms |
| 2 | On | 90 | 205 | 33.5 ms | 33.6 ms |
| 3 | On | 90 | 206 | 33.5 ms | 49.8 ms |
| 4 | Off | 90 | 248 | 33.5 ms | 33.6 ms |

Chrome used Intel UHD through ANGLE D3D11. These samples measure draw submission, not presentation FPS, GPU memory or long-session combat load.
