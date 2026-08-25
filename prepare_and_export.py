import bpy
import os
import math
import mathutils

def prepare_and_export(input_file, output_file):
    print(f"=== Loading Blender file: {input_file} ===")
    bpy.ops.wm.open_mainfile(filepath=input_file)
    
    # 1. Delete all Lights and Cameras
    objs_to_remove = [o for o in bpy.data.objects if o.type in {'LIGHT', 'CAMERA'}]
    print(f"Removing {len(objs_to_remove)} lights and cameras...")
    for o in objs_to_remove:
        bpy.data.objects.remove(o, do_unlink=True)
        
    # 2. Convert all FONT (Text) and CURVE objects to MESH
    text_curve_objs = [o for o in bpy.data.objects if o.type in {'FONT', 'CURVE'}]
    print(f"Converting {len(text_curve_objs)} FONT/CURVE objects to MESH...")
    for o in text_curve_objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        try:
            bpy.ops.object.convert(target='MESH')
        except Exception as e:
            print(f"Warning converting {o.name}: {e}")
        o.select_set(False)

    # 3. Find the floor surface Z level
    # Top of Exhibition_Floor is at Z = -80.0 cm in this model
    floor_z = -80.0
    floor_obj = bpy.data.objects.get("Exhibition_Floor")
    if floor_obj:
        bb = [floor_obj.matrix_world @ mathutils.Vector(c) for c in floor_obj.bound_box]
        floor_z = max(c.z for c in bb)
        print(f"Detected floor surface Z at: {floor_z}")
    else:
        mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH' and o.bound_box]
        if mesh_objs:
            min_zs = [min((o.matrix_world @ mathutils.Vector(c)).z for c in o.bound_box) for o in mesh_objs]
            floor_z = min(min_zs)
            print(f"Fallback floor Z at: {floor_z}")

    # 4. Scale to meters and center floor at Z = 0
    # Original model is in centimeters (e.g. wall width 500 cm = 5 m).
    # Scale factor = 0.01
    SCALE_FACTOR = 0.01
    print(f"Shifting scene by Z = {-floor_z} cm and scaling by {SCALE_FACTOR} to convert to meters...")
    
    # Unhide all objects and collections so transforms apply to all
    for o in bpy.data.objects:
        o.hide_viewport = False
        o.hide_set(False)
        
    for o in bpy.data.objects:
        if o.parent is None:
            # Shift Z so floor surface is at 0
            o.location.z -= floor_z
            # Scale location and dimensions
            o.location.x *= SCALE_FACTOR
            o.location.y *= SCALE_FACTOR
            o.location.z *= SCALE_FACTOR
            o.scale.x *= SCALE_FACTOR
            o.scale.y *= SCALE_FACTOR
            o.scale.z *= SCALE_FACTOR
            
    # Apply transforms on all mesh objects
    bpy.ops.object.select_all(action='DESELECT')
    mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
    if mesh_objs:
        for o in mesh_objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = mesh_objs[0]
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bpy.ops.object.select_all(action='DESELECT')
    
    # 5. Pack textures & optimize materials
    print("Packing all images and checking materials...")
    for img in bpy.data.images:
        try:
            if not img.packed_file:
                img.pack()
        except Exception as e:
            print(f"Notice packing {img.name}: {e}")
            
    # 6. Verify materials for emissive glow
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        nodes = mat.node_tree.nodes
        bsdf = nodes.get("Principled BSDF")
        if bsdf:
            name_lower = mat.name.lower()
            if "led" in name_lower or "glow" in name_lower or "screen" in name_lower or "light" in name_lower:
                if "Emission Strength" in bsdf.inputs and bsdf.inputs["Emission Strength"].default_value < 1.0:
                    bsdf.inputs["Emission Strength"].default_value = 2.5
                    
    # 7. Print scene bounding box after transform
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    min_z, max_z = float('inf'), float('-inf')
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.bound_box:
            for corner in o.bound_box:
                w = o.matrix_world @ mathutils.Vector(corner)
                min_x = min(min_x, w.x)
                max_x = max(max_x, w.x)
                min_y = min(min_y, w.y)
                max_y = max(max_y, w.y)
                min_z = min(min_z, w.z)
                max_z = max(max_z, w.z)
    print(f"Exported Scene Bounds (meters):")
    print(f"X: [{min_x:.3f}, {max_x:.3f}] (width: {max_x-min_x:.3f} m)")
    print(f"Y: [{min_y:.3f}, {max_y:.3f}] (depth: {max_y-min_y:.3f} m)")
    print(f"Z: [{min_z:.3f}, {max_z:.3f}] (height: {max_z-min_z:.3f} m)")

    # 8. Export to glTF/GLB
    print(f"Exporting to GLB: {output_file}...")
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
        
    bpy.ops.export_scene.gltf(
        filepath=output_file,
        export_format='GLB',
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_attributes=True,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12
    )
    
    file_size_mb = os.path.getsize(output_file) / (1024 * 1024)
    print(f"Successfully exported {output_file} ({file_size_mb:.2f} MB)")

if __name__ == "__main__":
    blend_path = os.path.abspath("n.blend")
    out_glb_path = os.path.abspath("booth.glb")
    prepare_and_export(blend_path, out_glb_path)
