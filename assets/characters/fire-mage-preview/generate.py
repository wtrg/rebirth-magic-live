# -*- coding: utf-8 -*-
"""
P9 - Step 1: Hỏa Pháp Sư (Fire Mage) Low-Poly Anime Generator
Blender 4.5+ Self-Contained Python Script (bpy)
- Đơn vị: Mét (Meters), Z-up, Mặt hướng về -Y (Front = -Y)
- Chân chạm mặt đất (min Z = 0.0m)
- Bao gồm: Low-poly Mesh (Primitives), Principled BSDF Materials,
  Armature Rig, Vertex Weights định sẵn, 5 NLA Animations (idle, move, attack, hit, defeat)
- Xuất trực tiếp ra file GLB.

Chạy local qua CLI:
  blender -b -P fire_mage_p9.py -- --output fire_mage.glb
"""

import os
import sys
import math
import argparse
import bpy
import bmesh
from mathutils import Vector, Euler, Matrix


# ==============================================================================
# 1. TIỆN ÍCH DỌN SCENE & KHỞI TẠO ĐƠN VỊ
# ==============================================================================
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = 24


# ==============================================================================
# 2. TẠO VẬT LIỆU (BLENDER 4.5 PRINCIPLED BSDF)
# ==============================================================================
def create_material(name, base_color, roughness=0.5, metallic=0.0, emission_color=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")

    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic

    if emission_color is not None and emission_strength > 0.0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = emission_color
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength

    return mat


def build_palette():
    return {
        "skin": create_material("Mat_Skin", (0.98, 0.82, 0.73, 1.0), roughness=0.55),
        "crimson": create_material("Mat_Robe_Crimson", (0.72, 0.08, 0.11, 1.0), roughness=0.5),
        "dark_robe": create_material("Mat_Robe_Dark", (0.15, 0.06, 0.08, 1.0), roughness=0.65),
        "gold": create_material("Mat_Gold_Trim", (0.94, 0.74, 0.22, 1.0), roughness=0.25, metallic=0.85),
        "hair": create_material("Mat_Hair_Flame", (0.90, 0.28, 0.09, 1.0), roughness=0.45),
        "eye": create_material("Mat_Eye_Dark", (0.08, 0.04, 0.04, 1.0), roughness=0.15),
        "wood": create_material("Mat_Staff_Wood", (0.30, 0.16, 0.08, 1.0), roughness=0.65),
        "fire": create_material(
            "Mat_Fire_Emissive",
            (1.0, 0.38, 0.04, 1.0),
            roughness=0.2,
            emission_color=(1.0, 0.42, 0.05, 1.0),
            emission_strength=4.0,
        ),
    }


# ==============================================================================
# 3. Dựng MESH TỪ PRIMITIVES & GÁN VERTEX GROUP TRỰC TIẾP
# ==============================================================================
def add_primitive_part(prim_type, name, vg_name, mat, loc=(0, 0, 0), rot_deg=(0, 0, 0), scale=(1, 1, 1), **kwargs):
    """
    Tạo một bộ phận từ primitive, bake transform vào mesh ở hệ tọa độ gốc,
    gán vật liệu và gán 100% weight vào vertex group tương ứng với xương.
    """
    if prim_type == 'CUBE':
        bpy.ops.mesh.primitive_cube_add(size=kwargs.get('size', 1.0))
    elif prim_type == 'CYLINDER':
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=kwargs.get('vertices', 12),
            radius=kwargs.get('radius', 0.5),
            depth=kwargs.get('depth', 1.0),
        )
    elif prim_type == 'CONE':
        bpy.ops.mesh.primitive_cone_add(
            vertices=kwargs.get('vertices', 12),
            radius1=kwargs.get('radius1', 0.5),
            radius2=kwargs.get('radius2', 0.0),
            depth=kwargs.get('depth', 1.0),
        )
    elif prim_type == 'UV_SPHERE':
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=kwargs.get('segments', 14),
            ring_count=kwargs.get('ring_count', 10),
            radius=kwargs.get('radius', 0.5),
        )
    elif prim_type == 'ICO_SPHERE':
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=kwargs.get('subdivisions', 2),
            radius=kwargs.get('radius', 0.5),
        )
    elif prim_type == 'TORUS':
        bpy.ops.mesh.primitive_torus_add(
            major_segments=kwargs.get('major_segments', 16),
            minor_segments=kwargs.get('minor_segments', 8),
            major_radius=kwargs.get('major_radius', 0.3),
            minor_radius=kwargs.get('minor_radius', 0.05),
        )
    else:
        raise ValueError(f"Unsupported primitive: {prim_type}")

    obj = bpy.context.active_object
    obj.name = name

    rot_rad = tuple(math.radians(a) for a in rot_deg)
    mat_loc = Matrix.Translation(Vector(loc))
    mat_rot = Euler(rot_rad, 'XYZ').to_matrix().to_4x4()
    mat_sca = Matrix.Diagonal(Vector((scale[0], scale[1], scale[2], 1.0)))
    transform_mat = mat_loc @ mat_rot @ mat_sca

    # Bake transform trực tiếp vào dữ liệu đỉnh
    obj.data.transform(transform_mat)
    obj.data.update()

    # Gán vật liệu
    obj.data.materials.clear()
    obj.data.materials.append(mat)

    # Gán Vertex Group
    vg = obj.vertex_groups.new(name=vg_name)
    vert_indices = [v.index for v in obj.data.vertices]
    vg.add(vert_indices, 1.0, 'REPLACE')

    return obj


