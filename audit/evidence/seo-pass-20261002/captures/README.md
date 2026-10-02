# SEO pass: before and after captures

Each sheet puts the page before the SEO pass on the left and after it on the
right, at 1440 x 900 (`-desktop`) and 375 x 812 (`-mobile`), with reduced
motion. The magenta band is sheet background where the two sides differ in
height.

- Before: commit 953a891b, exported with `git archive` and built with
  `next build`.
- After: the static export from `npm run vercel-build` on 22e9f01d. Later
  commits change only tests and evidence.

## What the sheets show

- `reveal-chip`: the cited answer in the first prediction on
  /manipulation/bc-foundations/, opened. The chip printed the citation id
  `dagger-2011`; it now reads `Ross et al. 2011`, the label the inline chips
  use.
- `chip-label`: the ACT paragraph on /manipulation/action-chunking/.
  `Zhao 2023` becomes `Zhao et al. 2023`, and the first prose mention of
  "teleoperation" links to its glossary entry.
- `glossary-link`: a paragraph on /manipulation/diffusion-policy/. "success
  rates" links to the glossary; `Prasad 2024` and `Wang 2024` gain "et al.".
  At 375 px each chip wraps whole with its full stop.
- `dexterity-top`: the lead on /frontier/dexterity/ now opens by saying what
  dexterity is. The regenerated reading time is 14 minutes, up from 13.
- `dexterity-see-also`: four generic related articles become the three the
  domain report proposes, each with its one-line summary.
- `adjacent-hub`: unchanged. The hub already listed every article with a
  one-line summary.

## Document heads

| Page | Before | After |
| --- | --- | --- |
| bc-foundations title | Behavior Cloning for Robot Learning (48) | Behavior Cloning: Compounding Error and DAgger (59) |
| dexterity title | Robot Dexterity: Tactile Sensing and In-Hand Manipulation (70) | Robot Dexterity and Tactile Hands (46) |
| /adjacent/ title | Autonomous Vehicles, Drones, Surgical and Space Robotics (69) | Robotics Applications Outside the Lab (50) |
| / description | 53 characters | 146 characters |
| /adjacent/ description | 75 characters | 144 characters |
| /glossary/ description | 84 characters | 142 characters |
| dexterity description | 91 characters | 134 characters |
| diffusion-policy description | 99 characters | 153 characters |
| /playground/ description | 160 characters | 145 characters |

Title lengths include " | Robot Wiki". Two titles were over 60 characters
and six descriptions were outside 70 to 155; all are now inside the limits.

## Checks in the exported HTML

- /market-map/: 111 logo images. None had a non-empty `alt` before; all 111
  now read "<Company> logo".
- /classical/state-estimation/: the Kalman clip's `<video>` kept its
  `aria-label` and gained `aria-describedby`, which points to a text account
  of the whole 18-second clip.
