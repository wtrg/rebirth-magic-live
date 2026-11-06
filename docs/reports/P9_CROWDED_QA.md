# P9 crowded portrait QA

Local-only QA branch based on 9963579. Candidate GLBs are from PR #58 at 113d301 and PR #59 at fd7519e. Run the build and then `node scripts/p9-crowded-qa.mjs`. The script starts an isolated MOCK server, joins eight synthetic players across six classes, and captures the production HUD at 1080 x 1920. It checks request isolation and forces each candidate GLB to fail separately. It writes screenshots to the ignored test-results directory.

The paired still shows recognizable ice spears at both ends of the formation. Fire Fox's glowing tail is visible on the left and right. The center fox is partially occluded by other actors. This check covers scene composition, loading and fallback. The QA hook places the fox mesh using the existing companion transform. It does not integrate the fox's clips or establish crowded motion readability or performance.
