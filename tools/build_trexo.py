import bpy, bmesh, mathutils, os, json, math
from mathutils import Vector

# ============================================================================
#  T-Rexo — recreación 3D del DINOSAURIO AZUL de referencia.
#  Cuerpo azul + manchas azul oscuro, barriga beige segmentada, espinas naranja,
#  PAÑUELO ROJO al cuello, ojos grandes (iris verde + pupila + brillo), boca
#  abierta sonriente con dientes/lengua, cola curva, brazos cortos, pies grandes.
#  Cuerpo por metaballs + detalles como mallas separadas -> join -> skin al rig.
# ============================================================================

OUT = r"C:\Users\olgit\AppData\Local\Temp\claude\c--Users-olgit-Desktop-Programacion-IA\a3124c5a-7973-4c5c-9292-171d5945bcd7\scratchpad"
TAG = os.environ.get("DINO_TAG", "blue")
DO_SKIN = os.environ.get("DINO_SKIN", "0") == "1"
DO_SAVE = os.environ.get("DINO_SAVE", "0") == "1"
DO_EXPORT = os.environ.get("DINO_EXPORT", "0") == "1"

scene = bpy.context.scene
rig = bpy.data.objects.get('DinoColor_Mascot_Rig')

# ---------- Materiales (color de viewport para workbench; base color PBR abajo) ----------
COL = {
 'mat_body_blue':    (0.13, 0.53, 0.92, 1),   # azul vivo cartoon (más saturado)
 'mat_spots_blue':   (0.07, 0.30, 0.64, 1),   # azul más oscuro (manchas)
 'mat_belly_light':  (0.93, 0.86, 0.70, 1),   # barriga beige/crema
 'mat_belly_line':   (0.80, 0.71, 0.54, 1),   # líneas de la barriga
 'mat_spikes_orange':(1.0, 0.60, 0.13, 1),    # espinas naranja/amarillo
 'mat_bandana_red':  (0.90, 0.19, 0.15, 1),   # pañuelo rojo
 'mat_eyes_white':   (1, 1, 1, 1),
 'mat_iris_green':   (0.26, 0.72, 0.34, 1),   # iris verde
 'mat_pupils_black': (0.03, 0.04, 0.06, 1),
 'mat_eye_shine':    (1, 1, 1, 1),
 'mat_mouth_dark':   (0.5, 0.12, 0.14, 1),
 'mat_tongue_pink':  (1.0, 0.5, 0.55, 1),
 'mat_teeth_soft':   (0.98, 0.98, 0.94, 1),
 'mat_nails_cream':  (0.96, 0.9, 0.76, 1),
}
def getmat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name); m.use_nodes = True
    m.diffuse_color = COL.get(name, (0.5, 0.5, 0.5, 1))
    # Fijar también el Base Color del Principled (para el GLB PBR)
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Base Color'].default_value = COL.get(name, (0.5, 0.5, 0.5, 1))
                try: n.inputs['Roughness'].default_value = 0.6
                except Exception: pass
    return m
MATS = {k: getmat(k) for k in COL}

def deselect():
    bpy.ops.object.select_all(action='DESELECT')

# ---------- borrar malla antigua ----------
old = bpy.data.objects.get('DinoColor_Mascot')
if old:
    md = old.data
    bpy.data.objects.remove(old, do_unlink=True)
    try:
        if md and md.users == 0: bpy.data.meshes.remove(md)
    except Exception: pass

# ============================================================
#  CUERPO AZUL (metaballs -> superficie suave continua)
# ============================================================
mball = bpy.data.metaballs.new("trexo_base")
base = bpy.data.objects.new("trexo_base", mball)
scene.collection.objects.link(base)
mball.resolution = 0.032
mball.threshold = 0.6

def meta(loc, r, size=None, stiff=2.0):
    e = mball.elements.new()
    e.co = Vector(loc); e.radius = r; e.stiffness = stiff
    if size:
        e.type = 'ELLIPSOID'; e.size_x, e.size_y, e.size_z = size

