"""Codex P9 Varkhazar concept, Blender 4.5. Export via -- --output PATH."""
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

obsidian = material('Obsidian plate', (.045,.035,.088), .4)
trim = material('Tempered violet', (.24,.16,.35), .63)
leather = material('Ash leather', (.078,.041,.068))
ember = material('Rift ember', (.95,.045,.14), emission=1.8)
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

part('Armored chest','Torso','gem',(0,0,1.64),(.68,.35,.59),obsidian)
part('Waist','Torso','gem',(0,.02,1.15),(.43,.29,.37),leather)
part('Chest diamond','Torso','gem',(0,-.32,1.64),(.19,.09,.24),ember)
part('Helmet','Head','gem',(0,-.02,2.19),(.31,.29,.35),obsidian)
part('Faceplate','Head','gem',(0,-.25,2.12),(.22,.13,.24),trim)
for side, sign in (('L',1),('R',-1)):
    arm, leg = f'Arm{side}', f'Leg{side}'
    part('Eye '+side,'Head','gem',(sign*.112,-.338,2.20),(.069,.021,.027),ember,(0,sign*12,0))
    part('Horn base '+side,'Head','cone',(sign*.28,.01,2.46),(.135,.12,.27),trim,(-14,sign*34,0))
    part('Horn tip '+side,'Head','cone',(sign*.45,.08,2.65),(.085,.072,.20),ember,(-23,sign*19,0))
    part('Pauldron '+side,arm,'gem',(sign*.66,.01,1.90),(.37,.31,.30),trim)
    part('Pauldron spine '+side,arm,'cone',(sign*.84,.04,2.10),(.15,.12,.29),obsidian,(0,sign*44,0))
    part('Forearm '+side,arm,'gem',(sign*.72,-.06,1.48),(.23,.21,.35),obsidian)
    part('Gauntlet '+side,arm,'gem',(sign*.75,-.13,1.22),(.15,.17,.19),trim)
    part('Tasset '+side,'Torso','gem',(sign*.38,-.17,1.10),(.23,.16,.27),trim)
    part('Greave '+side,leg,'gem',(sign*.27,0,.47),(.21,.21,.46),obsidian)
    part('Boot '+side,leg,'box',(sign*.27,-.10,.11),(.19,.28,.11),leather)
    part('Rift wing '+side,'Torso','gem',(sign*.74,.26,1.81),(.25,.17,.65),obsidian,(-16,sign*45,0))
    part('Wing edge '+side,'Torso','gem',(sign*1.03,.32,2.03),(.12,.13,.40),trim,(-16,sign*45,0))

part('Glaive shaft','ArmR','box',(-.75,-.23,1.34),(.038,.044,.88),leather)
part('Glaive crescent','ArmR','gem',(-.78,-.24,2.18),(.24,.075,.34),trim,(0,-19,0))
part('Glaive ember','ArmR','gem',(-.88,-.30,2.32),(.17,.05,.28),ember,(0,-22,0))

bpy.ops.object.select_all(action='DESELECT')
for obj in parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = 'Varkhazar_Armor'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)

rig = bpy.data.objects.new('Varkhazar_Rig',bpy.data.armatures.new('Varkhazar'))
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, point, parent in [
    ('Root',(0,0,0),None), ('Torso',(0,0,1.05),'Root'),
    ('Head',(0,0,1.99),'Torso'), ('ArmL',(.53,0,1.85),'Torso'),
    ('ArmR',(-.53,0,1.85),'Torso'), ('LegL',(.27,0,.97),'Root'),
    ('LegR',(-.27,0,.97),'Root'),
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

clip('idle',[(1,{}),(24,{'Torso':(-3,3,0),'Head':(2,-3,0),'ArmR':(-5,0,3)}),(48,{})])
clip('move',[(1,{'LegL':(-24,0,0),'LegR':(24,0,0)}),(7,{}),(13,{'LegL':(24,0,0),'LegR':(-24,0,0)}),(19,{}),(25,{'LegL':(-24,0,0),'LegR':(24,0,0)})])
clip('telegraph',[(1,{}),(14,{'Torso':(-12,-22,0),'ArmR':(-95,8,-15),'Head':(8,14,0)}),(20,{'Torso':(-12,-22,0),'ArmR':(-95,8,-15),'Head':(8,14,0)})])
clip('attack',[(1,{'Torso':(-12,-22,0),'ArmR':(-95,8,-15),'Head':(8,14,0)}),(6,{'Torso':(20,24,0),'ArmR':(58,-30,15),'ArmL':(-24,8,0)}),(18,{})])
clip('hit',[(1,{}),(5,{'Torso':(-20,12,5),'Head':(-15,-10,0),'ArmL':(-22,0,19),'ArmR':(-18,0,-17)}),(15,{})])
clip('defeat',[(1,{}),(12,{'Torso':(38,8,12),'Head':(25,0,0),'ArmR':(32,0,-13)}),(35,{'Root':(0,0,78),'Torso':(22,0,0),'Head':(8,0,0),'ArmR':(35,0,-32)}),(44,{'Root':(0,0,78),'Torso':(22,0,0),'Head':(8,0,0),'ArmR':(35,0,-32)})])

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=Path('varkhazar.glb'))
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
path = args.output.resolve()
path.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animation_mode='NLA_TRACKS')
