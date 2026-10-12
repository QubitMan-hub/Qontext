"""Turns the 3D sneaker generated from the Pair Production photo into the model Turntable shows.

The model was made with Meshy V6 (image to 3D, run through Weave) from art/pair-shoe.png, the same photo the
showcase paints on. Turntable colors it the way the showcase colors the photo: the nine panel outlines, painted
flat, are projected through the shoe from the side and multiplied over its white leather. For that, the model
has to stand exactly where the photo's shoe stands. This script:

    1. turns the model so its toe points along +x and the photographed side faces +z,
    2. fits its side outline to the photo's outline (scale and offset, by the overlap of the two),
    3. writes it in the photo's frame: x from heel (0) to toe (1), y up from the sole, one unit = the shoe's length,
    4. marks which surfaces take paint (the outside) and which stay white (the lining and the insole),
    5. shrinks it for the web: textures to WebP at 2048 px, drops the glow map Meshy adds.

The source file (about 10 MB) is not kept in the repository; the output is:

    src/site/public/pair-shoe.glb

Needs numpy, pillow, scipy, scikit-image and pygltflib. Usage, from the repository root:
    python3 scripts/pair_model.py path/to/meshy.glb [--overlay out.png]
"""

import io
import json
import pathlib
import re
import sys

import numpy as np
import pygltflib
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy import optimize

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from pair_photo import CROP, SOURCE, silhouette  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "site" / "public" / "pair-shoe.glb"
MODULE = ROOT / "src" / "site" / "pair-photo.js"


def photo_outline():
    """The photo's shoe as a mask in the cropped photo, and its frame (heel x, sole y, length) in pixels."""
    gray = np.asarray(Image.open(SOURCE).convert("RGB")).astype(float).mean(axis=2)
    mask = silhouette(gray)[CROP[1] : CROP[3], CROP[0] : CROP[2]]
    # The frame Turntable uses comes from the committed outline path, so read it from there.
    photo = json.loads(MODULE.read_text().split("export const PHOTO = ", 1)[1].rstrip().rstrip(";"))
    pts = np.array([float(v) for v in re.findall(r"\d+(?:\.\d+)?", photo["silhouette"])]).reshape(-1, 2)
    frame = {"x0": pts[:, 0].min(), "yBottom": pts[:, 1].max(), "L": pts[:, 0].max() - pts[:, 0].min()}
    return mask, frame


def read(gltf, index):
    """An accessor's data as a numpy array (tightly packed views only, as Meshy writes them)."""
    acc = gltf.accessors[index]
    view = gltf.bufferViews[acc.bufferView]
    dtype = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}[acc.componentType]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc.type]
    start = (view.byteOffset or 0) + (acc.byteOffset or 0)
    data = np.frombuffer(gltf.binary_blob(), dtype, acc.count * width, start)
    return data.reshape(acc.count, width) if width > 1 else data


def side_mask(pos, tri, scale=400):
    """The model's outline seen from the side, at `scale` pixels per model unit, with its origin."""
    lo = pos[:, :2].min(axis=0)
    hi = pos[:, :2].max(axis=0)
    size = np.ceil((hi - lo) * scale).astype(int) + 2
    img = Image.new("1", (int(size[0]), int(size[1])))
    draw = ImageDraw.Draw(img)
    xy = np.column_stack([(pos[:, 0] - lo[0]) * scale, (hi[1] - pos[:, 1]) * scale])
    for a, b, c in tri:
        draw.polygon([tuple(xy[a]), tuple(xy[b]), tuple(xy[c])], fill=1)
    return np.asarray(img), lo, hi