# (x, y=−frente, z=arriba)
BLOBS = [
 # torso peral (cuerpo pequeño respecto a la cabeza)
 ((0, 0.06, 0.40), 0.29, (1.05,1.05,0.95)),
 ((0, 0.03, 0.50), 0.28, (1.10,1.10,1.10)),
 ((0,-0.02, 0.63), 0.23, (1.05,1.00,0.95)),
 ((0,-0.03, 0.79), 0.18, None),          # cuello corto
 # cabeza GRANDE tipo bebé
 ((0,-0.06, 1.00), 0.35, (1.22,1.14,1.10)),
 # hocico ancho y simpático
 ((0,-0.31, 0.97), 0.15, (1.05,1.25,0.92)), # puente nariz
 ((0,-0.42, 0.91), 0.17, (1.05,1.55,0.98)), # hocico
 ((0,-0.33, 0.82), 0.16, (1.08,1.25,0.90)), # mandíbula
 # brazos cortos
 (( 0.28,-0.04, 0.60), 0.12, (1.2,1.0,1.1)),
 ((-0.28,-0.04, 0.60), 0.12, (1.2,1.0,1.1)),
 (( 0.36,-0.12, 0.51), 0.10, None),
 ((-0.36,-0.12, 0.51), 0.10, None),
 # piernas robustas
 (( 0.19, 0.04, 0.34), 0.20, (1.0,1.0,1.15)),
 ((-0.19, 0.04, 0.34), 0.20, (1.0,1.0,1.15)),
 (( 0.18, 0.00, 0.20), 0.15, (1.0,1.05,1.10)),
 ((-0.18, 0.00, 0.20), 0.15, (1.0,1.05,1.10)),
 (( 0.18,-0.11, 0.08), 0.13, (1.05,1.65,0.72)), # pie grande
 ((-0.18,-0.11, 0.08), 0.13, (1.05,1.65,0.72)),
 # cola curva hacia atrás
 ((0, 0.31, 0.42), 0.18, (1.0,1.25,1.0)),
 ((0, 0.50, 0.35), 0.13, None),
 ((0, 0.66, 0.28), 0.09, None),
]
for b in BLOBS:
    meta(b[0], b[1], b[2])

deselect()
bpy.context.view_layer.objects.active = base
base.select_set(True)
bpy.ops.object.convert(target='MESH')
body = bpy.context.view_layer.objects.active
body.name = 'DinoColor_Mascot'
body.data.name = 'DinoColor_Mascot_Mesh'
dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = 0.6
bpy.ops.object.modifier_apply(modifier='dec')
body.data.materials.clear()
body.data.materials.append(MATS['mat_body_blue'])
bpy.ops.object.shade_smooth()

# ============================================================
#  DETALLES (mallas separadas con su material; luego join)
# ============================================================
details = []
def sph(name, loc, scale, matname, rot=None, segs=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, location=loc)
    o = bpy.context.view_layer.objects.active
    o.name = name; o.scale = scale
    if rot: o.rotation_euler = rot
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    bpy.ops.object.shade_smooth()
    details.append(o); return o

def cone(name, loc, scale, matname, rot=None, verts=12):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=1.0, radius2=0.0, depth=2.0, location=loc)
    o = bpy.context.view_layer.objects.active
    o.name = name; o.scale = scale
    if rot: o.rotation_euler = rot
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    bpy.ops.object.shade_smooth()
    details.append(o); return o

def torus(name, loc, majr, minr, matname, rot=None):
    bpy.ops.mesh.primitive_torus_add(location=loc, major_radius=majr, minor_radius=minr,
                                     major_segments=28, minor_segments=12)
    o = bpy.context.view_layer.objects.active
    o.name = name
    if rot: o.rotation_euler = rot
    o.data.materials.clear(); o.data.materials.append(MATS[matname])
    bpy.ops.object.shade_smooth()
    details.append(o); return o

# ---- barriga beige + líneas de segmento ----
sph('belly', (0,-0.19,0.46), (0.185,0.065,0.235), 'mat_belly_light')
for j, bz in enumerate((0.54, 0.46, 0.38)):
    sph(f'belly_line_{j}', (0,-0.28,bz), (0.135 - j*0.012, 0.02, 0.012), 'mat_belly_line')

# ---- ojos GRANDES y JUNTOS, con iris verde grande, pupila al frente, brillo grande
#      y PÁRPADO azul cubriendo la parte superior (mirada tierna, no "bug eye") ----
for sx in (1,-1):
    sph(f'eye_{sx}',   (0.112*sx,-0.28,0.985), (0.102,0.115,0.125), 'mat_eyes_white')
    sph(f'iris_{sx}',  (0.112*sx,-0.375,0.982),(0.085,0.089,0.097), 'mat_iris_green')
    sph(f'pup_{sx}',   (0.112*sx,-0.435,0.982),(0.052,0.052,0.058), 'mat_pupils_black')  # centrada, mayor
    sph(f'shine_{sx}', (0.088*sx,-0.47,1.025), (0.037,0.037,0.037), 'mat_eye_shine')     # brillo grande
    # párpado azul FINO y ALTO: solo el borde superior del ojo (mirada abierta y feliz)
    sph(f'lid_{sx}',   (0.112*sx,-0.35,1.088), (0.12,0.05,0.048), 'mat_body_blue')

