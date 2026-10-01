"""Cinematic clip: one Kalman filter over a whole run.

The pilot tier-(b) clip of the motion language. Every number on screen
comes from scripts/motion/data/kalman-episode.json, which the TypeScript
filter in lib/kalman.ts exports (seed 1, matched noise beliefs). Every
colour, font and size comes from scripts/motion/motion_theme.py, generated
from motion-tokens.json, through clip_kit. The beat durations are read
from motion-clips.json so the render, the WebVTT cues and the page
registry share one timeline.

The frame is a legend band over the run. The native video controls and
their scrim cover the bottom of the frame whenever the clip is paused,
ended or showing its poster (the bottom quarter at desktop widths, half
at phone widths), so no label sits there and the run ends above it. The
fusion beat clears the run and draws the seeded update as two beliefs on
one line, labelled from above. Nothing here runs at build or deploy time.
"""

import json
import math
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "motion"))

import clip_kit as kit  # noqa: E402
import motion_theme as theme  # noqa: E402

from manim import (  # noqa: E402
    Create,
    FadeIn,
    FadeOut,
    LaggedStart,
    Line,
    Polygon,
    Scene,
    Transform,
    VGroup,
    ValueTracker,
    always_redraw,
    config,
    linear,
)

# The motion language's easing overrides the renderer default everywhere
# eased motion appears; simulation time stays linear.
EASE = theme.smooth

CLIP_ID = "kalman-episode"
RUN_STEPS = 240
TWO_SIGMA = 2.0

# Layout in stage px on the stage the frame stands for (CLIP_STAGE_PX wide,
# origin at the centre, y up). The run's 2-sigma band reaches 6.27 in the
# first RUN_STEPS steps, so +-6.5 holds the whole band, not just its mean.
EDGE = 137.5
LEGEND_BASELINES = (64, 45)
LEGEND_GAP = 12
SWATCH = 15
SWATCH_GAP = 4
PLOT_TOP = 35
PLOT_BOTTOM = -48
POSITION_SPAN = 6.5

# The fusion close-up, also in stage px. The offsets are an explanatory
# layout, not model values: the seeded gain places the posterior on the
# predicted-to-reading segment and the seeded sigma ratio narrows it.
FUSION_LINE = -12
PREDICTED_X = -84
READING_X = 76
PREDICTED_SIGMA = 20
PREDICTED_PEAK = 34
ABOVE_GAP = 8
CLEARANCE = 3
# A belief's curve is drawn out to this many sigmas, where it has fallen
# below 4% of its peak.
BUMP_REACH = 2.6


def _load():
    data = json.loads(
        (REPO_ROOT / "scripts" / "motion" / "data" / "kalman-episode.json").read_text()
    )
    manifest = json.loads((REPO_ROOT / "motion-clips.json").read_text())
    clip = next(entry for entry in manifest["clips"] if entry["id"] == CLIP_ID)
    return data, clip


def _point(x_px, y_px):
    return [kit.units(x_px), kit.units(y_px), 0]


def _plot_x(step):
    return -EDGE + 2 * EDGE * step / RUN_STEPS


def _plot_y(position):
    span = (position + POSITION_SPAN) / (2 * POSITION_SPAN)
    return PLOT_BOTTOM + span * (PLOT_TOP - PLOT_BOTTOM)


def _plot(step, position):
    return _point(_plot_x(step), _plot_y(position))


def _bump_height(mean_px, sigma_px, peak_px, x_px):
    return peak_px * math.exp(-0.5 * ((x_px - mean_px) / sigma_px) ** 2)


def _bump(mean_px, sigma_px, peak_px):
    """A belief on the fusion line: its curve and the filled area under it."""
    xs = [mean_px + sigma_px * (i / 30 - 1) * BUMP_REACH for i in range(61)]
    curve = [
        _point(x, FUSION_LINE + _bump_height(mean_px, sigma_px, peak_px, x)) for x in xs
    ]
    area = kit.fill(
        Polygon(*curve, _point(xs[-1], FUSION_LINE), _point(xs[0], FUSION_LINE)),
        "state",
    )
    edge = kit.dashed(kit.trace(curve, "reference", "state"))
    return VGroup(area, edge)


