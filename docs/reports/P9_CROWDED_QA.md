# P9 crowded portrait QA

QA branch based on 9963579. Candidate GLBs are from PR #58 at 113d301 and PR #59 at fd7519e. Run the build and then `node scripts/p9-crowded-qa.mjs`. The script starts an isolated MOCK server, joins eight synthetic players across six classes, and captures the production HUD at 1080 x 1920. It checks request isolation and forces each candidate GLB to fail separately. It writes screenshots to the ignored test-results directory.

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

[Eight-player portrait](evidence/p9-crowded-paired.png) · [Fire Fox attack sample](evidence/p9-crowded-fox-attack.png)

The draft is a reproducible QA branch for review. The candidate assets still require a production integration decision.

[Forward placement trial](evidence/p9-crowded-fox-forward.png) shifts the candidate fox 0.7 scene units toward the camera in its owner's local frame. The center fox's torso and tail are easier to distinguish in this formation. The original image and render measurements above document the earlier placement.

[5.48-second crowded combat recording](evidence/p9-crowded-playback.mp4) shows the full HUD, staggered skill inputs from eight synthetic players, and the boss warning and impact at 1080 x 1920. Use `node scripts/p9-crowded-qa.mjs --record` to reproduce the silent browser capture. The center fox is visible below its owner in several sampled frames, although nearby models and effects still overlap parts of the group. This is a brief readability sample.

The `--phone` option runs the same loading, fallback and owner-attack checks in a native 540 x 960 viewport. The ice spears and orange fox tails still distinguish the candidates, but the fox's paws and faces are difficult to read at this size. The HUD retains its boss HP, roster count and combat log.

[Phone-size raid](evidence/p9-crowded-paired-phone.png) · [Phone-size attack](evidence/p9-crowded-fox-attack-phone.png)
