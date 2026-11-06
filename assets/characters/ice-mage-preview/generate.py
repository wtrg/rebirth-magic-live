"""Codex P9 Ice Mage concept, Blender 4.5. Export via -- --output PATH."""
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

mantle = material('Deep indigo wool', (.045,.079,.18))
steel = material('Frost steel', (.22,.40,.61), .42)
ice = material('Glacier crystal', (.30,.80,1), emission=.22)
face = material('Warm porcelain', (.64,.39,.29))
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

part('Tunic','Torso','gem',(0,.01,1.49),(.34,.22,.47),mantle)
part('Sash','Torso','box',(0,0,1.18),(.24,.19,.075),steel)
part('Split mantle left','Torso','cone',(.155,.13,1.10),(.21,.13,.48),mantle,(180,-16,0))
part('Split mantle right','Torso','cone',(-.155,.13,1.10),(.21,.13,.48),mantle,(180,16,0))
part('Brocade clasp','Torso','gem',(0,-.22,1.63),(.095,.043,.135),ice)
part('Head','Head','gem',(0,-.025,2.15),(.205,.181,.235),mantle)
part('Face','Head','gem',(0,-.154,2.117),(.144,.095,.143),face)
part('Ice diadem','Head','gem',(0,-.169,2.275),(.052,.051,.12),ice)
for side, sign in (('L',1),('R',-1)):
    arm, leg = f'Arm{side}', f'Leg{side}'
    part('Shoulder '+side,arm,'gem',(sign*.43,.02,1.78),(.20,.18,.16),steel)
    part('Fin '+side,'Torso','cone',(sign*.39,.19,1.98),(.13,.093,.32),ice,(-19,sign*25,0))
    part('Sleeve '+side,arm,'gem',(sign*.52,-.035,1.50),(.13,.13,.28),mantle)
    part('Cuff '+side,arm,'gem',(sign*.54,-.10,1.27),(.102,.104,.12),steel)
    part('Eye '+side,'Head','gem',(sign*.069,-.227,2.15),(.037,.020,.014),ice)
    part('Trouser '+side,leg,'gem',(sign*.205,.015,.53),(.128,.141,.48),mantle)
    part('Boot '+side,leg,'gem',(sign*.205,-.068,.145),(.143,.215,.145),steel)
part('Spear shaft','ArmR','box',(-.57,-.18,1.28),(.029,.029,1.12),steel)
part('Spear socket','ArmR','gem',(-.57,-.18,2.38),(.076,.076,.115),mantle)
part('Spear blade','ArmR','cone',(-.57,-.18,2.62),(.139,.086,.265),ice)
part('Spear fork','ArmR','cone',(-.686,-.18,2.45),(.051,.055,.145),ice,(0,-19,0))
bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = 'IceMage_Mesh'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

rig = bpy.data.objects.new('IceMage_Rig',bpy.data.armatures.new('IceMage'))
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, point, parent in [
    ('Root',(0,0,0),None), ('Torso',(0,0,1.05),'Root'),
    ('Head',(0,0,1.99),'Torso'), ('ArmL',(.40,0,1.76),'Torso'),
    ('ArmR',(-.40,0,1.76),'Torso'), ('LegL',(.205,0,.97),'Root'),
    ('LegR',(-.205,0,.97),'Root'),
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

clip('idle',[(1,{}),(24,{'Torso':(-2,2,0),'Head':(2,-4,0),'ArmR':(-4,0,3)}),(48,{})])
clip('move',[(1,{'LegL':(-22,0,0),'LegR':(22,0,0)}),(7,{}),(13,{'LegL':(22,0,0),'LegR':(-22,0,0)}),(19,{}),(25,{'LegL':(-22,0,0),'LegR':(22,0,0)})])
clip('attack',[(1,{}),(8,{'Torso':(-9,19,0),'ArmR':(-47,0,-16)}),
               (13,{'Torso':(14,-16,0),'ArmR':(-89,5,4)}),(28,{})])
clip('hit',[(1,{}),(5,{'Torso':(-17,10,5),'Head':(-10,-9,0),'ArmL':(-18,0,17)}),(15,{})])
clip('defeat',[(1,{}),(12,{'Torso':(24,0,12),'Head':(18,0,0)}),
               (35,{'Root':(0,0,77),'Torso':(11,0,0)}),(44,{'Root':(0,0,77),'Torso':(11,0,0)})])
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=Path('ice-mage.glb'))
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
path = args.output.resolve()
path.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animation_mode='NLA_TRACKS')