# ---- boca abierta (interior rojizo) + lengua ----
sph('mouth',  (0,-0.46,0.80), (0.16,0.048,0.07), 'mat_mouth_dark')
sph('tongue', (0,-0.45,0.785),(0.075,0.035,0.03), 'mat_tongue_pink')
# fosas nasales en la punta del hocico
for sx in (1,-1):
    sph(f'nos_{sx}', (0.05*sx,-0.57,0.93), (0.017,0.013,0.017), 'mat_pupils_black')
# dientes superiores + colmillos laterales más grandes
for tx, big in ((-0.115,1),(-0.04,0),(0.04,0),(0.115,1)):
    s = 0.026 if big else 0.02
    cone(f'tooth_u_{tx}', (tx,-0.505,0.835), (s,s,0.05 if big else 0.04), 'mat_teeth_soft', rot=(math.pi,0,0))
# dientes inferiores
for tx in (-0.05,0.05):
    cone(f'tooth_l_{tx}', (tx,-0.485,0.775), (0.019,0.019,0.036), 'mat_teeth_soft')

# ---- espinas naranja REDONDEADAS (bultos suaves, no conos agresivos) ----
PLATES = [
 ((0, 0.02,1.13), (0.055,0.075,0.075)),
 ((0, 0.10,1.02), (0.065,0.085,0.090)),
 ((0, 0.17,0.89), (0.065,0.090,0.095)),
 ((0, 0.24,0.74), (0.060,0.080,0.085)),
 ((0, 0.33,0.60), (0.052,0.072,0.075)),
 ((0, 0.43,0.49), (0.044,0.062,0.065)),
 ((0, 0.53,0.39), (0.035,0.050,0.052)),
 ((0, 0.63,0.30), (0.026,0.040,0.042)),
]
for i,(loc,sc) in enumerate(PLATES):
    # esfera achatada = bulto redondeado (más fiel a la referencia)
    sph(f'plate_{i}', loc, (sc[0], sc[1], sc[2]), 'mat_spikes_orange')

# ---- PAÑUELO ROJO: paño triangular al frente (kerchief), SIN anillo/donut ----
sph('bandana_top', (0,-0.20,0.71), (0.205,0.055,0.085), 'mat_bandana_red')   # borde superior enrollado
cone('bandana_tip', (0.015,-0.225,0.55), (0.125,0.04,0.16), 'mat_bandana_red', rot=(math.pi,0,0), verts=3)  # punta al pecho
for sx in (1,-1):
    sph(f'bandana_side_{sx}', (0.17*sx,-0.06,0.72), (0.055,0.13,0.05), 'mat_bandana_red')  # laterales hacia el nudo
sph('bandana_knot', (0.14,-0.16,0.70), (0.05,0.05,0.05), 'mat_bandana_red')  # nudo lateral

# ---- manchas azul oscuro (cuerpo/cola/muslos) ----
SPOTS = [
 ((0.21,-0.16,0.55),(0.06,0.055,0.03)),
 ((-0.23,-0.12,0.47),(0.055,0.05,0.03)),
 ((0.16,-0.02,0.66),(0.05,0.05,0.03)),
 ((0.27,-0.03,0.34),(0.055,0.05,0.03)),
 ((-0.27,-0.03,0.34),(0.055,0.05,0.03)),
 ((0.05,0.40,0.42),(0.05,0.05,0.03)),
 ((-0.03,0.55,0.33),(0.04,0.045,0.03)),
]
for i,(loc,sc) in enumerate(SPOTS):
    sph(f'spot_{i}', loc, sc, 'mat_spots_blue')

# ---- uñas manos ----
for sx in (1,-1):
    for j,tx in enumerate((-0.03,0.03)):
        cone(f'cl_h_{sx}_{j}', (0.41*sx,-0.17,0.50+tx), (0.02,0.02,0.05), 'mat_nails_cream', rot=(math.pi/2,0,0))
# ---- uñas pies (3 por pie) ----
for sx in (1,-1):
    for j,tx in enumerate((-0.07,0,0.07)):
        cone(f'cl_f_{sx}_{j}', (0.18*sx+tx,-0.25,0.04), (0.025,0.03,0.05), 'mat_nails_cream', rot=(-math.pi/2+0.5,0,0))

