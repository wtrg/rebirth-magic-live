"""Sample exported Băng Pháp Sư animation in Blender 4.5."""
import json
from pathlib import Path
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(__file__).with_name("ice-mage.glb")))
scene = bpy.context.scene
rig = next(obj for obj in scene.objects if obj.type == "ARMATURE")
mesh = next(obj for obj in scene.objects if obj.type == "MESH")
tracks = rig.animation_data.nla_tracks
rig.animation_data.action = None
results = {}
for track in tracks:
    for other in tracks:
        other.mute = other != track
    strip = track.strips[0]
    floors, poses, supports = [], [], set()
    for frame in range(round(strip.frame_start), round(strip.frame_end) + 1):
        scene.frame_set(frame)
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        points = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
        lowest = min(range(len(points)), key=lambda index: points[index].z)
        floors.append(points[lowest].z)
        supports.add(mesh.vertex_groups[mesh.data.vertices[lowest].groups[0].group].name)
        poses.append(tuple(round(value, 4) for point in points for value in point))
    assert len(set(poses)) > 2, track.name
    assert max(abs(value) for value in floors) < .01, (track.name, min(floors), max(floors))
    if track.name != "defeat":
        assert supports <= {"LegL", "LegR"}, (track.name, supports)
    results[track.name] = {"frames": len(poses), "uniquePoses": len(set(poses)),
                           "supports": sorted(supports), "floorMin": min(floors), "floorMax": max(floors)}
assert set(results) == {"idle", "move", "attack", "hit", "defeat"}
print(json.dumps(results, indent=2))