def fit(pos, tri, target):
    """Scale (sx, sy) and offset (tx, ty) that lay the model's side outline over the photo's: px = tx + sx * x,
    py = ty - sy * y. Starts from the two bounding boxes and refines by the overlap of the two outlines."""
    k = 400
    mask, lo, hi = side_mask(pos, tri, k)
    ys, xs = np.nonzero(target)
    sx0 = (xs.max() - xs.min()) / (hi[0] - lo[0])
    sy0 = (ys.max() - ys.min()) / (hi[1] - lo[1])
    start = np.array([sx0, sy0, xs.min() - sx0 * lo[0], ys.min() + sy0 * hi[1]])

    def warped(p):
        sx, sy, tx, ty = p
        # Photo pixel (row, col) to mask pixel: ((hi_y - (ty - row) / sy) * k, ((col - tx) / sx - lo_x) * k)
        matrix = np.diag([k / sy, k / sx])
        offset = [(hi[1] - ty / sy) * k, (-tx / sx - lo[0]) * k]
        return ndi.affine_transform(mask.astype(np.uint8), matrix, offset, output_shape=target.shape, order=0) > 0

    def miss(p):
        m = warped(p)
        return 1 - (m & target).sum() / (m | target).sum()

    best = optimize.minimize(miss, start, method="Nelder-Mead", options={"xatol": 0.05, "fatol": 1e-5})
    return best.x, 1 - miss(start), 1 - best.fun, warped(best.x)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def paintable(pos, nrm):
    """How much of the panel color each point takes: 1 on the outside, 0 on the lining and the insole, which stay
    white as on a real shoe. A wall is lining when it faces the shoe's long axis rather than away from it."""
    x, y, z = pos.T
    axis = np.clip(x, 0.3, 0.7)
    away = np.column_stack([x - axis, z])
    away /= np.linalg.norm(away, axis=1, keepdims=True) + 1e-9
    outward = (away * nrm[:, [0, 2]]).sum(axis=1)
    walls = smoothstep(-0.3, 0.05, outward)
    # Floors facing up, low down and away from the edges: the insole.
    insole = smoothstep(0.55, 0.8, nrm[:, 1]) * (1 - smoothstep(0.12, 0.16, y)) * (1 - smoothstep(0.1, 0.13, abs(z)))
    return walls * (1 - insole)


def webp(gltf, index, size, quality):
    """One of the model's images, re-encoded as WebP at `size` pixels square."""
    view = gltf.bufferViews[gltf.images[index].bufferView]
    blob = gltf.binary_blob()[view.byteOffset : view.byteOffset + view.byteLength]
    img = Image.open(io.BytesIO(blob)).convert("RGB")
    if img.size != (size, size):
        img = img.resize((size, size), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, "WEBP", quality=quality, method=6)
    return out.getvalue()