# ---------- JOIN ----------
deselect()
for o in details: o.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()

me = body.data
me.calc_loop_triangles()
print("FINAL_TRIS:", len(me.loop_triangles), "VERTS:", len(me.vertices))

# ============================================================
#  SKIN por proximidad al rig (conserva animaciones)
# ============================================================
def dps(p, a, b):
    ab = b - a
    t = (p - a).dot(ab) / max(ab.length_squared, 1e-9)
    t = max(0.0, min(1.0, t))
    return (p - (a + ab * t)).length

if DO_SKIN and rig:
    for m in list(body.modifiers):
        if m.type == 'ARMATURE': body.modifiers.remove(m)
    am = body.modifiers.new('Armature', 'ARMATURE'); am.object = rig
    body.parent = rig
    bones = list(rig.data.bones)
    segs = [(b.name, b.head_local.copy(), b.tail_local.copy()) for b in bones]
    for vg in list(body.vertex_groups): body.vertex_groups.remove(vg)
    vgs = {b.name: body.vertex_groups.new(name=b.name) for b in bones}
    mw = body.matrix_world; rim = rig.matrix_world.inverted()
    for v in me.vertices:
        co = rim @ (mw @ v.co)
        ds = sorted(((dps(co,h,t),n) for n,h,t in segs))
        (d0,n0),(d1,n1) = ds[0], ds[1]
        w0 = 1.0/(d0+0.02); w1 = 1.0/(d1+0.02); s = w0+w1
        vgs[n0].add([v.index], w0/s, 'REPLACE')
        vgs[n1].add([v.index], w1/s, 'REPLACE')
    print("SKINNED to", len(bones), "bones")

# ============================================================
#  RENDER (workbench MATERIAL)
# ============================================================
if rig: rig.data.pose_position = 'REST'
coords = [body.matrix_world @ v.co for v in me.vertices]
xs=[c.x for c in coords]; ys=[c.y for c in coords]; zs=[c.z for c in coords]
C = Vector(((min(xs)+max(xs))/2,(min(ys)+max(ys))/2,(min(zs)+max(zs))/2))
size = max(max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))

w = bpy.data.worlds[0] if bpy.data.worlds else bpy.data.worlds.new("W")
scene.world = w; w.use_nodes = False; w.color = (0.20,0.22,0.24)

aim = bpy.data.objects.new("Aim", None); scene.collection.objects.link(aim)
aim.location = C + Vector((0,0,size*0.04))
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d)
scene.collection.objects.link(cam); scene.camera = cam
con = cam.constraints.new('TRACK_TO'); con.target = aim
con.track_axis='TRACK_NEGATIVE_Z'; con.up_axis='UP_Y'

sc = scene
sc.render.engine = 'BLENDER_WORKBENCH'
sc.render.resolution_x = 600; sc.render.resolution_y = 660
sh = sc.display.shading
sh.light='STUDIO'; sh.color_type='MATERIAL'; sh.show_cavity=True; sh.cavity_type='BOTH'

d = size*2.1
VIEWS = {
 f"{TAG}_front": C+Vector((0,-d,size*0.10)),
 f"{TAG}_3q":    C+Vector((-d*0.66,-d*0.72,size*0.26)),
 f"{TAG}_side":  C+Vector((d,0,size*0.10)),
}
for name,loc in VIEWS.items():
    cam.location = loc
    sc.render.filepath = os.path.join(OUT, name+".png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", name)

# ============================================================
#  GUARDAR / EXPORTAR (solo en pasada final)
# ============================================================
if DO_SAVE:
    if rig: rig.data.pose_position = 'POSE'
    for nm in ("Cam","Aim"):
        o = bpy.data.objects.get(nm)
        if o: bpy.data.objects.remove(o, do_unlink=True)
    for a in bpy.data.actions: a.use_fake_user = True
    bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
    print("SAVED blend")

if DO_EXPORT:
    out_glb = r"C:\Users\olgit\Desktop\Programacion IA\03_juegos\dinocolor\assets\models\characters\dino-mascot\dino_color_mascot.glb"
    for o in bpy.data.objects:
        try: o.hide_set(False)
        except Exception: pass
        o.hide_viewport=False; o.hide_render=False
    try:
        bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', export_animations=True,
            export_animation_mode='ACTIONS', export_skins=True, export_yup=True,
            use_selection=False, use_visible=False, use_renderable=False)
    except TypeError:
        bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB')
    print("EXPORTED", os.path.getsize(out_glb))

print("=== DONE", TAG, "===")
