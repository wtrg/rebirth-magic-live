"""Sample exported Hỏa Hồ animation in Blender 4.5."""
import json
from pathlib import Path
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(Path(__file__).with_name("fire-fox.glb")))
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
    floors, poses = [], []
    for frame in range(round(strip.frame_start), round(strip.frame_end) + 1):
        scene.frame_set(frame)
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        points = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
        floors.append(min(point.z for point in points))
        poses.append(tuple(round(value, 4) for point in points for value in point))
    assert len(set(poses)) > 2, track.name
    assert max(abs(value) for value in floors) < .01, (track.name, min(floors), max(floors))
    results[track.name] = {"frames": len(poses), "uniquePoses": len(set(poses)),
                           "floorMin": min(floors), "floorMax": max(floors)}
assert set(results) == {"idle", "move", "attack"}
print(json.dumps(results, indent=2))
