# Varkhazar P9 review candidate

Codex authored this procedural concept using the RE:BIRTH Art Bible. The script uses no external media. The repository license applies to the source and generated asset.

Reproduce with Blender 4.5.15 from the repository root.

    blender -b -P assets/bosses/varkhazar-preview/generate.py -- --output assets/bosses/varkhazar-preview/varkhazar.glb

The GLB is 128692 bytes, SHA-256 d1a9cd6a2c77c54d64c9f08f99527f29be3a77a0492ca536c15214240d767e23. It has 616 triangles, four primitives, no textures and one skin with seven joints. Blender uses meters, Z up and -Y forward. The GLB uses Y up and +Z forward.

The six clips are idle, move, telegraph, attack, hit and defeat. Telegraph ends in the attack's starting pose. The 0.833 s telegraph is an asset duration. Runtime alignment with server events and phase-specific presentation require integration and review.

This preview is staged outside the runtime bundle.
