"""Generated from motion-tokens.json by scripts/generate-motion-tokens.ts.

Theme module for offline cinematic clips. The renderer's own default
smooth() is a different sigmoid, so smooth() here overrides it with the
motion language's curve. Keep this file generated.
"""

STAGE_BACKGROUND = "#FFFFFF"
STAGE_AXES = "#1C1C1A"
STAGE_AXES_OPACITY = 1
STAGE_GRID_OPACITY = 1
STAGE_LABEL = "#1C1C1A"
STAGE_LABEL_SECONDARY = "#6C6B66"

ROLE_COLORS = {
    'state': '#1C1C1A',
    'measurement': '#3F3F3B',
    'action': '#1C1C1A',
    'value': '#3F3F3B',
    'constraint': '#1C1C1A',
    'reference': '#A3A39E',
    'highlight': '#3B6EA8',
}

ROLE_ENCODINGS = {
    'state': "solid 1.5 px stroke",
    'measurement': "cross or dot markers",
    'action': "arrows, arrowheads",
    'value': "filled bars or areas",
    'constraint': "45 degree hatch fill",
    'reference': "dashed 1 px",
    'highlight': "the one accent: the highlighted series, its marker and its plain note, never a control fill",
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
    'label': 12,
    'axis': 12,
    'tick': 11,
}

STROKE_PX = {
    'trace': 1.5,
    'reference': 1,
    'structure': 0.75,
}

DASH_PX = (4, 2)
TICK_LENGTH_PX = 5.5

MARKER_RADIUS_PX = {
    'single': 3,
    'dense': 0.75,
}


def smooth(t: float) -> float:
    """The motion language's eased-motion curve, overriding the renderer default."""
    t = min(1.0, max(0.0, t))
    return t ** 3 * (10 * (1 - t) ** 2 + 5 * t * (1 - t) + t ** 2)


def there_and_back(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return smooth(2 * t) if t < 0.5 else smooth(2 - 2 * t)
