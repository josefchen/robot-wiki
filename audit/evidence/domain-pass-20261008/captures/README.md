# Classical pass: before and after captures

The capture test (`scripts/capture-visuals.ts`) ran over the static export of
the classical hub and its nine articles at two commits:

- Start: `a09d3c92`, the commit before the pass's first change, exported in a
  separate worktree.
- End: the export of `aa9856f4`. The later commits change no captured frame:
  `4ed5226e` and `1ddbfc41` change only evidence, `ffe4f737` rewords one
  answer of the pendulum prediction on control, which sits outside the
  figure, `2865839a` changes only end-to-end specs and `3988f006` regenerates
  the change dates.

Each side was captured at 1440 px and at 375 px:

```
node scripts/capture-visuals.ts --root <export> --out <dir> --width <1440|375> --routes <10 classical routes>
node scripts/capture-visuals.ts --before <start dir> --after <end dir> --out <dir> --routes <the 9 classical articles>
```

## Files

| File | What it shows |
|---|---|
| `start-1440-sheet.jpg`, `end-1440-sheet.jpg` | Every classical visual at Start and at End, 1440 px |
| `start-375-sheet.jpg`, `end-375-sheet.jpg` | The same at 375 px |
| `pairs-1440-1.jpg`, `pairs-1440-2.jpg` | Before and after pairs on the nine articles, 1440 px |
| `pairs-375-1.jpg`, `pairs-375-2.jpg` | The same at 375 px |
| `pairs-1440.json`, `pairs-375.json` | The pairs on those sheets; `changed` means the PNG bytes differ |
| `manifest-diff.json` | Per-visual manifest comparison (kind, label, size, surface, scene, colours) at both widths, with the per-route DOM counts |

## Result

- Start has 11 visuals and End has 13, at each width. Every route's settled
  DOM count equals its manifest count on both sides, and no capture failed.
  The hub has no visuals.
- The two added visuals are the first figures of calibration and ROS 2 for
  ML engineers.
- Nine visuals changed their entry: the eight figures the pass rewrote for
  first-time readers (label, height and colour set) and the Kalman clip,
  whose label now ends "(illustrative)" instead of "(schematic)".
- The PUMA 560 photograph on kinematics keeps its entry, and its image file
  is unchanged. Its pixels differ by resampling at 1440 px (0.8% of pixels
  by more than a quarter of the range) and on the caption lines at 375 px.
- The Kalman clip's poster image on state estimation keeps its entry, but
  the clip was re-rendered, so both of its frames (the poster and the clip
  figure) show the new drawing: 98% of pixels differ at 375 px.
- Colour sets: the highlight note green `#507C00` appears in six rewritten
  figures (pendulum, contact lab, grasp lab, error budget, ladder, Kalman
  scene) and both new ones. The paper tone `#F5F6F7` appears in the contact
  lab, grasp lab, planar arm and RRT explorer. Lime `#C6FF19` leaves the
  contact lab, whose checked option was filled lime at Start and is now
  bordered, and the Kalman scene. The reference grey `#6E6F70` leaves the
  grasp lab, ladder and Kalman scene. Every colour is a palette token except
  `#000000`, which every first-party figure has at Start and at End alike.
  The pass did not add it.
- At 375 px the site's sticky header and the skip link are painted over tall
  element captures at scroll-dependent places, on both sides. The pages
  themselves keep both out of the figures.

## What each pair shows

Sizes are 1440 px, then 375 px.

**Pendulum, `/classical/control/` #0** (715 × 840 to 715 × 1119; 335 × 922
to 335 × 1427). Start shows three gain sliders over the pole. End leads with
"Push back harder than gravity to keep the pole upright" and the presets Too
gentle, Strong enough and Give it a push. The stage draws gravity's pull and
the motor's push-back arc, labelled "push", with a green note at the base.
The gain sliders, now named for what each gain does, sit in "Adjust more".

**Contact lab, `/classical/control/` #1** (715 × 842 to 715 × 1319;
335 × 993 to 335 × 1543). End leads with "A softer arm touches gently enough
not to crush". A fingertip presses a fragile object that crushes at 25
newtons, the chart labels the first bump against the crushing force, and the
arm choices read Stiff arm, Arm that controls its own push and Arm with a
built-in spring. The pain-limit band moved into "How this was made".

**Grasp wrench lab, `/classical/grasp-planning/` #0** (715 × 782 to
715 × 2099; 335 × 1498 to 335 × 2237). End draws the box from above with
three fingertips, their friction wedges and eight test pushes, each resisted
or slipping, beside a grip meter that reads from "no grip" to "very firm".
The contact sliders and the wrench-space plot moved into "Adjust more".

**Planar arm, `/classical/kinematics/` #0** (715 × 793 to 715 × 1110;
335 × 854 to 335 × 1236). End leads with "Turn the shoulder and everything
beyond it swings along", offers Reach up, Reach out and Tuck in, and draws
the pose before the turn in grey. The slider ends say which way the arm
leans.

**RRT explorer, `/classical/motion-planning/` #0** (715 × 778 to 715 × 1138;
335 × 781 to 335 × 1129). Start opened on an empty field at iteration 0.
End opens on the finished tree, iteration 288 of 288, with the 124.2-unit
path highlighted and the note "The first branch to reach the goal becomes
the path".

**Error budget, `/classical/perception/` #0** (715 × 1069 to 715 × 1975;
335 × 1492 to 335 × 2467). Start was a bar chart of four error terms. End
draws a camera from the side, its assumed line of sight tilted from the true
one, with the miss marked at the object, and keeps two sliders: the camera's
tilt and the distance to the object. The bars moved into "Adjust more".

**Ladder, `/classical/scene-representation/` #0** (715 × 911 to 715 × 1226;
335 × 1442 to 335 × 2044). End names the five stores in plain words (Dots,
Grid of boxes, Distance map, Triangle skin, Soft blobs) and answers three
questions for each: can the robot move here, which way the surface faces,
and what it looks like from here.

**Kalman scene, `/classical/state-estimation/` #0** (715 × 876 to
715 × 1228; 335 × 712 to 335 × 1383). Start drew belief ellipses in the
position and velocity plane. End is the flagship scene: three labelled
bells (my guess, the sensor says, best blend) over a robot on a track, with
the blend "62% of the way from guess to sensor". Its overlap and bounds
probes are recorded with `1ddbfc41`.

**Kalman clip, `/classical/state-estimation/` #1 and #2** (715 × 402;
335 × 188, both sides). Start was a dark frame reading "predict widens,
update narrows". End is a light frame with plain labels (true position,
sensor readings, filter's estimate) and the note "No readings: the filter
grows less sure" at the gap in readings.

**Calibration chain, `/classical/calibration/` #0** (added; 715 × 1438;
335 × 1755). A robot arm with a wrist camera, each link of the chain
labelled beside its part, and a dot on the spot the hand must reach. "How
this was made" lists the four links with the error each cited study
measured. At 375 px its table scrolls sideways in its own box.

**ROS 2 policy layout, `/classical/ros2-for-ml-engineers/` #0** (added;
715 × 1498; 335 × 2328). One column from the sensors to a drawn robot arm,
with the safety check in focus and the note "Every suggested move is checked
here first". The ROS 2 names and each link's delivery details are in "How
this was made".
