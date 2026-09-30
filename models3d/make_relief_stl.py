"""Turn a cutout PNG (with alpha) into a 3D-printable relief STL.

Usage: python make_relief_stl.py input.png output.stl [width_mm]
Silhouette = alpha channel. Height = domed body (distance transform) + image shading detail.
"""
import sys, struct
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
WIDTH_MM = float(sys.argv[3]) if len(sys.argv) > 3 else 100.0
BASE, DOME, DETAIL = 2.0, 7.0, 2.5      # mm: flat base, dome height, shading detail
NX = 420                                # grid cells across

im = Image.open(src).convert("RGBA")
w, h = im.size
ny = round(NX * h / w)
im = im.resize((NX, ny), Image.LANCZOS)
a = np.array(im).astype(float)
mask = a[..., 3] > 127
mask = ndi.binary_opening(mask, iterations=2)
lab, n = ndi.label(mask)
if n > 1:  # keep largest blob only (drops stray specks)
    mask = lab == (np.argmax(ndi.sum(mask, lab, range(1, n + 1))) + 1)
mask = ndi.binary_fill_holes(mask)

lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255
lum = ndi.gaussian_filter(lum, 1.0)
dist = ndi.distance_transform_edt(mask)
dome = np.sqrt(np.clip(dist / dist.max(), 0, 1))          # rounded profile
dome = ndi.gaussian_filter(dome, 2.0)
cellh = BASE + DOME * dome + DETAIL * lum * np.clip(dist / 4, 0, 1)
cellh[~mask] = 0

# vertex heights = mean of adjacent masked cells (keeps surface continuous)
H = np.zeros((ny + 1, NX + 1)); C = np.zeros_like(H)
for dy in (0, 1):
    for dx in (0, 1):
        H[dy:dy + ny, dx:dx + NX] += cellh * mask
        C[dy:dy + ny, dx:dx + NX] += mask
V = np.where(C > 0, H / np.maximum(C, 1), 0)

s = WIDTH_MM / NX
def vtx(i, j, z):  # i=row(y down), j=col
    return np.stack([j * s, (ny - i) * s, z], -1)

tris = []
def quad(p0, p1, p2, p3):  # CCW seen from outside
    tris.append(np.stack([p0, p1, p2], 1)); tris.append(np.stack([p0, p2, p3], 1))

ii, jj = np.nonzero(mask)
z = lambda di, dj: V[ii + di, jj + dj]
# top (normal +z): corners (i,j)->(i+1,j)->(i+1,j+1)->(i,j+1) in row-down coords is CCW viewed from +z
quad(vtx(ii, jj, z(0, 0)), vtx(ii + 1, jj, z(1, 0)), vtx(ii + 1, jj + 1, z(1, 1)), vtx(ii, jj + 1, z(0, 1)))
zero = np.zeros(len(ii))
quad(vtx(ii, jj, zero), vtx(ii, jj + 1, zero), vtx(ii + 1, jj + 1, zero), vtx(ii + 1, jj, zero))

pad = np.pad(mask, 1)
def wall(di, dj, a_, b_):
    m = ~pad[ii + 1 + di, jj + 1 + dj]
    i, j = ii[m], jj[m]; zz = np.zeros(m.sum())
    (ai, aj), (bi, bj) = a_, b_
    quad(vtx(i + ai, j + aj, zz), vtx(i + bi, j + bj, zz),
         vtx(i + bi, j + bj, V[i + bi, j + bj]), vtx(i + ai, j + aj, V[i + ai, j + aj]))
wall(-1, 0, (0, 1), (0, 0))   # top edge
wall(1, 0, (1, 0), (1, 1))    # bottom edge
wall(0, -1, (0, 0), (1, 0))   # left edge
wall(0, 1, (1, 1), (0, 1))    # right edge

T = np.concatenate(tris).astype(np.float32)
nrm = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0])
ln = np.linalg.norm(nrm, axis=1, keepdims=True); ok = ln[:, 0] > 1e-12
T, nrm = T[ok], (nrm[ok] / ln[ok]).astype(np.float32)
rec = np.zeros(len(T), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
rec["n"], rec["v"] = nrm, T
with open(dst, "wb") as f:
    f.write(b"dog relief".ljust(80, b" ")); f.write(struct.pack("<I", len(T))); f.write(rec.tobytes())

# manifold check: every edge must be shared by exactly 2 triangles
q = np.round(T * 1000).astype(np.int64)
e = np.concatenate([q[:, [0, 1]], q[:, [1, 2]], q[:, [2, 0]]])
e = np.sort(e.reshape(-1, 2, 3).reshape(len(e), 6).reshape(-1, 2, 3), axis=1)
_, cnt = np.unique(e.reshape(len(e), 6), axis=0, return_counts=True)
print(f"{len(T)} triangles, size {T[...,0].max():.1f} x {T[...,1].max():.1f} x {T[...,2].max():.1f} mm, "
      f"edges shared by !=2 tris: {(cnt != 2).sum()}")