def _clear_of(label, *beliefs):
    """Fail the render if a fusion label touches a belief curve it spans
    (each belief a mean, sigma, peak triple) or a marker on the line."""
    left = kit.stage_px(label.get_left()[0])
    right = kit.stage_px(label.get_right()[0])
    bottom = kit.stage_px(label.get_bottom()[1])
    floor = FUSION_LINE + theme.MARKER_RADIUS_PX["single"]
    for mean, sigma, peak in beliefs:
        nearest = min(max(mean, left), right)
        floor = max(floor, FUSION_LINE + _bump_height(mean, sigma, peak, nearest))
    assert bottom - floor >= CLEARANCE, "a fusion label collides with the marks below it"
    return label


def _legend(row, entries):
    """One legend row, laid out once so an item appearing later never shifts
    the others. A swatch builder gets the swatch's left edge and the label's
    x-height middle, both in stage px."""
    items = []
    cursor = -EDGE
    for swatch, word in entries:
        label = kit.text(word)
        if swatch is None:
            kit.place(label, cursor, row, edge=-1)
            items.append(label)
        else:
            kit.place(label, cursor + SWATCH + SWATCH_GAP, row, edge=-1)
            items.append(VGroup(swatch(cursor, kit.x_middle(label)), label))
        cursor = kit.stage_px(label.get_right()[0]) + LEGEND_GAP
    return items


def _dash_swatch(left, mid):
    line = Line(_point(left, mid), _point(left + SWATCH, mid))
    return kit.dashed(kit.stroke(line, "reference", "reference"))


def _dot_swatch(left, mid):
    return kit.marker(_point(left + SWATCH / 2, mid), "measurement")


def _band_swatch(left, mid):
    half = theme.TYPE_PX["label"] / 3
    band = kit.fill(
        Polygon(
            _point(left, mid - half), _point(left + SWATCH, mid - half),
            _point(left + SWATCH, mid + half), _point(left, mid + half),
        ),
        "state",
    )
    line = kit.stroke(Line(_point(left, mid), _point(left + SWATCH, mid)), "trace", "state")
    return VGroup(band, line)


