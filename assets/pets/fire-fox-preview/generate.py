"""Codex P9 Fire Fox concept, Blender 4.5. Export via -- --output PATH."""
from pathlib import Path
from math import radians
import argparse
import sys
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 24

def material(name, color, metal=0, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = .58
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = emission
    return mat

fur = material('Copper fur', (.52,.14,.035))
dark = material('Dark paws', (.068,.028,.035))
cream = material('Warm cream', (.92,.61,.31))
ember = material('Ember core', (1,.29,.035), emission=1.35)
parts = []
def part(name, bone, shape, point, scale, mat, angle=(0,0,0)):
    if shape == 'gem':
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=point)
    elif shape == 'cone':
        bpy.ops.mesh.primitive_cone_add(vertices=6,radius1=1,radius2=.12,depth=2,location=point)
    else:
        bpy.ops.mesh.primitive_cube_add(size=2,location=point)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler = tuple(map(radians,angle))
    obj.data.materials.append(mat)
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    parts.append(obj)

part('Body','Root','gem',(0,.05,.35),(.19,.34,.19),fur)
part('Chest ruff','Head','gem',(0,-.19,.38),(.17,.19,.22),cream)
part('Head','Head','gem',(0,-.31,.53),(.17,.18,.15),fur)
part('Muzzle','Head','gem',(0,-.47,.49),(.11,.12,.066),cream)
part('Nose','Head','gem',(0,-.57,.505),(.042,.028,.027),dark)
part('Tail base','Tail','gem',(0,.36,.42),(.082,.21,.098),fur,(-22,0,0))
part('Tail plume','Tail','gem',(0,.53,.57),(.118,.132,.25),fur,(-35,0,0))
part('Flame tip','Tail','gem',(0,.63,.75),(.076,.089,.145),ember,(-32,0,0))
legs = []
for side, sign in (('L',1),('R',-1)):
    part('Ear '+side,'Head','cone',(sign*.108,-.302,.70),(.061,.055,.127),fur,(0,sign*17,0))
    part('Eye '+side,'Head','gem',(sign*.096,-.442,.554),(.027,.019,.022),ember)
    for row, y in (('Front',-.19),('Rear',.245)):
        bone = row + side
        x = sign*.116
        legs.append((bone,(x,y,.325),'Root'))
        part(bone+' leg',bone,'gem',(x,y,.188),(.054,.065,.145),fur)
        part(bone+' paw',bone,'gem',(x,y-.025,.054),(.061,.08,.054),dark)
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = 'FireFox_Mesh'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

rig = bpy.data.objects.new('FireFox_Rig',bpy.data.armatures.new('FireFox'))
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, point, parent in [
    ('Root',(0,0,0),None), ('Head',(0,-.23,.43),'Root'),
    ('Tail',(0,.26,.35),'Root'), *legs,
]:
    bone = rig.data.edit_bones.new(name)
    bone.head = point
    bone.tail = Vector(point)+Vector((0,0,.2))
    if parent:
        bone.parent = rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
mesh.parent = rig
mesh.modifiers.new('Skin','ARMATURE').object = rig

animation = rig.animation_data_create()
def clip(name, poses):
    action = bpy.data.actions.new(name)
    animation.action = action
    for frame, rotations in poses:
        for bone in rig.pose.bones:
            bone.rotation_mode = 'XYZ'
            bone.rotation_euler = tuple(map(radians,rotations.get(bone.name,(0,0,0))))
            bone.keyframe_insert(data_path='rotation_euler',frame=frame)
    animation.use_nla = False
    root = rig.pose.bones['Root']
    for frame in range(poses[0][0],poses[-1][0]+1):
        scene.frame_set(frame)
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        lowest = min((evaluated.matrix_world @ vertex.co).z for vertex in evaluated.data.vertices)
        root.location.y -= lowest
        root.keyframe_insert(data_path='location',frame=frame)
    animation.use_nla = True
    track = animation.nla_tracks.new()
    track.name = name
    track.strips.new(name,1,action)
    animation.action = None

forward = {'FrontL':(23,0,0),'FrontR':(-23,0,0),'RearL':(-23,0,0),'RearR':(23,0,0)}
back = {leg:(-rotation[0],0,0) for leg, rotation in forward.items()}
clip('idle',[(1,{}),(21,{'Tail':(7,0,12),'Head':(-5,0,0)}),(41,{})])
clip('move',[(1,forward),(7,back),(13,forward)])
clip('attack',[(1,{}),(6,{'Head':(17,0,0),'Tail':(-19,0,0)}),
               (11,{'Root':(-15,0,0),'Head':(-24,0,0),'Tail':(16,0,0)}),(19,{})])
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=Path('fire-fox.glb'))
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
path = args.output.resolve()
path.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animation_mode='NLA_TRACKS')
