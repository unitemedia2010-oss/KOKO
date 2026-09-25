# Hero refresh and custom domain

## Scope

Refine the opening screen into a clear executive portrait: text on the left,
portrait on the right, Vietnamese calls to action, dark/light themes and a
stacked mobile layout. Keep the existing name, role and message. Reuse the
supplied office portrait and retain the street photo in the lifestyle section.

## Implementation plan

1. Replace the overlapping hero with an in-flow responsive grid.
2. Remove hero blend modes, background outline words and pinned expansion.
3. Give the journey link primary emphasis and the Unite link secondary emphasis.
4. Verify typography, image framing, theme toggle, anchor destinations and
   horizontal overflow at 320, 390, 768 and 1440 pixels.
5. Publish to the existing GitHub Pages repository and verify the deployed commit.
6. Connect linhtruong.vn once DNS access is available. Nameservers currently
   point to ns1.matbao.vn and ns2.matbao.vn. Do not assume DNS or HTTPS is ready.

## Architecture and verification

Static HTML with inline CSS/JS; no build or backend is required. Assets use
relative paths so the site works under /KOKO/ and at a custom domain root.
Verification follows page load -> local asset rendering -> hero CTA -> target
section, plus the theme toggle. Syntax checking and browser evidence will be
recorded below after implementation.

## Rollback

Revert the hero refresh commit to restore the previous opening screen. Domain
changes are separate from visual changes; preserve unrelated DNS/email records.

## Results

- Inline JavaScript: `node --check` passed. `git diff --check` passed.
- Browser widths 320, 390, 768, 1440: hero image loaded; text/image do not
  overlap; document width equals content viewport width (310/380/758/1430).
- Dark/light toggle works and the selected light theme persists after reload.
- Both hero CTAs reach their target section with an 88 px navigation offset.
- Browser console: no error entries during the checked flow.
- Fixed the existing journey animation breakpoint lifecycle with GSAP
  matchMedia, so resizing from desktop to mobile removes desktop pin styles.
- Domain activation and HTTPS remain pending DNS setup and verification.