def write(path, pos, nrm, uv, paint, tri, images):
    """A GLB with one mesh, one material and WebP textures (EXT_texture_webp). Normals are stored as bytes and
    texture coordinates as 16-bit integers (KHR_mesh_quantization), which three.js reads as they are. `images` maps
    a material slot (base, normal, roughness) to its WebP bytes."""
    blob = bytearray()
    views, accessors = [], []

    def put(data, target=None, stride=None):
        while len(blob) % 4:
            blob.append(0)
        views.append(pygltflib.BufferView(buffer=0, byteOffset=len(blob), byteLength=len(data)))
        views[-1].target, views[-1].byteStride = target, stride
        blob.extend(data)
        return len(views) - 1

    def attribute(arr, kind, ctype=pygltflib.FLOAT, target=pygltflib.ARRAY_BUFFER, bounds=False, stride=None):
        data = arr.tobytes()
        if stride:  # each vertex padded to a 4-byte boundary, as vertex attributes must be
            rows = arr.reshape(len(arr), -1).view(np.uint8).reshape(len(arr), -1)
            data = np.pad(rows, ((0, 0), (0, stride - rows.shape[1]))).tobytes()
        acc = pygltflib.Accessor(bufferView=put(data, target, stride), componentType=ctype, count=len(arr), type=kind)
        acc.normalized = ctype != pygltflib.FLOAT and target == pygltflib.ARRAY_BUFFER or None
        if bounds:
            acc.min, acc.max = arr.min(axis=0).tolist(), arr.max(axis=0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    attrs = pygltflib.Attributes(
        POSITION=attribute(pos.astype(np.float32), "VEC3", bounds=True),
        NORMAL=attribute(np.round(nrm * 127).astype(np.int8), "VEC3", pygltflib.BYTE, stride=4),
        TEXCOORD_0=attribute(np.round(uv * 65535).astype(np.uint16), "VEC2", pygltflib.UNSIGNED_SHORT),
    )
    attrs._PAINT = attribute(paint.astype(np.float32), "SCALAR")
    triangles = tri.astype(np.uint16).ravel()
    indices = attribute(triangles, "SCALAR", pygltflib.UNSIGNED_SHORT, pygltflib.ELEMENT_ARRAY_BUFFER)
    primitive = pygltflib.Primitive(attributes=attrs, indices=indices, material=0)
    slots = list(images)
    gltf = pygltflib.GLTF2(
        asset=pygltflib.Asset(generator="Qontext scripts/pair_model.py", version="2.0"),
        scene=0,
        scenes=[pygltflib.Scene(nodes=[0])],
        nodes=[pygltflib.Node(mesh=0, name="Shoe")],
        meshes=[pygltflib.Mesh(name="Shoe", primitives=[primitive])],
        materials=[
            pygltflib.Material(
                name="Leather",
                doubleSided=True,
                pbrMetallicRoughness=pygltflib.PbrMetallicRoughness(
                    baseColorTexture=pygltflib.TextureInfo(index=slots.index("base")),
                    metallicRoughnessTexture=pygltflib.TextureInfo(index=slots.index("roughness")),
                ),
                normalTexture=pygltflib.NormalMaterialTexture(index=slots.index("normal")),
            )
        ],
        samplers=[pygltflib.Sampler(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)],
        textures=[pygltflib.Texture(sampler=0, extensions={"EXT_texture_webp": {"source": k}}) for k in range(3)],
        images=[pygltflib.Image(name=name, mimeType="image/webp", bufferView=put(images[name])) for name in slots],
        accessors=accessors,
        bufferViews=views,
        buffers=[pygltflib.Buffer(byteLength=len(blob))],
        extensionsUsed=["EXT_texture_webp", "KHR_mesh_quantization"],
        extensionsRequired=["EXT_texture_webp", "KHR_mesh_quantization"],
    )
    gltf.set_binary_blob(bytes(blob))
    gltf.save_binary(str(path))


def main():
    src = pathlib.Path(sys.argv[1])
    gltf = pygltflib.GLTF2().load(str(src))
    prim = gltf.meshes[0].primitives[0]
    pos = read(gltf, prim.attributes.POSITION).astype(np.float64) * [-1, 1, -1]  # toe to +x, stripe side to +z
    nrm = read(gltf, prim.attributes.NORMAL).astype(np.float64) * [-1, 1, -1]
    tri = read(gltf, prim.indices).reshape(-1, 3)
    target, frame = photo_outline()
    (sx, sy, tx, ty), before, after, fitted = fit(pos, tri, target)
    print(f"outline overlap: {before:.4f} from the boxes, {after:.4f} fitted (sx {sx:.1f}, sy {sy:.1f})")
    # Into the photo's frame. Across the shoe the length's scale holds, so the shoe keeps its own width.
    L = frame["L"]
    scale = np.array([sx, sy, sx]) / L
    x = (tx + sx * pos[:, 0] - frame["x0"]) / L
    y = (frame["yBottom"] - ty + sy * pos[:, 1]) / L
    pos = np.column_stack([x, y, pos[:, 2] * sx / L])
    nrm = nrm / scale
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    paint = paintable(pos, nrm)
    # The model was turned half way round, which keeps its triangles' winding: no flip needed.
    uv = read(gltf, prim.attributes.TEXCOORD_0)
    tex = gltf.materials[0]
    source = lambda info: gltf.textures[info.index].source  # noqa: E731
    images = {
        "base": webp(gltf, source(tex.pbrMetallicRoughness.baseColorTexture), 2048, 86),
        "normal": webp(gltf, source(tex.normalTexture), 2048, 90),
        "roughness": webp(gltf, source(tex.pbrMetallicRoughness.metallicRoughnessTexture), 1024, 80),
    }
    write(OUT, pos, nrm, uv, paint, tri, images)
    print(f"{OUT.name}: {OUT.stat().st_size // 1024} KB, {len(pos)} points, {len(tri)} triangles")
    print(f"  {(paint < 0.5).mean():.0%} of the points stay white (lining and insole)")
    print("  " + ", ".join(f"{k} {len(v) // 1024} KB" for k, v in images.items()))
    if "--overlay" in sys.argv:
        out = sys.argv[sys.argv.index("--overlay") + 1]
        rgb = np.zeros((*target.shape, 3), np.uint8)
        rgb[..., 0] = target * 255
        rgb[..., 1] = fitted * 255
        Image.fromarray(rgb).save(out)


if __name__ == "__main__":
    main()
