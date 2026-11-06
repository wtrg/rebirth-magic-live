# Eight-hour local OBS endurance and recovery

On Windows, portable OBS 33.0.1 recorded a clean build from commit 28d76a8 with the Fire Mage and Varkhazar P9 previews enabled. The workload ran for 28,800.471 seconds in MOCK and the recording lasted 28,805.900 seconds. The standard analyzer verified H.264 at 1080 × 1920 and 30 FPS, and stereo AAC at 48 kHz. OBS counted 44 render skips and 44 output skips during the measured workload, with 864,015 output frames. All 481 decoded mono windows contained signal and no samples clipped.

The 32 synthetic players generated 1,714,327 accepted and 442 throttled events, with 17,814 victories observed and restarted. The sampled queue peak was 33. SQLite integrity passed. Backup and restore preserved all 32 profile records and stage 17,815. A separate MOCK process reopened the restored database at that stage and verified level, XP, wins, score, pet, auto preference and class for every rejoined identity.

Hourly median server RSS in MiB was 107.8, 127.1, 127.8, 180.1, 180.7, 181.2, 181.1 and 181.3. Median JS heap over the last four hours ranged from 38.0 to 39.3 MiB. These samples describe process memory under this workload. Browser subprocess and GPU allocation were outside the measurement.

[One-hour precursor](https://github.com/wtrg/rebirth-magic-live/pull/49#issuecomment-6666850905) · [Eight-hour recording](https://github.com/wtrg/rebirth-magic-live/pull/50#issuecomment-6675868136) · [Recovery checks](https://github.com/wtrg/rebirth-magic-live/pull/50#issuecomment-6675883289)

Reproduce with the [isolated OBS runbook](../OBS_QA.md). This run covers the referenced P9 build and local 8-hour recording. Actual TikTok LIVE, 12-hour endurance and presentation FPS remain unverified. SQLite and recordings remain local.