class KalmanEpisode(Scene):
    def construct(self):
        with kit.clip_font():
            self._episode()

    def _episode(self):
        data, clip = _load()
        beats = [beat["durationMs"] / 1000.0 for beat in clip["beats"]]
        steps = range(RUN_STEPS + 1)
        truth = data["truth"]
        measurements = data["measurements"]
        est = [frame["est"] for frame in data["frames"]]
        sigma = [frame["sigma"] for frame in data["frames"]]
        focus = data["focus"]
        reach = max(
            [abs(truth[t]) for t in steps]
            + [abs(measurements[t]) for t in steps if measurements[t] is not None]
            + [abs(est[t]) + TWO_SIGMA * sigma[t] for t in steps]
        )
        assert reach < POSITION_SPAN, "the run exceeds the plot's vertical bounds"

        self.camera.background_color = theme.STAGE_BACKGROUND
        fps = config.frame_rate
        beat_end = [0.0]

        def play(*animations, run_time, rate_func=EASE, **kwargs):
            self.play(*animations, run_time=run_time, rate_func=rate_func, **kwargs)

        def frames():
            return round(self.renderer.time * fps)

        def rest(duration):
            """Hold the still frame to the beat's end on the manifest timeline.

            The renderer rounds every animation and wait to whole frames on
            its own, so the hold is counted against the frames already
            written; otherwise beats drift early and the WebVTT cues and the
            beat stills fall out of step with the picture."""
            beat_end[0] += duration
            target = round(beat_end[0] * fps)
            hold = target - frames()
            assert hold >= 0, "a beat overran its manifest duration"
            if hold:
                # A frozen wait writes int(duration * fps) frames.
                self.wait((hold + 0.5) / fps, frozen_frame=True)
            assert frames() == target

        # ---- the run's legend band ----------------------------------------
        # The run's length stands in the band, not on a bottom axis, which
        # the paused controls would cover.
        length_note = kit.place(
            kit.text(f"{RUN_STEPS} steps", size="axis", tone="secondary"),
            EDGE, LEGEND_BASELINES[1], edge=1,
        )
        truth_item, readings_item, estimate_item = _legend(
            LEGEND_BASELINES[0],
            [(_dash_swatch, "truth"), (_dot_swatch, "readings"), (_band_swatch, "estimate")],
        )
        predict_item, update_item = _legend(
            LEGEND_BASELINES[1], [(None, "predict widens"), (None, "update narrows")]
        )
        assert (
            kit.stage_px(length_note.get_left()[0] - update_item.get_right()[0]) >= LEGEND_GAP
        ), "the run-length note crowds the second legend row"
        truth_dashes = kit.dashed(
            kit.trace([_plot(t, truth[t]) for t in steps], "reference", "reference")
        )
        dots = VGroup(
            *(
                kit.marker(_plot(t, measurements[t]), "measurement", dense=True)
                for t in steps
                if measurements[t] is not None
            )
        )

        # ---- beat 1: the wandering target --------------------------------
        play(FadeIn(truth_item), FadeIn(length_note), run_time=0.5)
        # Steps appear at a constant rate: the reveal is model time.
        play(
            LaggedStart(
                *(Create(dash, rate_func=EASE) for dash in truth_dashes),
                lag_ratio=theme.LAG_DENSE,
            ),
            run_time=1.6,
            rate_func=linear,
        )
        rest(beats[0])

        # ---- beat 2: the sensor -------------------------------------------
        play(FadeIn(readings_item), run_time=0.3)
        play(
            LaggedStart(
                *(FadeIn(dot, scale=0.6, rate_func=EASE) for dot in dots),
                lag_ratio=theme.LAG_DENSE,
            ),
            run_time=2.2,
            rate_func=linear,
        )
        rest(beats[1])

        # ---- beat 3: one fusion up close ----------------------------------
        ratio = focus["posterior"]["sigma"] / focus["predicted"]["sigma"]
        posterior_x = PREDICTED_X + focus["gain"] * (READING_X - PREDICTED_X)
        posterior_sigma = PREDICTED_SIGMA * ratio
        posterior_peak = PREDICTED_PEAK / ratio
        beliefs = (
            (PREDICTED_X, PREDICTED_SIGMA, PREDICTED_PEAK),
            (posterior_x, posterior_sigma, posterior_peak),
        )
        dot_radius = theme.MARKER_RADIUS_PX["single"]
        on_line = FUSION_LINE + dot_radius + ABOVE_GAP
        fusion_line = kit.structure(Line(_point(-EDGE, FUSION_LINE), _point(EDGE, FUSION_LINE)))
        predicted = _bump(*beliefs[0])
        posterior = _bump(*beliefs[1])
        predicted_dot = kit.marker(_point(PREDICTED_X, FUSION_LINE), "state")
        reading_dot = kit.marker(_point(READING_X, FUSION_LINE), "measurement")
        posterior_dot = kit.marker(_point(posterior_x, FUSION_LINE), "state")
        predicted_label = _clear_of(
            kit.place(
                kit.text("predicted", tone="state"),
                PREDICTED_X, FUSION_LINE + PREDICTED_PEAK + ABOVE_GAP,
            ),
            *beliefs,
        )
        posterior_label = _clear_of(
            kit.place(
                kit.text("posterior", tone="state"),
                posterior_x, FUSION_LINE + posterior_peak + ABOVE_GAP,
            ),
            *beliefs,
        )
        assert (
            kit.stage_px(config.frame_height / 2 - posterior_label.get_top()[1]) >= ABOVE_GAP
        ), "the posterior label leaves the top of the frame"
        # The reading label runs right from its dot: centred, it would
        # meet the posterior's flank.
        reading_label = _clear_of(
            kit.place(
                kit.text("reading z", tone="measurement"),
                READING_X - dot_radius, on_line, edge=-1,
            ),
            *beliefs,
        )
        gain_arrow = kit.arrow(
            _point(PREDICTED_X + dot_radius, FUSION_LINE),
            _point(posterior_x - dot_radius, FUSION_LINE),
            "label",
        )
        # Centred on the gap between the two drawn curves.
        gap_centre = (
            PREDICTED_X + BUMP_REACH * PREDICTED_SIGMA + posterior_x - BUMP_REACH * posterior_sigma
        ) / 2
        gain_label = _clear_of(kit.place(kit.text("gain K"), gap_centre, on_line), *beliefs)

        # The run leaves before the close-up, so no unrelated mark sits
        # under the two beliefs.
        run_art = VGroup(length_note, truth_item, readings_item, truth_dashes, dots)
        play(FadeOut(run_art), run_time=0.25)
        play(
            Create(fusion_line), FadeIn(predicted), FadeIn(predicted_dot),
            FadeIn(predicted_label), run_time=0.45,
        )
        play(FadeIn(reading_dot), FadeIn(reading_label), run_time=0.3)
        narrowing = predicted.copy()
        self.add(narrowing)
        play(
            Transform(narrowing, posterior), Create(gain_arrow), FadeIn(posterior_dot),
            run_time=0.6,
        )
        play(FadeIn(posterior_label), FadeIn(gain_label), run_time=0.3)
        play(kit.indicate(narrowing), run_time=theme.INDICATE, rate_func=theme.there_and_back)
        rest(beats[2])

        # ---- beat 4: the whole run ----------------------------------------
        closeup = VGroup(
            fusion_line, predicted, predicted_dot, predicted_label, reading_dot,
            reading_label, narrowing, posterior_dot, posterior_label, gain_arrow,
            gain_label,
        )
        play(FadeOut(closeup), run_time=0.3)
        play(FadeIn(run_art), FadeIn(estimate_item), run_time=0.4)

        tracker = ValueTracker(1)

        def reached():
            return max(1, min(RUN_STEPS, int(round(tracker.get_value()))))

        def estimate_band():
            span = range(reached() + 1)
            upper = [_plot(t, est[t] + TWO_SIGMA * sigma[t]) for t in span]
            lower = [_plot(t, est[t] - TWO_SIGMA * sigma[t]) for t in reversed(span)]
            return kit.fill(Polygon(*upper, *lower), "state")

        def estimate_curve():
            return kit.trace([_plot(t, est[t]) for t in range(reached() + 1)], "trace", "state")

        def estimate_tip():
            return kit.marker(_plot(reached(), est[reached()]), "state")

        band = always_redraw(estimate_band).set_z_index(-1)
        curve = always_redraw(estimate_curve).set_z_index(1)
        tip = always_redraw(estimate_tip).set_z_index(2)
        self.add(band, curve, tip)
        # Simulation time runs linear in model time: never eased.
        play(tracker.animate.set_value(RUN_STEPS), run_time=4.9, rate_func=linear)
        for mobject in (band, curve, tip):
            mobject.clear_updaters()
        rest(beats[3])

        # ---- beat 5: the recursion ----------------------------------------
        play(FadeIn(predict_item), FadeIn(update_item), run_time=0.4)
        # The band keeps its geometry: it is the data the two labels name.
        play(
            kit.indicate(band, grow=False),
            kit.indicate(predict_item),
            kit.indicate(update_item),
            run_time=theme.INDICATE,
            rate_func=theme.there_and_back,
        )
        rest(beats[4])
