"""Turn the bust photo (source.png) into a printable, watertight STL.

There is no depth information in a single photo, so the shape is built from
the silhouette: the outline is "inflated" into rounded volumes (head, torso,
beard layered in front), the pedestal is revolved into a true cylinder, a few
facial forms are sculpted in, and fine surface detail (beard strands,
wrinkles, jacket folds) is embossed from the image's luminance.

Usage: python make_stl.py [--height-mm 150] [--faces 500000]
Requires: numpy scipy pillow scikit-image trimesh fast-simplification pymeshfix
"""
import argparse
import os

import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

HERE = os.path.dirname(os.path.abspath(__file__))


def segment(im):
    """Separate the bust from the light, bluish studio background."""
    H, W, _ = im.shape
    yy, xx = np.mgrid[0:H, 0:W] / np.array([H, W])[:, None, None]
    border = np.zeros((H, W), bool)
    border[:, :40] = border[:, -40:] = True
    border[:30] = True
    A = np.stack([np.ones(H * W), xx.ravel(), yy.ravel(),
                  xx.ravel() ** 2, yy.ravel() ** 2, (xx * yy).ravel()], 1)
    bg = np.zeros_like(im)
    for c in range(3):  # smooth background gradient model
        coef, *_ = np.linalg.lstsq(A[border.ravel()], im[..., c].ravel()[border.ravel()], rcond=None)
        bg[..., c] = (A @ coef).reshape(H, W)
    dist = np.sqrt(((im - bg) ** 2).sum(-1))
    cand = (dist < 14) & (im[..., 2] - im[..., 0] > 2)
    lab, _ = ndi.label(cand)
    edge_labels = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
    fg = ~np.isin(lab, list(edge_labels))
    # the cast shadow next to the pedestal is not part of the object
    fg[int(H * 0.86):, :int(W * 0.215)] = False
    fg[int(H * 0.86):, int(W * 0.80):] = False
    fg = ndi.binary_opening(fg, iterations=3)
    lab, n = ndi.label(fg)
    fg = lab == (np.argmax(ndi.sum(fg, lab, range(1, n + 1))) + 1)
    fg = ndi.binary_closing(fg, iterations=4) | fg
    return ndi.binary_fill_holes(fg)


