"""Cinematic clip: one Kalman filter over a whole run.

The pilot tier-(b) clip of the motion language. Every number on screen
comes from scripts/motion/data/kalman-episode.json, which the TypeScript
filter in lib/kalman.ts exports (seed 1, matched noise beliefs). Every
colour, font and size comes from scripts/motion/motion_theme.py, generated
from motion-tokens.json, through clip_kit. The beat durations are read
from motion-clips.json so the render, the WebVTT cues and the page
registry share one timeline.

The frame is a legend row and one note over the run. The native video
controls and their scrim cover the bottom of the frame whenever the clip
is paused, ended or showing its poster (the bottom quarter at desktop
widths, half at phone widths), so no label sits there and the run ends
above it. The last beat points the note at the widest stretch of the
band, where the sensor went quiet; the final frame is also the poster, so
the page shows the note before anyone plays the clip. Nothing here runs
at build or deploy time.
"""

import json
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "motion"))

import clip_kit as kit  # noqa: E402
import motion_theme as theme  # noqa: E402

from manim import (  # noqa: E402
    Create,
    FadeIn,
    LaggedStart,
    Line,
    Polygon,
    Scene,
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
# The clip draws RUN_STEPS steps of the seeded episode from RUN_START on.
# That stretch holds the episode's longest run of missing readings (four
# in a row), so the band visibly fans out where the note points.
RUN_START = 300
RUN_STEPS = 240
TWO_SIGMA = 2.0

# Layout in stage px on the stage the frame stands for (CLIP_STAGE_PX wide,
# origin at the centre, y up). The run's 2-sigma band reaches 8.27 in the
# drawn steps, so +-8.5 holds the whole band, not just its mean.
EDGE = 137.5
LEGEND_BASELINE = 64
NOTE_BASELINE = 45
LEGEND_GAP = 12
SWATCH = 15
SWATCH_GAP = 4
PLOT_TOP = 35
PLOT_BOTTOM = -48
POSITION_SPAN = 8.5
# Clear space between the note, its arrow and the marks around them.
CLEARANCE = 3
# The note's gap must miss at least this many readings in a row.
MIN_GAP = 2

NOTE = "No readings, so the band widens: less sure"


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
    return -EDGE + 2 * EDGE * (step - RUN_START) / RUN_STEPS


def _plot_y(position):
    span = (position + POSITION_SPAN) / (2 * POSITION_SPAN)
    return PLOT_BOTTOM + span * (PLOT_TOP - PLOT_BOTTOM)


def _plot(step, position):
    return _point(_plot_x(step), _plot_y(position))


def _legend(row, entries):
    """One legend row, laid out once so an item appearing later never shifts
    the others. A swatch builder gets the swatch's left edge and the label's
    x-height middle, both in stage px."""
    items = []
    cursor = -EDGE
    for swatch, word in entries:
        label = kit.text(word)
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


def _widest_gap(sigma, measurements):
    """The run's widest band and the readings on either side of it.

    Returns the last step with a reading before the widest band, the widest
    step, and the first step with a reading after it. Every step strictly
    between the two readings has none, which is what the note says."""
    run = range(RUN_START + 1, RUN_START + RUN_STEPS)
    widest = max(run, key=lambda t: sigma[t])
    before = max(t for t in range(RUN_START, widest) if measurements[t] is not None)
    after = min(t for t in range(widest + 1, RUN_START + RUN_STEPS + 1) if measurements[t] is not None)
    assert after - before - 1 >= MIN_GAP, "the widest band does not sit in a run of missing readings"
    return before, widest, after


class KalmanEpisode(Scene):
    def construct(self):
        with kit.clip_font():
            self._episode()

    def _episode(self):
        data, clip = _load()
        beats = [beat["durationMs"] / 1000.0 for beat in clip["beats"]]
        assert len(beats) == 4, "the clip draws four beats; the manifest lists another count"
        steps = range(RUN_START, RUN_START + RUN_STEPS + 1)
        truth = data["truth"]
        measurements = data["measurements"]
        est = [frame["est"] for frame in data["frames"]]
        sigma = [frame["sigma"] for frame in data["frames"]]

        def marks_at(t):
            """Every position drawn at step t: truth, band edges, reading."""
            values = [truth[t], est[t] + TWO_SIGMA * sigma[t], est[t] - TWO_SIGMA * sigma[t]]
            if measurements[t] is not None:
                values.append(measurements[t])
            return values

        reach = max(abs(value) for t in steps for value in marks_at(t))
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

        # ---- the legend row and the note's place -------------------------
        truth_item, readings_item, track_item = _legend(
            LEGEND_BASELINE,
            [
                (_dash_swatch, "true path"),
                (_dot_swatch, "readings"),
                (_band_swatch, "filter's track"),
            ],
        )
        assert kit.stage_px(track_item.get_right()[0]) <= EDGE, "the legend runs off the stage"
        note = kit.place(kit.text(NOTE, tone="highlight"), -EDGE, NOTE_BASELINE, edge=-1)
        assert kit.stage_px(note.get_right()[0]) <= EDGE, "the note runs off the stage"
        note_top = kit.stage_px(note.get_top()[1])
        note_bottom = kit.stage_px(note.get_bottom()[1])
        legend_bottom = min(kit.stage_px(item.get_bottom()[1]) for item in (truth_item, readings_item, track_item))
        assert legend_bottom - note_top >= CLEARANCE, "the note crowds the legend"
        dot_radius = theme.MARKER_RADIUS_PX["dense"]
        top_mark = max(_plot_y(value) for t in steps for value in marks_at(t)) + dot_radius
        assert note_bottom - top_mark >= CLEARANCE, "the note sits on the run"

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
        play(FadeIn(truth_item), run_time=0.5)
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

        # ---- beat 3: the filter's track over the whole run ----------------
        play(FadeIn(track_item), run_time=0.4)
        tracker = ValueTracker(steps.start + 1)

        def reached():
            return max(steps.start + 1, min(steps.stop - 1, int(round(tracker.get_value()))))

        def drawn():
            return range(steps.start, reached() + 1)

        def estimate_band():
            upper = [_plot(t, est[t] + TWO_SIGMA * sigma[t]) for t in drawn()]
            lower = [_plot(t, est[t] - TWO_SIGMA * sigma[t]) for t in reversed(drawn())]
            return kit.fill(Polygon(*upper, *lower), "state")

        def estimate_curve():
            return kit.trace([_plot(t, est[t]) for t in drawn()], "trace", "state")

        def estimate_tip():
            return kit.marker(_plot(reached(), est[reached()]), "state")

        band = always_redraw(estimate_band).set_z_index(-1)
        curve = always_redraw(estimate_curve).set_z_index(1)
        tip = always_redraw(estimate_tip).set_z_index(2)
        self.add(band, curve, tip)
        # Simulation time runs linear in model time: never eased.
        play(tracker.animate.set_value(steps.stop - 1), run_time=4.9, rate_func=linear)
        for mobject in (band, curve, tip):
            mobject.clear_updaters()
        rest(beats[2])

        # ---- beat 4: the note at the widest gap ---------------------------
        # The band between the last reading before the gap and the first one
        # after it takes the highlight tint: the fan the note explains.
        before, widest, after = _widest_gap(sigma, measurements)
        gap = range(before, after + 1)
        fan = kit.fill(
            Polygon(
                *(_plot(t, est[t] + TWO_SIGMA * sigma[t]) for t in gap),
                *(_plot(t, est[t] - TWO_SIGMA * sigma[t]) for t in reversed(gap)),
            ),
            "highlight",
        ).set_z_index(-0.5)
        # The arrow drops from the note to just above every mark its head
        # could touch, so it points at the fan without covering data.
        x_gap = (_plot_x(before) + _plot_x(after)) / 2
        beside = [t for t in steps if abs(_plot_x(t) - x_gap) <= theme.TICK_LENGTH_PX]
        clear_top = max(_plot_y(value) for t in beside for value in marks_at(t)) + dot_radius
        arrow_top = note_bottom - CLEARANCE
        arrow_tip = clear_top + CLEARANCE
        assert arrow_top - arrow_tip >= 2 * theme.TICK_LENGTH_PX, "the note's arrow has no shaft"
        arrow = kit.arrow(_point(x_gap, arrow_top), _point(x_gap, arrow_tip), "highlight")
        play(FadeIn(note), run_time=0.4)
        play(Create(arrow), FadeIn(fan), run_time=0.6)
        rest(beats[3])
