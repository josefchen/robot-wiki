"""Text, strokes and marks for offline clips, all read from motion_theme.

A clip scene names what it draws (a colour role, a type size, a stroke
kind) and this module turns the names into renderer values, so a scene
file carries no colour, font or size of its own.
"""

import contextlib
import pathlib

import manimpango
from manim import (
    Arrow,
    CapStyleType,
    DashedVMobject,
    Dot,
    LineJointType,
    Text,
    VMobject,
    config,
)
from manim.mobject.text.text_mobject import register_font

import motion_theme as theme

# Renderer constants of the pinned manim: a Text em is font_size / 72 scene
# units tall, and a stroke_width of w paints w / 100 scene units wide.
_EM_UNITS_PER_FONT_SIZE = 1 / 72
_STROKE_UNITS_PER_WIDTH = 0.01

FONT_PATH = pathlib.Path(theme.__file__).resolve().parent / theme.FONT_FILE


def units(stage_px):
    """Scene units spanned by a length given in stage px."""
    return stage_px * config.frame_width / theme.CLIP_STAGE_PX


def stage_px(scene_units):
    """The inverse of units()."""
    return scene_units * theme.CLIP_STAGE_PX / config.frame_width


def font_size(size):
    """The renderer font size of a stage type size: 'label', 'axis' or 'tick'."""
    return units(theme.TYPE_PX[size]) / _EM_UNITS_PER_FONT_SIZE


@contextlib.contextmanager
def clip_font():
    """Register the vendored family with Pango for the duration of a scene."""
    with register_font(str(FONT_PATH)):
        if theme.FONT_FAMILY not in manimpango.list_fonts():
            raise RuntimeError(f"{theme.FONT_FAMILY} did not register from {FONT_PATH}")
        yield


def colour(tone):
    """A role's stage colour, the stage text colours 'label' and 'secondary', or 'axes'."""
    if tone == "label":
        return theme.STAGE_LABEL
    if tone == "secondary":
        return theme.STAGE_LABEL_SECONDARY
    if tone == "axes":
        return theme.STAGE_AXES
    return theme.ROLE_COLORS[tone]


def text(content, *, size="label", tone="label"):
    """A label in the clip family at a stage type size."""
    return Text(
        content,
        font=theme.FONT_FAMILY,
        font_size=font_size(size),
        color=colour(tone),
    )


def baseline(label):
    """The label's baseline height: the median glyph bottom, so a descender
    or a round overshoot does not move it."""
    bottoms = sorted(glyph.get_bottom()[1] for glyph in label.submobjects)
    return bottoms[len(bottoms) // 2]


def x_middle(label):
    """Halfway up the label's x-height, in stage px: the lowest glyph top is
    an x-height letter in any lowercase word."""
    top = min(glyph.get_top()[1] for glyph in label.submobjects)
    return stage_px((baseline(label) + top) / 2)


def place(label, x, baseline_px, *, edge=0):
    """Put a label's baseline at a stage px height; edge -1, 0 or 1 pins its
    left edge, centre or right edge to x (stage px)."""
    dx = units(x) - (label.get_center()[0] + edge * label.width / 2)
    label.shift([dx, units(baseline_px) - baseline(label), 0])
    return label


def arrow(start, end, tone):
    """A straight arrow at the trace width with a tick-length head."""
    head = Arrow(
        start,
        end,
        buff=0,
        tip_length=units(theme.TICK_LENGTH_PX),
        max_tip_length_to_length_ratio=1,
        max_stroke_width_to_length_ratio=1000,
    )
    stroke(head, "trace", tone)
    head.get_tip().set_fill(colour(tone), opacity=1).set_stroke(width=0)
    return head


def stroke(mobject, kind, tone, *, opacity=1.0):
    """Stroke a mobject at a theme width ('trace', 'reference', 'structure')."""
    mobject.set_stroke(
        color=colour(tone),
        width=units(theme.STROKE_PX[kind]) / _STROKE_UNITS_PER_WIDTH,
        opacity=opacity,
    )
    # Round joins: a miter join on a jagged trace draws spikes past the data.
    mobject.joint_type = LineJointType.ROUND
    mobject.cap_style = CapStyleType.ROUND
    return mobject


def structure(mobject):
    """Axes and guides: the structure width in the stage axes colour."""
    return stroke(mobject, "structure", "axes", opacity=theme.STAGE_AXES_OPACITY)


def trace(points, kind, tone):
    """One polyline through the given points, stroked at a theme width."""
    line = VMobject()
    line.set_points_as_corners(points)
    return stroke(line, kind, tone)


def dashed(vmobject):
    """The reference dash pattern along a stroked path."""
    on, off = theme.DASH_PX
    count = max(1, round(vmobject.get_arc_length() / units(on + off)))
    dashes = DashedVMobject(vmobject, num_dashes=count, dashed_ratio=on / (on + off))
    for dash in dashes:
        dash.joint_type = LineJointType.ROUND
        dash.cap_style = CapStyleType.BUTT
    return dashes


def marker(point, tone, *, dense=False):
    """A dot marker: the lone size, or the smaller size of a dense series."""
    radius = theme.MARKER_RADIUS_PX["dense" if dense else "single"]
    return Dot(point, radius=units(radius), color=colour(tone))


def indicate(mobject, *, grow=True):
    """The Indicate target: the highlight role, and the web primitive's 1.2
    pulse unless the mark must keep its geometry. Play it with
    rate_func=there_and_back over theme.INDICATE so it returns unchanged."""
    target = mobject.animate.set_color(colour("highlight"))
    return target.scale(1.2) if grow else target


def fill(mobject, tone):
    """Uncertainty: the object's hue at the theme alpha, no stroke."""
    return mobject.set_fill(colour(tone), opacity=theme.UNCERTAINTY_FILL_ALPHA).set_stroke(width=0)
