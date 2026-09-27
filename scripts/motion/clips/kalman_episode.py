"""Cinematic clip: one Kalman filter over a whole run.

The pilot tier-(b) clip of the motion language. Every number on screen
comes from scripts/motion/data/kalman-episode.json, which the TypeScript
filter in lib/kalman.ts exports (seed 1, matched noise beliefs); the
visual language comes from scripts/motion/motion_theme.py, generated from
motion-tokens.json. The beat durations are read from motion-clips.json so
the render, the WebVTT cues and the page registry share one timeline.

Annotations occupy a separate rail and the fusion beat clears the
whole-run traces before focusing the actual seeded update. Nothing here
runs at build or deploy time.
"""

import json
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT / "scripts" / "motion"))

import motion_theme as theme  # noqa: E402

from manim import (  # noqa: E402
    DOWN,
    LEFT,
    RIGHT,
    UL,
    Axes,
    Create,
    DashedVMobject,
    Dot,
    Ellipse,
    FadeIn,
    FadeOut,
    LaggedStart,
    Line,
    MathTex,
    MovingCameraScene,
    Polygon,
    Text,
    UP,
    VGroup,
    VMobject,
    ValueTracker,
    always_redraw,
    linear,
)

# The motion language's easing overrides the renderer default everywhere
# eased motion appears; simulation time stays linear.
EASE = theme.smooth

CLIP_ID = "kalman-episode"
RUN_STEPS = 240
# The seeded episode reaches -10.02 at the lower two-sigma boundary.
# Its full band must fit, not merely its mean.
Y_SPAN = 11.5
TWO_SIGMA = 2.0


def _load():
    data = json.loads(
        (REPO_ROOT / "scripts" / "motion" / "data" / "kalman-episode.json").read_text()
    )
    manifest = json.loads((REPO_ROOT / "motion-clips.json").read_text())
    clip = next(entry for entry in manifest["clips"] if entry["id"] == CLIP_ID)
    return data, clip


def _polyline(points):
    line = VMobject()
    if len(points) >= 2:
        line.set_points_as_corners(points)
    return line


