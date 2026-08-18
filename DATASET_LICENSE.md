# Ishihara Plate Dataset -- Provenance & Licensing

_Last researched: 2026-08-18._

This file documents where this application's Ishihara plate **metadata** and
(eventually) **images** come from, and exactly what is and isn't legally
usable right now. See `backend/dataset/manifest.json` for the machine-readable
version of the same information, and `backend/scripts/validateIshiharaDataset.js`
for how this is enforced at build time.

## Current status: NO PLATE IMAGES ARE BUNDLED

This repository contains **verified plate metadata only** (plate numbers,
types, and -- where a reliable source was found -- expected responses). It
does **not** contain any Ishihara plate image files, real or otherwise. Every
plate is seeded as `active: false` until an admin adds a properly licensed
image and explicitly activates it.

## Candidate source investigated: Martin Krzywinski's "Ishihara's Tests for Colour Deficiency"

- **Source:** Martin Krzywinski, Canada's Michael Smith Genome Sciences Centre
- **URL:** https://mk.bcgsc.ca/ishihara-tests-for-colour-deficiency/downloads.mhtml
  (plate details: https://mk.bcgsc.ca/ishihara-tests-for-colour-deficiency/plates.mhtml)
- **Are they authentic Ishihara plates?** Yes -- per the author's own
  description, these are photographs (colour-corrected) of the actual 38-plate
  *Ishihara's Tests for Colour Deficiency* book, not computer-generated
  "Ishihara-style" stimuli.
- **Who owns the images?** The underlying test design/plates are from
  Ishihara's original 38-plate book (Kanehara Trading Inc., Tokyo). The
  specific *photographic reproductions and colour-correction work* on
  mk.bcgsc.ca are Martin Krzywinski's own derivative work.
- **Is redistribution/bundling permitted?** **Not established.** The
  downloads page offers high-res/low-res bitmap and SVG archives ("please see
  README.txt for instructions") and a separate file with raw circle
  position/colour data, but the page text we could retrieve does **not**
  state an explicit open license (no CC-BY, MIT, "free to reuse/redistribute
  commercially," etc.). The author explicitly discourages using the
  circle-position data to reproduce/fake the plates ("Can this information be
  used to make fakes? Yes ... Also, please don't."), which signals the author
  cares about how derivatives of this work are used. We could not verify the
  contents of the linked `README.txt` (it ships inside the downloadable zip
  archives, which this environment could not fetch), so it may contain
  additional terms not visible from the page itself.
- **Conclusion:** Per this project's own rule of "don't assume downloadable
  implies redistributable," this source is being treated as **requiring
  explicit permission from Martin Krzywinski (martink@bcgsc.ca) before any of
  its images are bundled into or served from this application.** Do not
  download and commit these images without that permission, even for
  educational use.
- **What's fine to use without further permission:** The Ishihara scoring
  *rule* (plates 2-21, thresholds of 17/13 correct) and the general plate
  *design/category structure* (demonstration / transformation / vanishing /
  hidden-digit / diagnostic / classification-tracing) are long-published,
  widely-documented facts about the test method itself (see "Scoring rule
  source" below), not the copyrighted photographic images -- these facts are
  used in this app's metadata and scoring engine.

## Scoring rule / plate-response metadata source

The **numeral answers, plate categories, and 17/13-out-of-20 scoring
threshold** used in `backend/dataset/manifest.json` and
`backend/config/testConfig.js` are drawn from Ishihara's own published
instruction manual for the 38-plate edition:

> Shinobu Ishihara, *"The Series of Plates Designed as a Test for Colour
> Deficiency" (38 Plates Edition)*, Kanehara Trading Inc., Tokyo -- official
> instruction manual.

This factual/methodological information (which numeral a plate shows, and how
many of 20 screening plates must be read correctly) is standard, widely
cross-published clinical reference information -- it is used here as
*metadata*, not as a copy of the copyrighted plate artwork itself.

Some individual plate values (particularly plates 10-13, and the exact
protan/deutan split on the diagnostic plates 22-25) could only be partially or
ambiguously recovered from the sources checked during this research pass, and
were **deliberately left blank (`null`)** in the manifest rather than guessed.
See the `notes` field on each affected plate in `manifest.json`. Anyone adding
real images should re-verify those specific fields against a clean copy of the
manual before enabling subtype-estimation output for the diagnostic plates.

## What is legally usable right now

- Plate metadata schema, plate categorization, and the official scoring rule:
  **usable now** (already in `manifest.json` / `testConfig.js`).
- Krzywinski's photographed plate images: **NOT usable yet** -- requires
  written permission. Contact: martink@bcgsc.ca, referencing
  https://mk.bcgsc.ca/ishihara-tests-for-colour-deficiency/

## Other sources considered and rejected

- **Computer-generated "Ishihara-style" datasets** (e.g. large
  auto-generated pseudo-isochromatic dot sets, or generators such as
  franciscouzo.github.io/ishihara): explicitly **not used**. These are not
  the standardized Ishihara plates and would misrepresent the test if
  presented as such, per this project's own requirements.
- **AI/LLM-image-generator output**: explicitly **not used**, for the same
  reason plus additional accuracy/authenticity concerns.

## How to add a real, licensed plate image

1. Obtain explicit written permission to redistribute a specific image (from
   Krzywinski, or from another verified, clearly-licensed source of authentic
   Ishihara plates).
2. Place the image file at `backend/dataset/ishihara/plate-XX/image.png`
   (see the `README.txt` inside each plate folder).
3. Update that plate's entry in `backend/dataset/manifest.json`:
   `imageUrl`, `imageSource`, `imageSourceUrl`, `imageLicense`, and
   `imageVerified: true`.
4. From `backend/`, run `npm run seed` then `npm run validate-dataset`.
5. In the admin panel (Dataset Management), review the plate and explicitly
   set it `active`. (The database will refuse to activate a plate that
   isn't backed by a verified image -- this is enforced in
   `models/IshiharaImage.js`.)

## Do not

- Do not commit AI-generated, random-dot, or "Ishihara-style" placeholder
  images and mark them `imageVerified: true`.
- Do not apply any colour/brightness/filter transformation to a plate image
  once added (see `TestPage.jsx` -- images are rendered with `filter: none`
  and no CSS effects).
- Do not present this application's 3-round/decreasing-timer format as part
  of the official, standardized Ishihara procedure -- it is this
  application's own project-level addition (see `officialScreening` vs.
  `projectExperiment` in `TestResult`).