"""Generated from motion-tokens.json by scripts/generate-motion-tokens.ts.

Theme module for offline cinematic clips. The renderer's own default
smooth() is a different sigmoid, so smooth() here overrides it with the
motion language's curve. Keep this file generated.
"""

STAGE_BACKGROUND = "#242D33"
STAGE_AXES = "#D9DADB"
STAGE_AXES_OPACITY = 0.45
STAGE_GRID_OPACITY = 0.08
STAGE_LABEL = "#FFFFFF"
STAGE_LABEL_SECONDARY = "#D9DADB"

ROLE_COLORS = {
    'state': '#58C4DD',
    'measurement': '#E8C11C',
    'action': '#B189C6',
    'value': '#A6CF8C',
    'constraint': '#FC6255',
    'reference': '#D9DADB',
    'highlight': '#C6FF19',
}

ROLE_ENCODINGS = {
    'state': "solid 2 px stroke",
    'measurement': "cross or dot markers",
    'action': "arrows, arrowheads",
    'value': "filled bars or areas",
    'constraint': "45 degree hatch fill",
    'reference': "dashed 1.5 px",
    'highlight': "underlay or halo, never a stroke on light",
}

UNCERTAINTY_FILL_ALPHA = 0.22

# Seconds. The beat ladder matches the web tokens exactly.
BEAT = 1.000
BEAT_SHORT = 0.500
BEAT_LONG = 2.000
INDICATE = 0.800
CREATE = 1.000
WRITE = 1.000

LAG_DEFAULT = 0.1
LAG_DENSE = 0.05
LAG_DENSE_THRESHOLD = 12

# Clip text. Every non-maths label is FONT_FAMILY, registered from
# FONT_FILE (relative to this module) so the render never depends on the
# fonts of the machine; LaTeX is for maths only.
FONT_FAMILY = "IBM Plex Sans"
FONT_FILE = "fonts/IBMPlexSans-wdth-wght.ttf"

# A clip frame is a stage CLIP_STAGE_PX wide drawn at the render size, so a
# length of s stage px spans s / CLIP_STAGE_PX of the frame width. Shown at
# least CLIP_STAGE_PX wide, the clip paints its labels at or above the stage
# type scale. Every size below is in those stage px.
CLIP_STAGE_PX = 299

TYPE_PX = {
    'label': 14,
    'axis': 14,
    'tick': 14,
}

STROKE_PX = {
    'trace': 2,
    'reference': 1.5,
    'structure': 1,
}

DASH_PX = (6, 3)
TICK_LENGTH_PX = 7

MARKER_RADIUS_PX = {
    'single': 4,
    'dense': 1,
}


def smooth(t: float) -> float:
    """The motion language's eased-motion curve, overriding the renderer default."""
    t = min(1.0, max(0.0, t))
    return t ** 3 * (10 * (1 - t) ** 2 + 5 * t * (1 - t) + t ** 2)


def there_and_back(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return smooth(2 * t) if t < 0.5 else smooth(2 - 2 * t)