class KalmanEpisode(MovingCameraScene):
    def construct(self):
        data, clip = _load()
        beats = [beat["durationMs"] / 1000.0 for beat in clip["beats"]]

        truth = data["truth"]
        measurements = data["measurements"]
        frames = data["frames"]
        est = [frame["est"] for frame in frames]
        sigma = [frame["sigma"] for frame in frames]
        focus = data["focus"]
        assert max(
            abs(value)
            for values in (
                truth,
                (value for value in measurements if value is not None),
                (frame["est"] + sign * TWO_SIGMA * frame["sigma"]
                 for frame in frames for sign in (-1, 1)),
            )
            for value in values
        ) < Y_SPAN, "the episode exceeds the plot's vertical bounds"

        self.camera.background_color = theme.STAGE_BACKGROUND

        state_c = theme.ROLE_COLORS["state"]
        measurement_c = theme.ROLE_COLORS["measurement"]
        reference_c = theme.ROLE_COLORS["reference"]
        highlight_c = theme.ROLE_COLORS["highlight"]

        axes = Axes(
            x_range=[0, RUN_STEPS, 60],
            y_range=[-Y_SPAN, Y_SPAN, 5],
            x_length=8.8,
            y_length=4.3,
            tips=False,
            axis_config={"stroke_width": 1.5, "include_ticks": True, "tick_size": 0.035},
        )
        axes.shift(LEFT * 0.9 + DOWN * 0.7)
        axes.set_stroke(color=theme.STAGE_AXES, opacity=theme.STAGE_AXES_OPACITY)
        rail_x = 4.45

        def rail_label(text, color, y, anchor, *, dashed=False):
            """A label outside the plotting region, attached to its mark."""
            label = Text(text, font_size=35, color=color).move_to([rail_x, y, 0])
            leader = Line(anchor, label.get_left() + LEFT * 0.12)
            leader.set_stroke(color=color, width=1.2, opacity=0.8)
            if dashed:
                leader = DashedVMobject(leader, num_dashes=4)
            return VGroup(leader, label)

        title = Text(clip["title"], font_size=32, color=theme.STAGE_LABEL)
        title.to_corner(UL, buff=0.45)

        truth_curve = _polyline(
            [axes.c2p(t, truth[t]) for t in range(RUN_STEPS + 1)]
        ).set_stroke(color=reference_c, width=2.2)
        truth_dashes = DashedVMobject(truth_curve, num_dashes=72)
        truth_label = rail_label(
            "truth", reference_c, 0.82, axes.c2p(RUN_STEPS, truth[-1]), dashed=True
        )

        measured_steps = [t for t in range(RUN_STEPS + 1) if measurements[t] is not None]
        dots = [
            Dot(axes.c2p(t, measurements[t]), radius=0.045, color=measurement_c)
            for t in measured_steps
        ]
        final_reading = measured_steps[-1]
        readings_label = rail_label(
            "readings",
            measurement_c,
            0.15,
            axes.c2p(final_reading, measurements[final_reading]),
        )

        spent = [0.0]

        def play(*animations, run_time, rate_func=EASE, **kwargs):
            spent[0] += run_time
            self.play(*animations, run_time=run_time, rate_func=rate_func, **kwargs)

        def rest(budget):
            """Hold the still frame for whatever remains of the beat."""
            remaining = budget - spent[0]
            if remaining > 1e-6:
                self.wait(remaining)

        # ---- beat 1: the wandering target --------------------------------
        play(Create(axes), run_time=0.7)
        play(FadeIn(title), run_time=0.3)
        play(
            LaggedStart(
                *(Create(dash) for dash in truth_dashes),
                lag_ratio=theme.LAG_DENSE,
            ),
            run_time=1.4,
        )
        play(FadeIn(truth_label), run_time=0.3)
        rest(beats[0])

        # ---- beat 2: the sensor -------------------------------------------
        spent[0] = 0.0
        play(
            LaggedStart(
                *(FadeIn(dot, scale=0.6) for dot in dots),
                lag_ratio=theme.LAG_DENSE,
            ),
            run_time=2.3,
        )
        play(FadeIn(readings_label), run_time=0.4)
        rest(beats[1])

        # ---- beat 3: one fusion up close ----------------------------------
        spent[0] = 0.0
        t_focus = focus["t"]
        focus_point = axes.c2p(t_focus, focus["posterior"]["est"])
        frame = self.camera.frame
        full_width = frame.width
        full_center = frame.get_center()

        # The x offsets are an explanatory layout, not new model values:
        # the actual seeded gain determines the dot's position on the
        # predicted-to-reading segment and the sigma ratio the narrowing.
        prior_point = focus_point + LEFT * 1.25
        reading_point = focus_point + RIGHT * 1.4
        posterior_point = prior_point + RIGHT * (2.65 * focus["gain"])

        def belief_band(center, sigma_value):
            """State-coloured uncertainty with its dashed edge."""
            height = 1.48 * sigma_value / focus["predicted"]["sigma"]
            shape = Ellipse(width=2.1, height=height).move_to(center)
            fill = shape.copy().set_fill(
                state_c, opacity=theme.UNCERTAINTY_FILL_ALPHA
            ).set_stroke(width=0)
            edge = DashedVMobject(
                shape.set_stroke(color=state_c, width=1.8), num_dashes=18
            )
            return VGroup(fill, edge)

        predicted_band = belief_band(prior_point, focus["predicted"]["sigma"])
        posterior_band = belief_band(posterior_point, focus["posterior"]["sigma"])
        prior_dot = Dot(prior_point, radius=0.055, color=state_c)
        reading_dot = Dot(reading_point, radius=0.065, color=measurement_c)
        gain_dot = Dot(posterior_point, radius=0.065, color=highlight_c)
        band_label = Text(
            "predicted belief", font_size=16, color=state_c
        ).move_to(focus_point + LEFT * 1.45 + UP * 1.06)
        band_leader = Line(
            band_label.get_bottom() + DOWN * 0.04,
            prior_point + UP * 0.08,
        ).set_stroke(color=state_c, width=0.75)
        reading_label = Text(
            "reading z", font_size=16, color=measurement_c
        ).move_to(focus_point + RIGHT * 1.65 + UP * 1.06)
        reading_leader = Line(
            reading_label.get_bottom() + DOWN * 0.04,
            reading_point + UP * 0.08,
        ).set_stroke(color=measurement_c, width=0.75)
        gain_label = Text(
            "gain K", font_size=16, color=highlight_c
        ).move_to(focus_point + UP * 1.07)
        gain_leader = Line(
            gain_label.get_bottom() + DOWN * 0.04,
            posterior_point + UP * 0.09,
        ).set_stroke(color=highlight_c, width=0.75)
        fusion_segment = Line(
            prior_point, reading_point
        ).set_stroke(color=theme.STAGE_LABEL_SECONDARY, width=1.3, opacity=0.6)

        # The whole-run traces vanish before the close-up. Otherwise the
        # camera magnifies dozens of unrelated marks and clips their labels.
        plot_art = VGroup(axes, truth_dashes, truth_label, *dots, readings_label)
        play(FadeOut(plot_art), run_time=0.25)
        play(frame.animate.move_to(focus_point).set(width=5.2), run_time=0.5)
        play(
            FadeIn(predicted_band), FadeIn(prior_dot),
            FadeIn(band_label), FadeIn(band_leader),
            run_time=0.45,
        )
        play(
            FadeIn(fusion_segment), FadeIn(reading_dot),
            FadeIn(reading_label), FadeIn(reading_leader), run_time=0.4,
        )
        play(
            predicted_band.animate.become(posterior_band),
            run_time=0.6,
        )
        play(
            FadeIn(gain_dot), FadeIn(gain_label), FadeIn(gain_leader),
            run_time=0.3,
        )
        rest(beats[2])

        # ---- beat 4: the whole run ----------------------------------------
        spent[0] = 0.0
        zoom_artifacts = VGroup(
            predicted_band,
            band_label,
            band_leader,
            reading_label,
            reading_leader,
            gain_label,
            gain_leader,
            gain_dot,
            prior_dot,
            reading_dot,
            fusion_segment,
        )
        play(FadeOut(zoom_artifacts), run_time=0.3)
        play(
            frame.animate.move_to(full_center).set(width=full_width),
            run_time=0.5,
        )
        play(FadeIn(plot_art), run_time=0.4)

        tracker = ValueTracker(2.0)

        def estimate_curve():
            index = max(1, min(RUN_STEPS, int(round(tracker.get_value()))))
            return _polyline(
                [axes.c2p(t, est[t]) for t in range(index + 1)]
            ).set_stroke(color=state_c, width=3.0)

        def estimate_band():
            index = max(1, min(RUN_STEPS, int(round(tracker.get_value()))))
            upper = [
                axes.c2p(t, est[t] + TWO_SIGMA * sigma[t])
                for t in range(index + 1)
            ]
            lower = [
                axes.c2p(t, est[t] - TWO_SIGMA * sigma[t])
                for t in range(index + 1)
            ]
            return Polygon(
                *upper,
                *reversed(lower),
                fill_color=state_c,
                fill_opacity=theme.UNCERTAINTY_FILL_ALPHA,
                stroke_width=0,
            )

        def estimate_tip():
            index = max(0, min(RUN_STEPS, int(round(tracker.get_value()))))
            return Dot(axes.c2p(index, est[index]), radius=0.05, color=state_c)

        curve = always_redraw(estimate_curve)
        band = always_redraw(estimate_band)
        tip = always_redraw(estimate_tip)
        self.add(band, curve, tip)
        # Simulation time runs linear in model time: never eased.
        play(
            tracker.animate.set_value(RUN_STEPS),
            run_time=4.9,
            rate_func=linear,
        )
        estimate_label = rail_label(
            "estimate", state_c, -0.53,
            axes.c2p(RUN_STEPS, est[RUN_STEPS]),
        )
        play(FadeIn(estimate_label), run_time=0.3)
        rest(beats[3])

        # ---- beat 5: the recursion ----------------------------------------
        spent[0] = 0.0
        predict_line = MathTex(
            r"\text{predict:}\quad \bar{\mu}_t = A\,\mu_{t-1}",
            font_size=30,
            color=theme.STAGE_LABEL,
        )
        update_line = MathTex(
            r"\text{update:}\quad \mu_t = \bar{\mu}_t + K_t\,(z_t - C\,\bar{\mu}_t)",
            font_size=30,
            color=theme.STAGE_LABEL,
        )
        predict_line.next_to(title, DOWN, buff=0.35)
        update_line.next_to(predict_line, DOWN, buff=0.25)
        play(Create(predict_line), run_time=0.8)
        play(Create(update_line), run_time=0.9)
        # Indicate, per the vocabulary: scale up and switch to the
        # highlight role, out and back on the language's easing.
        play(
            update_line.animate.scale(1.05).set_color(highlight_c),
            run_time=0.4,
            rate_func=EASE,
        )
        play(
            update_line.animate.scale(1 / 1.05).set_color(theme.STAGE_LABEL),
            run_time=0.4,
            rate_func=EASE,
        )
        rest(beats[4])
