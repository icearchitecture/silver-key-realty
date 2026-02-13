# Changelog — Silver Key Realty

## [3.0.0] — 2026-02-13

### Added
- Four-pathway architecture (Buyer, Seller, Investor, Renter)
- Pathway selector component on landing page (3-card grid + tertiary renter link)
- Modular CSS: tokens.css, base.css, nav.css, hero.css, pathways.css, sections.css, responsive.css
- Modular JS: nav.js, reveal.js, pathways.js
- Pathway stub pages: buyer/, seller/, investor/, rentals/
- .cursorrules for AI-assisted development
- docs/pathway-specs.md — detailed content requirements per pathway
- docs/copy-bank.md — all approved copy and voice reference
- Mobile hamburger menu with full-screen overlay
- Keyboard accessibility on pathway cards

### Changed
- Hero CTA now drives to pathway selector ("Find Your Pathway")
- Nav links updated with Pathways anchor
- Logo served as PNG file instead of inline base64
- CSS extracted from monolithic file into 7 modular stylesheets
- JS extracted into 3 IIFE-wrapped modules

### Preserved
- All V2 sections: Philosophy, Pillars, The Model Feature, Quote, Lifestyle Grid, CTA, Footer
- Green recessed lighting system (opacity rules unchanged)
- Design tokens (colors, typography, spacing, animation)
- Grain overlay and ambient green edge effects
- Scroll reveal system (IntersectionObserver, 80ms stagger)

## [2.0.0] — 2026-02-12

### Added
- Logo integration (nav, hero watermark, footer)
- Green recessed lighting system
- Breathing circle animations in hero
- Grain texture overlay
- Frosted glass nav on scroll

## [1.0.0] — 2026-02-12

### Added
- Initial landing page
- Brand copy and philosophy sections
- Core design system (champagne/cream palette, serif+sans typography)
