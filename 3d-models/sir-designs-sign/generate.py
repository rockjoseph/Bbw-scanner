#!/usr/bin/env python3
"""
Generate a 3D-printable, 4-color version of the S.I.R Designs wall sign.

Colors are simplified to four filaments:
  navy   - back plate, "S.I.R", "DESIGNS", logo S + R, left arrow
  silver - frame, raised name panel, both tagline lines
  blue   - stacked "layers" on top of the logo cube
  orange - logo "i", right arrow and corner arrow

Each color is written as its own STL (all sharing one origin) so they can be
loaded together as parts of one object in Bambu Studio / PrusaSlicer / Orca.
A combined 3MF and a preview PNG are also written.

Requires: pip install trimesh shapely fonttools skia-pathops mapbox_earcut matplotlib
Fonts (OFL, from github.com/google/fonts) are expected in ./fonts:
  ArchivoBlack-Regular.ttf, Montserrat[wght].ttf
"""
import os

import numpy as np
import trimesh
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from matplotlib.font_manager import FontProperties
from matplotlib.textpath import TextPath
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
OUT = HERE

# ---------------------------------------------------------------------------
# Size / layer settings (mm)
# ---------------------------------------------------------------------------
WIDTH_MM = 220.0          # overall sign width; height follows the artwork ratio
BASE_T = 3.0              # navy back plate thickness
PANEL_T = 1.0             # silver name panel on top of plate
FRAME_T = 2.6             # silver frame height above plate
RELIEF_T = 1.4            # raised letters / logo height above the panel
TAGLINE_T = 1.0           # silver tagline height above plate
HOLE_D = 4.5              # mounting hole diameter

# Artwork is laid out in the reference image's pixel space, then scaled.
IMG_X0, IMG_X1, IMG_Y0, IMG_Y1 = 195, 1228, 68, 617
SCALE = WIDTH_MM / (IMG_X1 - IMG_X0)


# ---------------------------------------------------------------------------
# Fonts / text
# ---------------------------------------------------------------------------
def static_montserrat(weight, name):
    path = os.path.join(FONTS, f"Montserrat-{name}.ttf")
    if not os.path.exists(path):
        vf = TTFont(os.path.join(FONTS, "Montserrat[wght].ttf"))
        instancer.instantiateVariableFont(vf, {"wght": weight}, inplace=True,
                                          overlap=instancer.OverlapMode.REMOVE)
        vf.save(path)
    return path


def text_shape(text, font_path):
    """Return text outline as shapely geometry (font units, y up)."""
    tp = TextPath((0, 0), text, size=100, prop=FontProperties(fname=font_path))
    rings = [Polygon(r) for r in tp.to_polygons(closed_only=True) if len(r) >= 4]
    rings = [r.buffer(0) if not r.is_valid else r for r in rings]
    signed = [(r, _signed_area(r)) for r in rings]
    pos = sum(a for _, a in signed if a > 0)
    neg = -sum(a for _, a in signed if a < 0)
    outer_sign = 1 if pos >= neg else -1
    outers = unary_union([r for r, a in signed if a * outer_sign > 0])
    holes = unary_union([r for r, a in signed if a * outer_sign < 0])
    return outers.difference(holes)


def _signed_area(poly):
    x, y = np.asarray(poly.exterior.coords).T
    return 0.5 * np.sum(x[:-1] * y[1:] - x[1:] * y[:-1])


def fit_text(text, font_path, x0, y_top, x1, y_bottom, align="left"):
    """Fit text (by cap height) into an image-pixel box (y down)."""
    g = text_shape(text, font_path)
    cap = text_shape("H", font_path).bounds
    cap_h = cap[3] - cap[1]
    s = (y_bottom - y_top) / cap_h
    minx, _, maxx, _ = g.bounds
    if (maxx - minx) * s > (x1 - x0):          # too wide -> shrink uniformly
        s = (x1 - x0) / (maxx - minx)
    g = affinity.scale(g, s, -s, origin=(0, 0))  # flip to y-down
    minx = g.bounds[0]
    w = g.bounds[2] - minx
    dx = x0 - minx if align == "left" else (x0 + x1 - w) / 2 - minx
    # baseline sits at y_bottom (cap letters span y_top..y_bottom)
    return affinity.translate(g, dx, y_bottom)