def build_fire_mage_mesh(mats):
    parts = []

    # --- CHÂN & GIÀY PHÁP SƯ (Chạm đất tại Z = 0.0, Mũi giày hướng -Y) ---
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        vg_leg = f"Leg.{side}"
        x_leg = 0.105 * sx
        # Đế giày (Z từ 0.00 đến 0.12, nhô về phía trước -Y)
        parts.append(add_primitive_part(
            'CUBE', f"Boot_Foot_{side}", vg_leg, mats["dark_robe"],
            loc=(x_leg, -0.035, 0.06), scale=(0.11, 0.21, 0.12)
        ))
        # Cổ giày viền vàng
        parts.append(add_primitive_part(
            'CONE', f"Boot_Cuff_{side}", vg_leg, mats["gold"],
            loc=(x_leg, 0.0, 0.16), radius1=0.058, radius2=0.072, depth=0.09, vertices=10
        ))
        # Ống chân
        parts.append(add_primitive_part(
            'CYLINDER', f"Shin_{side}", vg_leg, mats["dark_robe"],
            loc=(x_leg, 0.0, 0.44), radius=0.052, depth=0.52, vertices=10
        ))

    # --- HÔNG & TÀ ÁO CHOÀNG DƯỚI (Hips) ---
    parts.append(add_primitive_part(
        'CONE', "Robe_Skirt_Outer", "Hips", mats["crimson"],
        loc=(0.0, 0.0, 0.58), radius1=0.31, radius2=0.13, depth=0.54, vertices=14
    ))
    parts.append(add_primitive_part(
        'CONE', "Robe_Skirt_Inner", "Hips", mats["dark_robe"],
        loc=(0.0, -0.01, 0.56), radius1=0.28, radius2=0.12, depth=0.52, vertices=12
    ))
    # Đai lưng vàng + khóa ngọc lửa phía trước (-Y)
    parts.append(add_primitive_part(
        'CYLINDER', "Belt_Gold", "Hips", mats["gold"],
        loc=(0.0, 0.0, 0.83), radius=0.145, depth=0.055, vertices=14
    ))
    parts.append(add_primitive_part(
        'ICO_SPHERE', "Belt_FireGem", "Hips", mats["fire"],
        loc=(0.0, -0.15, 0.83), radius=0.042, subdivisions=1
    ))

    # --- THÂN TRÊN, ÁO CHOÀNG VAI & CỔ ÁO (Spine) ---
    parts.append(add_primitive_part(
        'CONE', "Torso_Core", "Spine", mats["crimson"],
        loc=(0.0, 0.0, 1.00), radius1=0.135, radius2=0.165, depth=0.32, vertices=12
    ))
    parts.append(add_primitive_part(
        'CONE', "Shoulder_Mantle", "Spine", mats["crimson"],
        loc=(0.0, 0.0, 1.11), radius1=0.25, radius2=0.12, depth=0.16, vertices=14
    ))
    parts.append(add_primitive_part(
        'TORUS', "Collar_Gold", "Spine", mats["gold"],
        loc=(0.0, 0.0, 1.16), rot_deg=(8, 0, 0),
        major_radius=0.13, minor_radius=0.024, major_segments=14, minor_segments=6
    ))
    # Tà áo choàng sau lưng (+Y)
    parts.append(add_primitive_part(
        'CUBE', "Back_Cape", "Spine", mats["dark_robe"],
        loc=(0.0, 0.14, 0.78), rot_deg=(-10, 0, 0), scale=(0.34, 0.03, 0.68)
    ))
    # Cổ
    parts.append(add_primitive_part(
        'CYLINDER', "Neck", "Spine", mats["skin"],
        loc=(0.0, 0.0, 1.21), radius=0.048, depth=0.09, vertices=10
    ))

    # --- ĐẦU ANIME, MẮT, TÓC & MŨ PHÙ THỦY LỬA (Head) ---
    parts.append(add_primitive_part(
        'UV_SPHERE', "Head_Base", "Head", mats["skin"],
        loc=(0.0, 0.0, 1.34), scale=(0.145, 0.138, 0.152), segments=14, ring_count=10
    ))
    # Mắt Anime hướng về phía trước (-Y)
    for side, sx in [("L", 1.0), ("R", -1.0)]:
        parts.append(add_primitive_part(
            'UV_SPHERE', f"Eye_{side}", "Head", mats["eye"],
            loc=(0.052 * sx, -0.128, 1.33), scale=(0.024, 0.012, 0.032), segments=10, ring_count=8
        ))
        # Lọn tóc mai 2 bên mặt (-Y)
        parts.append(add_primitive_part(
            'CONE', f"Hair_Lock_{side}", "Head", mats["hair"],
            loc=(0.115 * sx, -0.07, 1.27), rot_deg=(180, -8 * sx, 0),
            radius1=0.042, radius2=0.008, depth=0.22, vertices=8
        ))
    # Khối tóc sau (+Y) và mái trước (-Y)
    parts.append(add_primitive_part(
        'UV_SPHERE', "Hair_Back", "Head", mats["hair"],
        loc=(0.0, 0.035, 1.36), scale=(0.158, 0.15, 0.15), segments=12, ring_count=8
    ))
    parts.append(add_primitive_part(
        'CONE', "Hair_Bang_Front", "Head", mats["hair"],
        loc=(0.0, -0.125, 1.38), rot_deg=(165, 0, 0),
        radius1=0.055, radius2=0.01, depth=0.13, vertices=8
    ))
    # Vành mũ phù thủy rộng
    parts.append(add_primitive_part(
        'CONE', "Hat_Brim", "Head", mats["crimson"],
        loc=(0.0, 0.01, 1.46), rot_deg=(-8, 0, 0),
        radius1=0.36, radius2=0.15, depth=0.06, vertices=16
    ))
    parts.append(add_primitive_part(
        'TORUS', "Hat_Band_Gold", "Head", mats["gold"],
        loc=(0.0, 0.01, 1.48), rot_deg=(-8, 0, 0),
        major_radius=0.155, minor_radius=0.02, major_segments=14, minor_segments=6
    ))
    parts.append(add_primitive_part(
        'ICO_SPHERE', "Hat_Flame_Emblem", "Head", mats["fire"],
        loc=(0.0, -0.155, 1.50), scale=(0.035, 0.025, 0.055), subdivisions=1
    ))
    # Chóp mũ nhọn hơi nghiêng về sau (+Y)
    parts.append(add_primitive_part(
        'CONE', "Hat_Cone_Lower", "Head", mats["crimson"],
        loc=(0.0, 0.03, 1.62), rot_deg=(-14, 0, 0),
        radius1=0.155, radius2=0.075, depth=0.30, vertices=12
    ))
    parts.append(add_primitive_part(
        'CONE', "Hat_Cone_Tip", "Head", mats["crimson"],
        loc=(0.0, 0.09, 1.82), rot_deg=(-28, 0, 0),
        radius1=0.075, radius2=0.008, depth=0.24, vertices=10
    ))

    # --- CÁNH TAY TRÁI (+X) & QUẢ CẦU LỬA (Arm.L, Hand.L, Orb) ---
    parts.append(add_primitive_part(
        'CONE', "Sleeve_L", "Arm.L", mats["crimson"],
        loc=(0.24, 0.0, 0.98), rot_deg=(0, -20, 0),
        radius1=0.11, radius2=0.065, depth=0.30, vertices=10
    ))
    parts.append(add_primitive_part(
        'CYLINDER', "Sleeve_Trim_L", "Arm.L", mats["gold"],
        loc=(0.29, 0.0, 0.85), rot_deg=(0, -20, 0),
        radius=0.105, depth=0.035, vertices=10
    ))
    parts.append(add_primitive_part(
        'UV_SPHERE', "Hand_L", "Hand.L", mats["skin"],
        loc=(0.32, -0.04, 0.80), radius=0.045, segments=10, ring_count=8
    ))
    # Quả cầu lửa lơ lửng phía trước bàn tay trái
    parts.append(add_primitive_part(
        'ICO_SPHERE', "FireOrb_Core", "Orb", mats["fire"],
        loc=(0.34, -0.22, 0.96), radius=0.085, subdivisions=2
    ))
    parts.append(add_primitive_part(
        'TORUS', "FireOrb_Ring", "Orb", mats["gold"],
        loc=(0.34, -0.22, 0.96), rot_deg=(35, 20, 0),
        major_radius=0.115, minor_radius=0.012, major_segments=14, minor_segments=6
    ))

    # --- CÁNH TAY PHẢI (-X) & TRƯỢNG HỎA PHÁP (Arm.R, Hand.R) ---
    parts.append(add_primitive_part(
        'CONE', "Sleeve_R", "Arm.R", mats["crimson"],
        loc=(-0.24, 0.0, 0.98), rot_deg=(0, 20, 0),
        radius1=0.11, radius2=0.065, depth=0.30, vertices=10
    ))
    parts.append(add_primitive_part(
        'CYLINDER', "Sleeve_Trim_R", "Arm.R", mats["gold"],
        loc=(-0.29, 0.0, 0.85), rot_deg=(0, 20, 0),
        radius=0.105, depth=0.035, vertices=10
    ))
    parts.append(add_primitive_part(
        'UV_SPHERE', "Hand_R", "Hand.R", mats["skin"],
        loc=(-0.32, -0.06, 0.80), radius=0.045, segments=10, ring_count=8
    ))
    # Trượng phép gắn theo Hand.R (đặt hơi chếch về phía trước -Y)
    staff_x, staff_y = -0.34, -0.12
    parts.append(add_primitive_part(
        'CYLINDER', "Staff_Shaft", "Hand.R", mats["wood"],
        loc=(staff_x, staff_y, 0.86), radius=0.022, depth=1.42, vertices=10
    ))
    parts.append(add_primitive_part(
        'CYLINDER', "Staff_Base_Cap", "Hand.R", mats["gold"],
        loc=(staff_x, staff_y, 0.16), radius=0.028, depth=0.06, vertices=10
    ))
    parts.append(add_primitive_part(
        'TORUS', "Staff_Head_Ring", "Hand.R", mats["gold"],
        loc=(staff_x, staff_y, 1.62), rot_deg=(90, 0, 0),
        major_radius=0.095, minor_radius=0.018, major_segments=12, minor_segments=6
    ))
    parts.append(add_primitive_part(
        'ICO_SPHERE', "Staff_Fire_Crystal", "Hand.R", mats["fire"],
        loc=(staff_x, staff_y, 1.62), scale=(0.055, 0.055, 0.085), subdivisions=1
    ))

    # Gộp tất cả bộ phận thành một Mesh duy nhất
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()

    char_obj = bpy.context.active_object
    char_obj.name = "FireMage"
    char_obj.data.name = "FireMage_Mesh"

    # Đảm bảo tuyệt đối điểm thấp nhất của chân nằm đúng tại Z = 0.0m
    min_z = min(v.co.z for v in char_obj.data.vertices)
    if abs(min_z) > 1e-6:
        for v in char_obj.data.vertices:
            v.co.z -= min_z
        char_obj.data.update()

    return char_obj