def gauss(shape, cx, cy, sx, sy):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return np.exp(-((xx - cx) ** 2 / (2 * sx ** 2) + (yy - cy) ** 2 / (2 * sy ** 2)))


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def build_fields(im, mask):
    """Return front/back height fields (in grid pixels) and the pedestal row."""
    H, W = mask.shape
    lum = im.mean(-1)
    y = np.arange(H)[:, None] / H * np.ones((1, W))

    d = ndi.distance_transform_edt(mask)
    # local radius of the shape: how "thick" this part of the silhouette is
    R = ndi.gaussian_filter(ndi.maximum_filter(d, size=int(W * 0.18)), W * 0.03)
    R = np.maximum(R, d + 1e-3)
    inflate = np.sqrt(np.clip(2 * R * d - d ** 2, 0, None))

    # depth factor per body part: round head, flatter torso (bust)
    k = 0.95 - 0.45 * smoothstep(0.40, 0.62, y)
    front = inflate * k
    back = inflate * (k * 0.85)

    # pedestal: revolve each row into a real disc
    ped_top = int(H * 0.855)
    for r in range(ped_top, H):
        cols = np.where(mask[r])[0]
        if len(cols) < 3:
            continue
        c, rad = (cols[0] + cols[-1]) / 2, (cols[-1] - cols[0]) / 2
        disc = np.sqrt(np.clip(rad ** 2 - (np.arange(W) - c) ** 2, 0, None)) * 0.9
        front[r], back[r] = disc, disc

    # beard sits on top of the chest: lighter, low-saturation region in the middle
    sat = im.max(-1) - im.min(-1)
    beard = (lum > 120) & (sat < 45) & (y > 0.30) & (y < 0.86)
    beard = ndi.binary_opening(beard, iterations=2)
    beard = ndi.binary_closing(beard, iterations=6)
    lab, n = ndi.label(beard)
    if n:
        beard = lab == (np.argmax(ndi.sum(beard, lab, range(1, n + 1))) + 1)
    beard = ndi.binary_fill_holes(beard)
    bsoft = ndi.gaussian_filter(beard.astype(float), W * 0.02)
    front += bsoft * W * 0.07 * smoothstep(0.36, 0.5, y)

    # sculpted facial forms (grid coordinates are fractions of W/H)
    g = lambda cx, cy, sx, sy: gauss((H, W), cx * W, cy * H, sx * W, sy * H)
    front += W * 0.050 * g(0.548, 0.283, 0.040, 0.030)   # nose tip
    front += W * 0.030 * g(0.545, 0.245, 0.028, 0.040)   # nose bridge
    front -= W * 0.022 * g(0.445, 0.240, 0.045, 0.020)   # left eye socket
    front -= W * 0.022 * g(0.630, 0.240, 0.045, 0.020)   # right eye socket
    front += W * 0.018 * g(0.440, 0.310, 0.060, 0.030)   # left cheek
    front += W * 0.018 * g(0.640, 0.310, 0.060, 0.030)   # right cheek
    front += W * 0.035 * g(0.620, 0.080, 0.130, 0.040)   # cap brim
    front += W * 0.010 * g(0.540, 0.200, 0.160, 0.020)   # brow ridge

    # embossed detail from shading (dark = recessed)
    L = ndi.gaussian_filter(lum, 0.7)
    fine = L - ndi.gaussian_filter(L, 4)
    mid = L - ndi.gaussian_filter(L, 20)
    inner = smoothstep(2, 10, d)  # fade detail out toward silhouette edges
    notped = 1 - smoothstep(ped_top - 10, ped_top + 10, y)
    front += (fine * W * 0.00016 + mid * W * 0.00012) * inner * notped

    front = np.where(mask, np.maximum(front, 0), 0)
    front = ndi.gaussian_filter(front, 0.6)
    back = np.where(mask, np.maximum(ndi.gaussian_filter(back, 3), 0), 0)
    return front, back, d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", default=os.path.join(HERE, "source.png"))
    ap.add_argument("--out", default=os.path.join(HERE, "bearded_bust.stl"))
    ap.add_argument("--height-mm", type=float, default=150.0)
    ap.add_argument("--grid", type=int, default=768, help="grid rows (vertical resolution)")
    ap.add_argument("--faces", type=int, default=500_000, help="target face count")
    a = ap.parse_args()

    src = Image.open(a.image).convert("RGB")
    full = np.asarray(src).astype(float)
    mask_full = segment(full)
    Hg = a.grid
    Wg = round(full.shape[1] * Hg / full.shape[0])
    im = np.asarray(src.resize((Wg, Hg), Image.LANCZOS)).astype(float)
    mask = np.asarray(Image.fromarray(mask_full.astype(np.uint8) * 255)
                      .resize((Wg, Hg), Image.BILINEAR)) > 127
    mask = ndi.binary_opening(mask, iterations=1)

    front, back, _ = build_fields(im, mask)

    # implicit volume: inside where -back < z < front, clipped by the 2D outline
    sd2 = ndi.distance_transform_edt(mask) - ndi.distance_transform_edt(~mask)
    sd2 = ndi.gaussian_filter(sd2, 2.0)  # smooth the pixel stair-steps of the outline
    zmin, zmax = int(np.floor(-back.max())) - 2, int(np.ceil(front.max())) + 2
    zs = np.arange(zmin, zmax + 1, dtype=np.float32)
    pad = 2
    vol = np.full((Hg + 2 * pad, Wg + 2 * pad, len(zs)), -1.0, np.float32)
    f, b, s = front[..., None], back[..., None], sd2[..., None]
    vol[pad:-pad, pad:-pad] = np.minimum(np.minimum(f - zs, zs + b), s).astype(np.float32)
    vol[pad:-pad, pad:-pad][~mask] = np.minimum(vol[pad:-pad, pad:-pad][~mask], -0.5)
    # flat bottom: cut where the pedestal is still near full width (the photo
    # shows its underside curving away in perspective)
    widths = mask.sum(1)
    base_row = np.where(widths >= 0.93 * widths[int(Hg * 0.9):].max())[0].max()
    rows = np.arange(Hg + 2 * pad, dtype=np.float32)[:, None, None] - pad
    vol = np.minimum(vol, base_row - rows)
    verts, faces, _, _ = measure.marching_cubes(vol, 0.0)

    # (row, col, z) -> (x, y, z) with y up, mm units, base on z=0 plane
    scale = a.height_mm / Hg
    v = np.c_[verts[:, 1] - pad, -(verts[:, 2] + zmin), (Hg - (verts[:, 0] - pad))] * scale
    mesh = trimesh.Trimesh(v, faces[:, ::-1], process=True)
    print("marching cubes:", len(mesh.faces), "faces, watertight:", mesh.is_watertight)

    if len(mesh.faces) > a.faces:
        import fast_simplification
        vv, ff = fast_simplification.simplify(mesh.vertices, mesh.faces,
                                              target_reduction=1 - a.faces / len(mesh.faces))
        # decimation leaves a handful of non-manifold edges; MeshFix closes them
        import pymeshfix
        vv, ff = pymeshfix.clean_from_arrays(vv, ff)
        mesh = trimesh.Trimesh(vv, ff, process=True)
    trimesh.repair.fix_normals(mesh)
    mesh.apply_scale(a.height_mm / mesh.extents[2])
    mesh.apply_translation([-mesh.bounds[:, 0].mean(), -mesh.bounds[:, 1].mean(), -mesh.bounds[0, 2]])
    mesh.export(a.out)
    print("faces:", len(mesh.faces), "watertight:", mesh.is_watertight,
          "volume cm3: %.1f" % (mesh.volume / 1000), "size mm:", np.round(mesh.extents, 1))


if __name__ == "__main__":
    main()