# ---------------------------------------------------------------------------
# Logo helpers (image pixel space, y down)
# ---------------------------------------------------------------------------
def arrow(p0, p1, width, head_len, head_w):
    """Straight arrow from p0 to p1 with the head at p1."""
    p0, p1 = np.array(p0, float), np.array(p1, float)
    d = p1 - p0
    L = np.linalg.norm(d)
    u = d / L
    n = np.array([-u[1], u[0]])
    shaft_end = p1 - u * head_len * 0.9
    shaft = LineString([p0, shaft_end]).buffer(width / 2, cap_style=2)
    head = Polygon([p1, p1 - u * head_len + n * head_w / 2,
                    p1 - u * head_len - n * head_w / 2])
    return unary_union([shaft, head])


def rhombus(cx, cy, hw, hh):
    return Polygon([(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)])


def build_logo(bold_font):
    cx = 425                         # cube's vertical centre line
    top_cy, hw, hh = 180, 92, 44     # top (isometric) face

    # Blue: concentric rings on the top face + stacked layer chevrons below.
    blue = [rhombus(cx, top_cy, hw, hh).difference(rhombus(cx, top_cy, hw - 16, hh - 8)),
            rhombus(cx, top_cy, hw - 30, hh - 15).difference(rhombus(cx, top_cy, hw - 44, hh - 22)),
            rhombus(cx, top_cy, hw - 56, hh - 28)]
    for i in range(1, 3):
        dy = i * 15
        band = rhombus(cx, top_cy + dy, hw, hh).difference(
            rhombus(cx, top_cy + dy - 9, hw, hh))
        band = band.difference(rhombus(cx, top_cy + (i - 1) * 15, hw, hh).buffer(3))
        blue.append(band.intersection(box(0, top_cy, 2000, 2000)))
    blue = unary_union(blue)

    # Orange: the "i" (dot + stem down to the cube's bottom corner),
    # right-hand arrow and small corner arrow.
    bottom = (cx, 405)
    i_dot = box(cx - 11, 258, cx + 11, 278)
    i_stem = box(cx - 11, 286, cx + 11, bottom[1])
    right_arrow = arrow(bottom, (568, 322), 16, 34, 40)
    corner_arrow = arrow((548, 205), (505, 168), 12, 26, 32)
    orange = unary_union([i_dot, i_stem, right_arrow, corner_arrow])

    # Navy: S and R plus the left arrow.
    s = fit_text("S", bold_font, 318, 238, 402, 345)
    r = fit_text("R", bold_font, 448, 250, 540, 345)
    left_arrow = arrow((cx - 16, bottom[1] - 8), (290, 318), 16, 34, 40)
    navy = unary_union([s, r, left_arrow]).difference(orange.buffer(3))
    blue = blue.difference(orange.buffer(3)).difference(navy.buffer(3))
    return navy, blue, orange


# ---------------------------------------------------------------------------
# Build 2D layout
# ---------------------------------------------------------------------------
def rounded_box(x0, y0, x1, y1, r):
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, resolution=16)


def build_layout():
    head_font = os.path.join(FONTS, "ArchivoBlack-Regular.ttf")
    tag_bold = static_montserrat(700, "Bold")
    tag_semi = static_montserrat(600, "SemiBold")

    outer = box(IMG_X0, IMG_Y0, IMG_X1, IMG_Y1)
    frame = outer.difference(box(228, 99, 1195, 586))
    panel = rounded_box(268, 125, 1150, 435, 10)

    sir = fit_text("S.I.R", head_font, 612, 142, 1128, 305)
    designs = fit_text("DESIGNS", head_font, 612, 335, 1132, 410)
    logo_navy, logo_blue, logo_orange = build_logo(head_font)

    line1 = fit_text("3D PRINTING & CUSTOM CREATIONS", tag_bold, 268, 462, 1135, 498)
    line2 = fit_text("Prototyping • Specialized Design • Manufacturing • End-Use Parts",
                     tag_semi, 268, 519, 1135, 544)

    holes = unary_union([Point(x, y).buffer(HOLE_D / 2 / SCALE, resolution=24)
                         for x in (248, 1175) for y in (116, 568)])

    return {
        "base": outer.difference(holes),
        "frame": frame,
        "panel": panel.difference(holes),
        "tagline": unary_union([line1, line2]),
        "relief_navy": unary_union([sir, designs, logo_navy]),
        "relief_blue": logo_blue,
        "relief_orange": logo_orange,
    }