# ==============================================================================
# 4. TẠO ARMATURE & BIND WEIGHTS
# ==============================================================================
def build_armature(mesh_obj):
    arm_data = bpy.data.armatures.new("FireMage_Armature")
    arm_obj = bpy.data.objects.new("FireMage_Rig", arm_data)
    bpy.context.collection.objects.link(arm_obj)

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    # Định nghĩa các xương đều hướng thẳng lên +Z (tail = head + (0, 0, L), roll = 0)
    # Nhờ đó hệ trục Local của mọi PoseBone đồng nhất:
    #   +X_local = +X_world (Trái)
    #   +Y_local = +Z_world (Lên trên)
    #   +Z_local = -Y_world (Mặt trước)
    bone_specs = [
        ("Root",   (0.0,   0.0,   0.00), 0.15, None),
        ("Hips",   (0.0,   0.0,   0.75), 0.15, "Root"),
        ("Spine",  (0.0,   0.0,   0.88), 0.25, "Hips"),
        ("Head",   (0.0,   0.0,   1.20), 0.25, "Spine"),
        ("Arm.L",  (0.19,  0.0,   1.12), 0.15, "Spine"),
        ("Hand.L", (0.31, -0.03,  0.82), 0.12, "Arm.L"),
        ("Orb",    (0.34, -0.22,  0.96), 0.12, "Hand.L"),
        ("Arm.R",  (-0.19, 0.0,   1.12), 0.15, "Spine"),
        ("Hand.R", (-0.31, -0.05, 0.82), 0.12, "Arm.R"),
        ("Leg.L",  (0.105, 0.0,   0.72), 0.15, "Hips"),
        ("Leg.R",  (-0.105, 0.0,  0.72), 0.15, "Hips"),
    ]

    edit_bones = {}
    for b_name, head_co, length, parent_name in bone_specs:
        eb = arm_data.edit_bones.new(b_name)
        eb.head = Vector(head_co)
        eb.tail = Vector(head_co) + Vector((0.0, 0.0, length))
        eb.roll = 0.0
        if parent_name and parent_name in edit_bones:
            eb.parent = edit_bones[parent_name]
            eb.use_connect = False
        edit_bones[b_name] = eb

    bpy.ops.object.mode_set(mode='OBJECT')

    # Thiết lập rotation_mode = 'XYZ' cho toàn bộ PoseBones
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'XYZ'

    # Gắn Mesh vào Armature qua Armature Modifier
    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj
    mod.use_vertex_groups = True

    return arm_obj


