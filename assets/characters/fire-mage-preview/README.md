# Fire Mage P9 review candidate

Gemini Argon High supplied the initial Blender script. Codex revised the cast orb path, grounded the animation and adjusted the defeat pose. Geometry and materials are procedural. The script references no external media. The repository license applies to the source and generated asset.

Reproduce with Blender 4.5.15 from the repository root.

    blender -b -P assets/characters/fire-mage-preview/generate.py -- --output assets/characters/fire-mage-preview/fire-mage.glb

The GLB is 349872 bytes, SHA-256 1d1ad4d2b9843ff7e289997e68fb2349de2ddade24d1f252a480dad44fef28c6. It has 2,668 triangles in eight primitives, no textures, one skin and 11 joints. Clips are idle, move, attack, hit and defeat. Units are meters. Blender uses Z up and -Y forward. GLB uses Y up and +Z forward.

This directory is outside the public runtime bundle. The production portrait client, render cost on Intel UHD and Leader art review remain pending.