def to_mm(geom):
    g = affinity.translate(geom, -IMG_X0, -IMG_Y1)
    return affinity.scale(g, SCALE, -SCALE, origin=(0, 0))


# ---------------------------------------------------------------------------
# 3D
# ---------------------------------------------------------------------------
def extrude(geom, z0, z1):
    geom = geom.buffer(0)
    polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    meshes = []
    for p in polys:
        if p.is_empty or p.area < 1e-3:
            continue
        m = trimesh.creation.extrude_polygon(p.simplify(0.01), z1 - z0)
        m.apply_translation((0, 0, z0))
        meshes.append(m)
    return trimesh.util.concatenate(meshes)


COLORS = {  # simplified palette (RGBA)
    "navy": (38, 66, 110, 255),
    "silver": (205, 208, 212, 255),
    "blue": (33, 140, 220, 255),
    "orange": (240, 125, 30, 255),
}


def build_meshes(layout):
    L = {k: to_mm(v) for k, v in layout.items()}
    top = BASE_T + PANEL_T
    silver_2d_frame = L["frame"]
    parts = {
        "navy": trimesh.util.concatenate([
            extrude(L["base"], 0, BASE_T),
            extrude(L["relief_navy"], top, top + RELIEF_T),
        ]),
        "silver": trimesh.util.concatenate([
            extrude(silver_2d_frame, BASE_T, BASE_T + FRAME_T),
            extrude(L["panel"], BASE_T, top),
            extrude(L["tagline"], BASE_T, BASE_T + TAGLINE_T),
        ]),
        "blue": extrude(L["relief_blue"], top, top + RELIEF_T),
        "orange": extrude(L["relief_orange"], top, top + RELIEF_T),
    }
    for name, m in parts.items():
        m.visual.face_colors = COLORS[name]
    return L, parts


def write_preview(L, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    from matplotlib.patches import PathPatch
    from matplotlib.path import Path

    def draw(ax, geom, color):
        polys = list(geom.geoms) if hasattr(geom, "geoms") else [geom]
        for p in polys:
            if p.is_empty:
                continue
            verts, codes = [], []
            for ring in [p.exterior, *p.interiors]:
                xy = np.asarray(ring.coords)
                verts += xy.tolist()
                codes += [Path.MOVETO] + [Path.LINETO] * (len(xy) - 2) + [Path.CLOSEPOLY]
            ax.add_patch(PathPatch(Path(verts, codes), facecolor=color, lw=0))

    c = {k: np.array(v[:3]) / 255 for k, v in COLORS.items()}
    fig, ax = plt.subplots(figsize=(11, 6), dpi=150)
    draw(ax, L["base"], c["navy"])
    draw(ax, L["frame"], c["silver"])
    draw(ax, L["panel"], c["silver"])
    draw(ax, L["tagline"], c["silver"])
    draw(ax, L["relief_navy"], c["navy"])
    draw(ax, L["relief_blue"], c["blue"])
    draw(ax, L["relief_orange"], c["orange"])
    ax.autoscale_view()
    ax.set_aspect("equal")
    ax.axis("off")
    fig.savefig(path, bbox_inches="tight", facecolor="white")


def main():
    layout = build_layout()
    L, parts = build_meshes(layout)
    for name, m in parts.items():
        m.export(os.path.join(OUT, f"sir_designs_{name}.stl"))
        print(f"{name:7s} watertight={m.is_watertight} "
              f"bounds={np.round(m.bounds, 2).tolist()}")
    scene = trimesh.Scene()
    for name, m in parts.items():
        scene.add_geometry(m, node_name=name, geom_name=name)
    scene.export(os.path.join(OUT, "sir_designs_sign.3mf"))
    combined = trimesh.util.concatenate(list(parts.values()))
    combined.export(os.path.join(OUT, "sir_designs_single_color.stl"))
    write_preview(L, os.path.join(OUT, "preview.png"))
    ext = combined.extents
    print(f"overall size: {ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm")


if __name__ == "__main__":
    main()
