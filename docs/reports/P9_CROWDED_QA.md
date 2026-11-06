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

## MOCK readability revision

The Fire Fox preview is 12% larger and its offset is closer to the camera.
The Ice Mage preview is 14% wider and 8% taller, with lighter blue cloth.
The phone capture shows a clearer Ice Mage torso and orange fox silhouettes.
Small facial and paw details remain difficult to distinguish when actors overlap.

The paired preview now checks the server mode before requesting either
candidate. Both viewport runs passed eight-player HUD, owner attack animation,
independent GLB 404 fallback, default request isolation and a mocked LIVE
health response that suppresses both candidate requests.

[Revised portrait](evidence/p9-crowded-readability.png) ·
[Revised phone attack](evidence/p9-crowded-readability-phone.png)

### Exact revision performance rerun

Runtime and harness both used the clean checkout
`16c3173738f26b1a8c7e47de0eecfe488e978040`. The commands were
`node scripts/p9-crowded-qa.mjs --benchmark` and the same command with
`--phone`. Each ran the eight-player default/paired/paired/default sequence
on Chrome ANGLE Intel UHD D3D11.

- 1080×1920 median draws in run order were 248, 205, 205 and 249.
  Largest gaps were 33.6, 49.3, 49.5 and 49.5 ms.
- 540×960 median draws were 248, 205, 205 and 248.
  Largest gaps were 33.5, 33.6, 50.1 and 49.9 ms.
- The p95 draw-submission gap was 33.5 ms in every sample.

These are three-second CPU draw-submission samples. Presentation FPS and
long-session behavior are outside this measurement.

### Staggered eight-fox formation and animation QA

The foxes now alternate between two camera-side depths without changing the
reviewed model scale. At 540×960 the foreground foxes are easier to separate
from the player torsos. The arena crystals and adjacent actors still obscure
parts of a few foxes. The boss and the player damage label remain readable in
the sampled attack frame.

Run the browser harness at both sizes with `--all-fox` to reproduce the
eight-companion case. QA-only events verify that the named mixer actions
actually advance. Real MOCK attacks verified Idle → Run → Attack → Idle on
Ice Mage and Fire Fox, and Idle → Attack → Idle on Fire Mage. Both sizes also
passed the original mixed-roster run with independent 404 fallback.

[Eight foxes, 1080×1920](evidence/p9-eight-foxes.png) ·
[Attack, 540×960](evidence/p9-eight-foxes-attack-phone.png)

### Staggered-formation revision benchmark

The same default/paired/paired/default method ran on clean runtime and harness
`6059d3c3328c1e9fe9739b6da6950d80757dc1eb` with the original mixed-pet roster.
The paired median draw counts were 205/205 at 1080×1920 and 205/206 at
540×960. All p95 gaps were 33.4–33.5 ms. The largest paired gap was 49.5 ms
at 1080×1920 and 33.6 ms at 540×960.

The first phone run also recorded a 1,000.1 ms gap in the last default window
with 46 samples. A repeat without other UI interaction had 89–91 samples per
window and a largest gap of 49.5 ms. The cause of the first gap was not
isolated. Both runs are retained. These are CPU draw-submission samples.

[1080×1920](evidence/p9-benchmark-6059d3c-portrait.jsonl) ·
[540×960 first run](evidence/p9-benchmark-6059d3c-phone.jsonl) ·
[540×960 repeat](evidence/p9-benchmark-6059d3c-phone-repeat.jsonl)