# ==============================================================================
# 5. HỆ THỐNG ANIMATION (IDLE, MOVE, ATTACK, HIT, DEFEAT)
# ==============================================================================
def reset_pose(arm_obj):
    for pb in arm_obj.pose.bones:
        pb.location = Vector((0.0, 0.0, 0.0))
        pb.rotation_euler = Euler((0.0, 0.0, 0.0), 'XYZ')
        pb.scale = Vector((1.0, 1.0, 1.0))


def key_bone(arm_obj, bone_name, frame, loc=None, rot_deg=None, scale=None):
    pb = arm_obj.pose.bones[bone_name]
    if loc is not None:
        pb.location = Vector(loc)
    if rot_deg is not None:
        pb.rotation_euler = Euler(
            (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2])),
            'XYZ',
        )
    if scale is not None:
        pb.scale = Vector(scale)

    pb.keyframe_insert(data_path="location", frame=frame)
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)
    pb.keyframe_insert(data_path="scale", frame=frame)


def key_all_rest(arm_obj, frame):
    for pb in arm_obj.pose.bones:
        pb.location = Vector((0.0, 0.0, 0.0))
        pb.rotation_euler = Euler((0.0, 0.0, 0.0), 'XYZ')
        pb.scale = Vector((1.0, 1.0, 1.0))
        pb.keyframe_insert(data_path="location", frame=frame)
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)
        pb.keyframe_insert(data_path="scale", frame=frame)


