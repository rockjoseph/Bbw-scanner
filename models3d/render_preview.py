import sys, numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LightSource
d = np.fromfile(sys.argv[1], dtype=np.uint8, offset=84)
rec = np.frombuffer(d.tobytes(), dtype=[("n","<f4",3),("v","<f4",(3,3)),("a","<u2")])
top = rec[rec["n"][:,2] > 0.5]["v"].reshape(-1,3)
xs = np.unique(np.round(top[:,0],3)); ys = np.unique(np.round(top[:,1],3))
Z = np.full((len(ys), len(xs)), np.nan)
Z[np.searchsorted(ys, np.round(top[:,1],3)), np.searchsorted(xs, np.round(top[:,0],3))] = top[:,2]
X, Y = np.meshgrid(xs, ys)
ls = LightSource(azdeg=315, altdeg=40)
Zf = np.nan_to_num(Z, nan=0)
rgb = ls.shade(Zf, plt.cm.bone, vert_exag=2.5, blend_mode="soft")
rgb[np.isnan(Z)] = (1,1,1,0)
fig = plt.figure(figsize=(14,7), facecolor="#1c1c22")
ax = fig.add_subplot(121, projection="3d", facecolor="#1c1c22")
Zp = np.where(np.isnan(Z), np.nan, Z)
ax.plot_surface(X, Y, Zp, facecolors=rgb, rstride=2, cstride=2, linewidth=0, antialiased=False, shade=False)
ax.set_box_aspect((np.ptp(xs), np.ptp(ys), np.ptp(xs)*0.35)); ax.view_init(45, -60); ax.set_axis_off()
ax2 = fig.add_subplot(122, facecolor="#1c1c22")
ax2.imshow(rgb, origin="lower", extent=(xs[0],xs[-1],ys[0],ys[-1])); ax2.set_axis_off()
fig.suptitle("Dog relief prototype  (81 x 68 x 9.6 mm)", color="w")
plt.tight_layout(); plt.savefig(sys.argv[2], dpi=110, facecolor=fig.get_facecolor())