def ground_clip(arm_obj, mesh_obj, action):
    """Bake a vertical root correction from the deformed mesh at every export frame."""
    scene = bpy.context.scene
    animation = arm_obj.animation_data
    root = arm_obj.pose.bones["Root"]
    original_nla = animation.use_nla
    animation.use_nla = False
    try:
        start, end = map(int, action.frame_range)
        for frame in range(start, end + 1):
            scene.frame_set(frame)
            evaluated = mesh_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
            floor_height = min((evaluated.matrix_world @ vertex.co).z for vertex in evaluated.data.vertices)
            root.location.y -= floor_height
            root.keyframe_insert(data_path="location", frame=frame)
    finally:
        animation.use_nla = original_nla


def finalize_action_to_nla(arm_obj, action, track_name):
    """Đẩy Action vào NLA Track, tương thích hoàn toàn với Slotted Actions của Blender 4.4/4.5."""
    action.use_fake_user = True
    current_slot = getattr(arm_obj.animation_data, "action_slot", None)

    track = arm_obj.animation_data.nla_tracks.new()
    track.name = track_name
    start_frame = int(round(action.frame_range[0]))
    strip = track.strips.new(name=track_name, start=start_frame, action=action)
    if current_slot is not None and hasattr(strip, "action_slot"):
        strip.action_slot = current_slot
    track.mute = False


def build_animations(arm_obj, mesh_obj):
    if arm_obj.animation_data is None:
        arm_obj.animation_data_create()

    # Lưu ý hệ trục PoseBone:
    # loc = (dx_world, dz_world_up, dy_world_forward_towards_negY)
    # rot_deg = (rx_pitch, ry_yaw, rz_roll)

    # ------------------------------------------------------------------
    # 1. IDLE (Frames 1 - 48): Nhịp thở nhẹ, quả cầu lửa bồng bềnh & xoay
    # ------------------------------------------------------------------
    act_idle = bpy.data.actions.new(name="idle")
    arm_obj.animation_data.action = act_idle
    reset_pose(arm_obj)

    for f in (1, 48):
        key_all_rest(arm_obj, f)
        key_bone(arm_obj, "Arm.L", f, rot_deg=(-12, 0, 6))
        key_bone(arm_obj, "Arm.R", f, rot_deg=(-10, 0, -6))

    # Frame 24: Hít vào nâng ngực, cầu lửa nảy lên và phóng to nhẹ
    key_all_rest(arm_obj, 24)
    key_bone(arm_obj, "Hips", 24, loc=(0.0, 0.02, 0.0))
    key_bone(arm_obj, "Spine", 24, rot_deg=(-3, 0, 0))
    key_bone(arm_obj, "Head", 24, rot_deg=(4, 0, 0))
    key_bone(arm_obj, "Arm.L", 24, rot_deg=(-18, 0, 10))
    key_bone(arm_obj, "Arm.R", 24, rot_deg=(-14, 0, -9))
    key_bone(arm_obj, "Orb", 24, loc=(0.0, 0.08, 0.03), rot_deg=(0, 180, 0), scale=(1.18, 1.18, 1.18))
    # Chân giữ chạm mặt đất khi Hips nhấc nhẹ
    key_bone(arm_obj, "Leg.L", 24, loc=(0.0, -0.02, 0.0))
    key_bone(arm_obj, "Leg.R", 24, loc=(0.0, -0.02, 0.0))
    finalize_action_to_nla(arm_obj, act_idle, "idle")

    # ------------------------------------------------------------------
    # 2. MOVE (Frames 1 - 24): Chạy lướt phép thuật về phía trước (-Y)
    # ------------------------------------------------------------------
    act_move = bpy.data.actions.new(name="move")
    arm_obj.animation_data.action = act_move
    reset_pose(arm_obj)

    # Frame 1 & 24: Chân trái bước tới (-Y), chân phải đưa ra sau (+Y)
    for f in (1, 24):
        key_all_rest(arm_obj, f)
        key_bone(arm_obj, "Hips", f, loc=(0.0, 0.01, 0.0), rot_deg=(8, 6, 0))
        key_bone(arm_obj, "Spine", f, rot_deg=(12, -8, 0))
        key_bone(arm_obj, "Head", f, rot_deg=(-12, 0, 0))
        key_bone(arm_obj, "Leg.L", f, rot_deg=(-32, 0, 0))
        key_bone(arm_obj, "Leg.R", f, rot_deg=(32, 0, 0))
        key_bone(arm_obj, "Arm.L", f, rot_deg=(24, 0, 10))
        key_bone(arm_obj, "Arm.R", f, rot_deg=(-28, 0, -10))

    # Frame 6 & 18: Nhịp nhún qua bước giữa
    for f in (6, 18):
        key_all_rest(arm_obj, f)
        key_bone(arm_obj, "Hips", f, loc=(0.0, 0.04, 0.0), rot_deg=(10, 0, 0))
        key_bone(arm_obj, "Spine", f, rot_deg=(12, 0, 0))
        key_bone(arm_obj, "Head", f, rot_deg=(-12, 0, 0))

    # Frame 12: Chân phải bước tới (-Y), chân trái đưa ra sau (+Y)
    key_all_rest(arm_obj, 12)
    key_bone(arm_obj, "Hips", 12, loc=(0.0, 0.01, 0.0), rot_deg=(8, -6, 0))
    key_bone(arm_obj, "Spine", 12, rot_deg=(12, 8, 0))
    key_bone(arm_obj, "Head", 12, rot_deg=(-12, 0, 0))
    key_bone(arm_obj, "Leg.L", 12, rot_deg=(32, 0, 0))
    key_bone(arm_obj, "Leg.R", 12, rot_deg=(-32, 0, 0))
    key_bone(arm_obj, "Arm.L", 12, rot_deg=(-28, 0, 10))
    key_bone(arm_obj, "Arm.R", 12, rot_deg=(24, 0, -10))
    ground_clip(arm_obj, mesh_obj, act_move)
    finalize_action_to_nla(arm_obj, act_move, "move")

    # ------------------------------------------------------------------
    # 3. ATTACK (Frames 1 - 30): Tụ hỏa cầu & phóng chưởng về phía -Y
    # ------------------------------------------------------------------
    act_attack = bpy.data.actions.new(name="attack")
    arm_obj.animation_data.action = act_attack
    reset_pose(arm_obj)

    key_all_rest(arm_obj, 1)

    # Frame 10: Nghiêng người lấy đà, giương cao trượng và tụ hỏa cầu
    key_all_rest(arm_obj, 10)
    key_bone(arm_obj, "Hips", 10, rot_deg=(-6, -18, 0))
    key_bone(arm_obj, "Spine", 10, rot_deg=(-10, -22, 0))
    key_bone(arm_obj, "Head", 10, rot_deg=(8, 30, 0))
    key_bone(arm_obj, "Arm.R", 10, rot_deg=(-75, 0, -25))
    key_bone(arm_obj, "Arm.L", 10, rot_deg=(25, 0, 20))
    key_bone(arm_obj, "Orb", 10, loc=(0.0, 0.12, -0.05), scale=(1.45, 1.45, 1.45))

    # Frame 18: Tung chưởng về phía trước (-Y), cầu lửa lao mạnh ra phía trước
    key_all_rest(arm_obj, 18)
    key_bone(arm_obj, "Hips", 18, loc=(0.0, 0.0, 0.08), rot_deg=(14, 15, 0))
    key_bone(arm_obj, "Spine", 18, rot_deg=(18, 22, 0))
    key_bone(arm_obj, "Head", 18, rot_deg=(-14, -25, 0))
    key_bone(arm_obj, "Arm.L", 18, rot_deg=(-85, 0, 8))
    key_bone(arm_obj, "Arm.R", 18, rot_deg=(-45, 0, -12))
    key_bone(arm_obj, "Orb", 18, loc=(0.36, 0.04, 0.37), rot_deg=(0, 180, 0), scale=(1.45, 1.45, 1.45))
    key_bone(arm_obj, "Leg.L", 18, rot_deg=(-18, 0, 0))
    key_bone(arm_obj, "Leg.R", 18, rot_deg=(18, 0, 0))

    # Frame 30: Thu chiêu về tư thế chuẩn
    key_all_rest(arm_obj, 30)
    ground_clip(arm_obj, mesh_obj, act_attack)
    finalize_action_to_nla(arm_obj, act_attack, "attack")

    # ------------------------------------------------------------------
    # 4. HIT (Frames 1 - 20): Bị trúng đòn giật lùi về phía +Y
    # ------------------------------------------------------------------
    act_hit = bpy.data.actions.new(name="hit")
    arm_obj.animation_data.action = act_hit
    reset_pose(arm_obj)

    key_all_rest(arm_obj, 1)

    # Frame 6: Bị đẩy giật ngửa về sau (+Y = local -Z)
    key_all_rest(arm_obj, 6)
    key_bone(arm_obj, "Hips", 6, loc=(0.0, 0.0, -0.10), rot_deg=(-16, 10, 0))
    key_bone(arm_obj, "Spine", 6, rot_deg=(-22, 12, -8))
    key_bone(arm_obj, "Head", 6, rot_deg=(-25, -15, 10))
    key_bone(arm_obj, "Arm.L", 6, rot_deg=(-35, 0, 42))
    key_bone(arm_obj, "Arm.R", 6, rot_deg=(-35, 0, -42))
    key_bone(arm_obj, "Orb", 6, scale=(0.55, 0.55, 0.55))

    # Frame 13: Gượng lại
    key_all_rest(arm_obj, 13)
    key_bone(arm_obj, "Hips", 13, loc=(0.0, 0.0, -0.04), rot_deg=(8, -4, 0))
    key_bone(arm_obj, "Spine", 13, rot_deg=(10, 0, 0))

    key_all_rest(arm_obj, 20)
    ground_clip(arm_obj, mesh_obj, act_hit)
    finalize_action_to_nla(arm_obj, act_hit, "hit")

    # ------------------------------------------------------------------
    # 5. DEFEAT (Frames 1 - 40): Khuỵu gối & ngã gục xuống mặt đất
    # ------------------------------------------------------------------
    act_defeat = bpy.data.actions.new(name="defeat")
    arm_obj.animation_data.action = act_defeat
    reset_pose(arm_obj)

    key_all_rest(arm_obj, 1)

    # Frame 14: Choáng váng, khuỵu thấp, cầu lửa lụi dần
    key_all_rest(arm_obj, 14)
    key_bone(arm_obj, "Hips", 14, loc=(0.0, -0.25, -0.05), rot_deg=(18, 0, 0))
    key_bone(arm_obj, "Spine", 14, rot_deg=(22, 10, 0))
    key_bone(arm_obj, "Head", 14, rot_deg=(25, -12, 0))
    key_bone(arm_obj, "Arm.L", 14, rot_deg=(-20, 0, 28))
    key_bone(arm_obj, "Arm.R", 14, rot_deg=(-15, 0, -35))
    key_bone(arm_obj, "Leg.L", 14, rot_deg=(-35, 0, 0))
    key_bone(arm_obj, "Leg.R", 14, rot_deg=(-35, 0, 0))
    key_bone(arm_obj, "Orb", 14, loc=(0.0, -0.25, 0.0), scale=(0.25, 0.25, 0.25))

    # Frame 30 - 40: Ngã gục hẳn xuống sàn (giữ nguyên tư thế nằm đến frame 40)
    for f in (30, 40):
        key_all_rest(arm_obj, f)
        key_bone(arm_obj, "Hips", f, loc=(0.0, -0.58, 0.12), rot_deg=(78, 0, 0))
        key_bone(arm_obj, "Spine", f, rot_deg=(25, 0, 8))
        key_bone(arm_obj, "Head", f, rot_deg=(-12, 22, 0))
        key_bone(arm_obj, "Arm.L", f, rot_deg=(-15, 0, 55))
        key_bone(arm_obj, "Arm.R", f, rot_deg=(-10, 0, -65))
        key_bone(arm_obj, "Leg.L", f, rot_deg=(-4, 0, 6))
        key_bone(arm_obj, "Leg.R", f, rot_deg=(-5, 0, -6))
        key_bone(arm_obj, "Orb", f, loc=(0.0, -0.45, 0.0), scale=(0.01, 0.01, 0.01))

    ground_clip(arm_obj, mesh_obj, act_defeat)
    finalize_action_to_nla(arm_obj, act_defeat, "defeat")

    # Gỡ active action để GLB Exporter xuất sạch toàn bộ 5 NLA Tracks
    arm_obj.animation_data.action = None


# ==============================================================================
# 6. XUẤT GLB & HÀM MAIN
# ==============================================================================
def parse_output_path():
    argv = sys.argv
    if "--" in argv:
        custom_args = argv[argv.index("--") + 1:]
    else:
        custom_args = []

    parser = argparse.ArgumentParser(description="P9 Fire Mage GLB Generator")
    parser.add_argument("-o", "--output", type=str, default="fire_mage.glb", help="Đường dẫn file GLB đầu ra")
    args, _ = parser.parse_known_args(custom_args)
    return os.path.abspath(args.output)


def export_glb(filepath):
    out_dir = os.path.dirname(filepath)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=False,
        export_animations=True,
        export_yup=True,
    )


def main():
    out_path = parse_output_path()
    reset_scene()
    mats = build_palette()
    mesh_obj = build_fire_mage_mesh(mats)
    arm_obj = build_armature(mesh_obj)
    build_animations(arm_obj, mesh_obj)
    export_glb(out_path)
    print(f"[P9][SUCCESS] Exported Fire Mage GLB to: {out_path}")


if __name__ == "__main__":
    main()
