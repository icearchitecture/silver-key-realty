# Silver Key Realty — Design System & Architecture Document

> **Version:** 2.1 → 3.0 (in development)
> **Last Updated:** February 12, 2026
> **Status:** V2 deployed, V3 architecture locked, build pending
> **Primary Stack:** HTML/CSS/JS (static), migration-ready for React/Next.js

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Brand Philosophy](#2-brand-philosophy)
3. [Design System](#3-design-system)
4. [Component Architecture (V2)](#4-component-architecture-v2)
5. [User Segmentation Model (V3)](#5-user-segmentation-model-v3)
6. [Page Architecture (V3)](#6-page-architecture-v3)
7. [Interaction Patterns](#7-interaction-patterns)
8. [Content Strategy](#8-content-strategy)
9. [Technical Implementation](#9-technical-implementation)
10. [File Structure](#10-file-structure)
11. [Integration Guidelines](#11-integration-guidelines)
12. [Source Intelligence](#12-source-intelligence)

---

## 1. Project Overview

### What Silver Key Realty Is

Silver Key Realty LLC is a lifestyle investment real estate company. It operates on the principle that a home is not a transaction — it is entry into a living network where property value, community quality, and personal experience compound simultaneously.

### What the Website Must Do

The website is the **primary intake mechanism** for Silver Key Realty. It must:

- Identify the user type (Buyer, Seller, Investor, Renter) immediately upon arrival
- Route each user type into a dedicated experience pathway
- Educate before transacting — progressive disclosure of information
- Communicate luxury, intentionality, and quiet authority through design
- Function as both a brand experience and a lead qualification system
- Feel curated, not commercial — the user should feel assessed, not sold to

### What the Website Must NOT Do

- Overwhelm with options or information density
- Feel like a listings aggregator (no Zillow/Redfin patterns)
- Require the user to figure out where they belong
- Break the atmospheric quality with generic UI patterns
- Treat all users as the same persona

---

## 2. Brand Philosophy

### Core Positioning

Silver Key Realty is the conduit between a buyer or seller and the rest of the partners in the real estate industry. It is not a brokerage that lists homes — it is a lifestyle architecture firm that positions properties within a designed network.

### Foundational Principles

| Principle | Expression |
|-----------|-----------|
| **Curation over volume** | We don't show everything. We show what's right. |
| **Education before transaction** | The user learns before they commit. |
| **Relationship over sale** | The connection is the product. The property is the container. |
| **Experience as investment** | Daily living quality directly drives property value. |
| **Quiet authority** | The brand whispers. It never shouts. |

### Key Copy Lines (Locked)

These are approved brand lines. Use them as-is or derive from their tone:

- "You Don't Buy a Home. You Enter a Life."
- "Most realtors show you properties. We show you possibilities."
- "The key isn't given. It's earned."
- "A home is not a place you arrive. It's a field you enter."
- "Don't buy a home. Buy the experience."
- "Where Architecture Meets Belonging"
- "Lifestyle Investment Architecture" (tagline)

### Three-Pillar Framework

All brand messaging maps to three pillars. These are non-negotiable and must appear in every version of the site:

1. **Structure** — The physical architecture. Built environment as behavioral infrastructure.
2. **Experience** — Daily living as curated product. The home is the container, not the content.
3. **Trust** — Community quality as investment. Your neighbors are part of the asset.

**Brand Equation:** Structure × Experience × Trust = Compound Lifestyle Return

---

## 3. Design System

### 3.1 Color Tokens

```css
:root {
  /* === NEUTRALS (Primary Palette) === */
  --black: #0A0A0A;
  --charcoal: #1A1A1A;          /* Primary text, dark backgrounds */
  --dark: #2A2A2A;
  --warm-gray: #8A8178;          /* Secondary text, descriptions */
  --silver: #B8B0A8;             /* Tertiary text, labels, meta */
  --champagne: #C9B99A;          /* Accent — warmth, emphasis, italic text */
  --gold: #D4B896;               /* Accent — hover states, premium markers */
  --light-warm: #F0EBE3;         /* Subtle backgrounds */
  --cream: #F7F4F0;              /* Section backgrounds, cards */
  --white: #FDFCFA;              /* Page background (NOT pure white) */

  /* === GREEN (Recessed Lighting System) === */
  --skr-green: #2E7D52;          /* Primary green — NEVER used at full opacity on surfaces */
  --skr-green-light: #3A9464;    /* Tags, labels, subtle text accents */
  --skr-green-glow: rgba(46, 125, 82, 0.08);   /* Glow effects */
  --skr-green-ghost: rgba(46, 125, 82, 0.03);   /* Near-invisible ambient */
  --skr-green-shadow: rgba(46, 125, 82, 0.12);  /* Box shadows */
  --skr-green-line: rgba(46, 125, 82, 0.18);    /* Divider lines */
}
```

### Green Usage Rules (Critical)

The green functions as **recessed lighting** — you never see the source, only the effect.

| Context | Max Opacity | Treatment |
|---------|------------|-----------|
| Text labels / tags | 70% | `--skr-green-light` with `opacity: 0.7` |
| Hover underlines | 50% | 1px line, `--skr-green` at 0.5 opacity |
| Card hover glow | 50% | Bottom-edge blur, `filter: blur(4-8px)` |
| Section dividers | 25% | Gradient: `transparent → green → transparent` |
| Ambient body glow | 4-8% | Fixed position edge lines, radial gradients |
| Button hover bleed | 50% | Bottom shadow, blurred, never solid fill |
| Pillar numbers | 12-25% | Decorative, increases on hover |
| Breathing circles (hero) | 6% max | Radial gradient, animated scale |

**NEVER:** Use green as a solid background. Use green as a button fill. Use green as a border at full opacity. The green must always feel like light bleeding through a surface, not paint applied to one.

### 3.2 Typography

```css
:root {
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Outfit', sans-serif;
}
```

**Google Fonts Import:**
```
Cormorant Garamond: 300, 400, 500, 600 (normal + italic)
Outfit: 200, 300, 400, 500
```

| Element | Font | Weight | Size | Tracking | Transform |
|---------|------|--------|------|----------|-----------|
| H1 (Hero) | Serif | 300 | clamp(48px, 6vw, 80px) | — | — |
| H2 (Section) | Serif | 300 | clamp(36px, 4vw, 52px) | — | — |
| H3 (Card title) | Serif | 400 | 24-26px | — | — |
| Body | Sans | 200 | 15-17px | — | — |
| Tags / Labels | Sans | 300 | 10-11px | 3-4px | uppercase |
| Nav links | Sans | 300 | 13px | 2px | uppercase |
| Buttons | Sans | 400 | 12-13px | 2.5-3px | uppercase |
| Stats (numbers) | Serif | 300 | 32-48px | — | — |
| Decorative numbers | Serif | 300 | 48-72px | — | — |

**Typography Rules:**
- Italic serif (`em` tags) always use `--champagne` color
- Body text line-height: 1.8-2.0
- Heading line-height: 1.05-1.2
- Never bold body text — use `font-weight: 400` for emphasis within 200-weight body

### 3.3 Spacing System

```
Base unit: 8px
XS:   8px   (element gaps)
SM:   16px  (tight padding)
MD:   24px  (standard gaps)
LG:   40px  (section element spacing)
XL:   60px  (page horizontal padding, desktop)
2XL:  80px  (grid gaps)
3XL:  120px (section large gaps)
4XL:  160px (section vertical padding)

Mobile horizontal padding: 24px
Desktop horizontal padding: 60px
Max content width: 1400px (centered)
```

### 3.4 Animation & Motion

**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — used globally for all transitions

| Animation | Duration | Trigger | Properties |
|-----------|----------|---------|------------|
| Fade up (reveal) | 1s | Scroll into view | opacity 0→1, translateY 40→0 |
| Hero elements | 1s | Page load (staggered 0.3-0.9s) | opacity 0→1, translateY 30→0 |
| Nav scroll | 0.6s | scroll > 60px | background, padding, shadow |
| Breathing circles | 8s | Infinite loop | scale 1→1.3, opacity 0.5→1 |
| Button hover | 0.4-0.5s | Hover | translateY, shadow, glow |
| Card hover | 0.5-0.6s | Hover | background, border, transform |
| Link underline | 0.4s | Hover | width 0→100% |

**Intersection Observer Config:**
```javascript
{ threshold: 0.12 }
// Stagger: 80ms delay per element index
```

### 3.5 Effects & Textures

**Grain Overlay:**
```css
body::after {
  /* Fixed, covers viewport, pointer-events: none, z-index: 9999 */
  opacity: 0.015;
  /* SVG fractalNoise filter, background-size: 200px, repeat */
}
```

**Backdrop Blur (Nav):**
```css
nav.scrolled {
  background: rgba(253, 252, 250, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
```

**Text Selection:**
```css
::selection {
  background: var(--champagne);
  color: var(--charcoal);
}
```

---

## 4. Component Architecture (V2)

### 4.1 Section Map

```
┌─────────────────────────────────────────┐
│  NAV (fixed)                            │
│  Logo | Philosophy | Approach |         │
│        The Model | Lifestyle | [Begin]   │
├─────────────────────────────────────────┤
│  HERO                                   │
│  Tag → H1 → Subtitle → CTA buttons     │
│  Right: cream bg + breathing circles    │
│  Center: logo watermark (6% opacity)    │
├─────────────────────────────────────────┤
│  PHILOSOPHY (2-col grid)                │
│  Left: line + H2                        │
│  Right: 3 body paragraphs              │
│  Center: green gradient divider line    │
├─────────────────────────────────────────┤
│  PILLARS (dark section)                 │
│  Header: tag + H2                       │
│  3-col grid: Structure | Experience |   │
│              Trust                      │
│  Gradient fade from white at top        │
│  Green bottom line (25% opacity)        │
├─────────────────────────────────────────┤
│  FEATURE (The Silver Key Model)             │
│  2-col: Visual placeholder | Content    │
│  Stats: 3 | 1 | ∞                      │
│  Green divider above stats              │
├─────────────────────────────────────────┤
│  QUOTE (cream background)              │
│  Centered blockquote                    │
│  Green edge lines top + bottom          │
├─────────────────────────────────────────┤
│  LIFESTYLE GRID (2x2)                  │
│  Curated Community | Architectural      │
│  Intelligence | Generational Wealth |   │
│  Designed Belonging                     │
│  Cards invert on hover (cream→charcoal) │
├─────────────────────────────────────────┤
│  CTA                                    │
│  Green vertical line → H2 → p → button │
├─────────────────────────────────────────┤
│  FOOTER                                 │
│  Logo | divider | tagline    © 2026     │
│  Green center line at top               │
└─────────────────────────────────────────┘
```

### 4.2 Component Specs

**Nav:**
- Fixed, transparent on load, frosted glass on scroll (>60px)
- Logo: 90px height, green ghost drop-shadow
- Links: 13px uppercase, warm-gray → charcoal on hover, green underline animation
- CTA button: charcoal bg, white text, green bottom line on hover

**Hero:**
- Full viewport height, content left-aligned
- Right half: cream background with centered breathing circles (green radial gradient)
- Logo watermark: 360px width, 6% opacity, grayscale(40%)
- Staggered entrance animations: tag (0.3s), h1 (0.5s), subtitle (0.7s), actions (0.9s)

**Pillar Cards:**
- Semi-transparent bg: `rgba(255,255,255,0.03)`
- Border: `rgba(255,255,255,0.04)`
- Hover: green tint bg `rgba(46,125,82,0.04)`, green border, translateY(-4px)
- Bottom glow: green blur line, opacity 0→0.5 on hover

**Lifestyle Cards:**
- Cream bg → charcoal bg on hover (full inversion)
- Text color transitions with background
- Green bottom blur line appears on hover
- Decorative numbers: 72px, 10% opacity → 20% green opacity on hover

### 4.3 Logo Assets

| File | Format | Use |
|------|--------|-----|
| `SKR_LOGO_white.png` | PNG, white bg | Print, documents, presentations |
| `SKR_LOGO_transparent.png` | PNG, transparent | Web, overlays, dark backgrounds |
| `FULL_LOGO.png` | PNG, black bg | Source file (requires processing) |

**Logo contains:** Silver ornamental key with "S" engraving + "Silver Key Realty LLC" wordmark + green "KR" monogram

**Logo placements in V2:**
- Nav: 90px height
- Hero watermark: 360px width, 6% opacity
- Footer: 70px height, 50% opacity

---

## 5. User Segmentation Model (V3)

### 5.1 Four User Pathways

The landing page must identify the user's intent immediately and route them into the correct experience.

```
                    ┌──────────────────────┐
                    │    LANDING PAGE       │
                    │   (Universal Hero)    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────┴──┐   ┌────────┴───┐   ┌────────┴──────┐
    │   BUYER    │   │   SELLER   │   │   INVESTOR    │
    │            │   │            │   │               │
    │ Primary    │   │ Primary    │   │ Secondary     │
    │ Pathway    │   │ Pathway    │   │ Pathway       │
    └────────────┘   └────────────┘   └───────────────┘
                               │
                    ┌──────────┴───────────┐
                    │      RENTER          │
                    │   (Tertiary —        │
                    │   routes to          │
                    │   separate system)   │
                    └──────────────────────┘
```

### 5.2 Pathway Definitions

#### BUYER — "I want to purchase a home to live in"

**User Profile:** Individual or family looking for a primary residence. May be first-time or experienced. Motivated by lifestyle, stability, community.

**Journey Architecture:**
1. **Entry** — Pathway selection from landing page
2. **Education** — Do's and don'ts of the buying process, what to expect
3. **Qualification** — Pre-approval status, budget range, timeline
4. **Matching** — Agent connection, property curation
5. **Engagement** — Buyer's agent contract, retainer fee, active search
6. **Conversion** — Property selection, offer, close

**Key Principle:** Education before transaction. First-time buyers think "I just want to buy a house. What do I do next?" The pathway answers that question step by step.

**Content Needs:**
- First-time buyer resources (do's and don'ts)
- Pre-approval guidance and partner links
- Agent profiles with individual pages
- Buyer's agent contract explanation
- Retainer fee structure
- Property curation (not a listings feed)

#### SELLER — "I want to sell my property"

**User Profile:** Current homeowner looking to sell. Wants maximum value, professional representation, and a process they understand.

**Journey Architecture:**
1. **Entry** — Pathway selection from landing page
2. **Assessment** — Property address, estimated value, condition
3. **Education** — What Silver Key representation means vs. standard listing
4. **Valuation** — CMA (Comparative Market Analysis) request
5. **Engagement** — Listing agreement, marketing plan
6. **Execution** — Photography, staging, positioning, showing

**Key Principle:** Positioning over listing. Silver Key doesn't "list" a property — it presents one. The seller should understand that their home enters a curated network, not a database.

**Content Needs:**
- Property intake form (address, value estimate, photos)
- What makes SKR representation different
- Marketing approach explanation
- Agent matching for sellers
- Timeline and process overview

#### INVESTOR — "I want to acquire property as an investment"

**User Profile:** Individual or entity looking for lots, investment properties, rental acquisitions, commercial plays, or development opportunities. Financially motivated.

**Journey Architecture:**
1. **Entry** — Pathway selection from landing page
2. **Intent Classification** — Lot purchase, rental property, commercial, development
3. **Portfolio Context** — Investment goals, timeline, capital range
4. **Opportunity Matching** — Available investment properties, lots, partnerships
5. **Analysis** — ROI projections, market data, comparable analysis
6. **Execution** — Acquisition process, financing options

**Key Principle:** Data-driven with lifestyle premium. Investors evaluate numbers, but Silver Key's proposition is that lifestyle-architected properties generate compound returns that traditional investment properties cannot.

**Content Needs:**
- Investment property types available
- Lot availability and development opportunities
- Market analysis and ROI frameworks
- Partnership model for larger plays
- Silver Key Model showcase as proof of concept

#### RENTER — "I'm looking for a rental"

**User Profile:** Individual or family not ready to buy, or choosing to rent strategically. May convert to buyer later.

**Journey Architecture:**
1. **Entry** — Pathway selection from landing page (tertiary position)
2. **Redirect** — Routes to Silver Key Rentals / Property Management system
3. **Search** — Available rental inventory (different source than buy/sell)
4. **Application** — Rental application process
5. **Placement** — Lease signing, move-in

**Key Principle:** Entry-level node in the Silver Key network. Renters experience the community first, which seeds future buyer conversion. However, rental operations have different financial infrastructure (property management fees vs. loan money) and different inventory sources. The experience starts on the same landing page but routes to a separate operational system.

**Content Needs:**
- Clear but non-disruptive pathway from landing page
- Rental inventory database (separate from sales)
- Application process
- Eventual conversion pathway back to Buyer journey

### 5.3 Visual Hierarchy on Landing Page

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  [HERO — Universal entry point]                       │
│  "You Don't Buy a Home. You Enter a Life."            │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  PATHWAY SELECTOR (immediately post-hero)             │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐        │
│  │  BUYING  │  │ SELLING  │  │  INVESTING   │        │
│  │  a Home  │  │  a Home  │  │  in Property │        │
│  │          │  │          │  │              │        │
│  │ [Full    │  │ [Full    │  │ [Full        │        │
│  │  card]   │  │  card]   │  │  card]       │        │
│  └──────────┘  └──────────┘  └──────────────┘        │
│                                                       │
│  "Not buying or selling? Looking for rentals? →"     │
│  (Subtle link, same page, routes to rental system)   │
│                                                       │
├───────────────────────────────────────────────────────┤
│                                                       │
│  [PHILOSOPHY / PILLARS / FEATURE sections continue    │
│   below as universal brand content that supports      │
│   all pathways]                                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Design Rules for Pathway Selector:**
- Three primary cards with equal visual weight (Buyer, Seller, Investor)
- Renter as a text-based tertiary link below the cards — present but not competing
- Cards should feel like doors, not buttons — atmospheric, not transactional
- Each card hover should preview the experience with subtle visual shift
- Clicking a card routes to a dedicated page (not a scroll anchor)
- Green recessed lighting treatment on card hover (consistent with pillar cards)

---

## 6. Page Architecture (V3)

### 6.1 Site Map

```
silver-key-realty/
│
├── index.html              ← Landing page (universal entry + pathway selector)
│
├── buyer/
│   ├── index.html          ← Buyer journey home
│   ├── first-time.html     ← First-time buyer resources
│   ├── process.html        ← Step-by-step buying process
│   ├── pre-approval.html   ← Pre-approval guidance
│   └── agents.html         ← Agent directory (buyer-focused)
│
├── seller/
│   ├── index.html          ← Seller journey home
│   ├── valuation.html      ← Property valuation request
│   ├── process.html        ← Selling process overview
│   └── marketing.html      ← How SKR markets your property
│
├── investor/
│   ├── index.html          ← Investor journey home
│   ├── opportunities.html  ← Available investment properties
│   ├── model.html        ← Silver Key Model showcase
│   └── partnerships.html   ← Developer/investor partnerships
│
├── rentals/                ← May redirect to separate domain
│   └── index.html          ← Rental search / redirect
│
├── about/
│   ├── index.html          ← Company story, philosophy
│   └── team.html           ← Agent profiles
│
└── assets/
    ├── css/
    │   ├── tokens.css       ← Design tokens (colors, type, spacing)
    │   ├── components.css   ← Shared component styles
    │   └── pathways.css     ← Pathway-specific overrides
    ├── js/
    │   ├── nav.js           ← Navigation behavior
    │   ├── reveal.js        ← Scroll reveal animations
    │   └── router.js        ← Pathway routing logic
    ├── images/
    │   ├── logo-transparent.png
    │   ├── logo-white.png
    │   └── [property images]
    └── fonts/               ← Self-hosted fallback
```

### 6.2 Landing Page Flow (V3)

```
1. NAV (fixed)
   - Logo (left)
   - I'm a Buyer | I'm a Seller | I'm an Investor | Rentals (right)
   - Menu collapses on mobile

2. HERO (full viewport)
   - Universal headline + subtitle
   - Primary CTA: "Find Your Pathway"
   - Secondary CTA: "Our Philosophy"
   - Breathing circles, logo watermark

3. PATHWAY SELECTOR (immediately below hero, above fold on scroll)
   - Three primary pathway cards
   - Renter tertiary link
   - Cards route to dedicated pathway pages

4. PHILOSOPHY (unchanged from V2)
   - Two-column: headline left, body right

5. PILLARS (unchanged from V2)
   - Three-column: Structure, Experience, Trust

6. FEATURE (The Silver Key Model — reframed from V2)
   - Two-column: visual left, content right

7. QUOTE (unchanged from V2)

8. LIFESTYLE GRID (unchanged from V2)

9. CTA (updated for V3)
   - Pathway-aware: different CTA depending on scroll context

10. FOOTER (unchanged from V2)
```

---

## 7. Interaction Patterns

### 7.1 Pathway Selection

**Behavior:** User clicks one of three pathway cards. The card expands briefly (scale + glow), then navigates to the pathway page. The transition should feel like entering a room, not clicking a link.

**Mobile:** Cards stack vertically. Renter link becomes a full-width text bar below the three cards.

### 7.2 Scroll Reveal

All `.reveal` elements animate on intersection. Stagger delay of 80ms per element index within a group. Elements animate once and are unobserved after.

### 7.3 Navigation State

```
Default: transparent, full padding
Scrolled (>60px): frosted glass, compact padding, green ghost shadow
Pathway pages: pre-scrolled state (always frosted)
```

### 7.4 Card Interactions

```
Pillar cards (dark bg):
  Rest → Hover: green tint bg, green border, translateY(-4px), bottom glow

Lifestyle cards (cream bg):
  Rest → Hover: full inversion (cream→charcoal, text inverts, green bottom glow)

Pathway cards (V3):
  Rest → Hover: scale(1.02), green recessed glow from edges, subtitle reveal
```

### 7.5 Button States

```
Primary button (.btn-primary):
  Rest: charcoal bg, white text
  Hover: translateY(-2px), green shadow, green bottom light bleed

Ghost button (.btn-ghost):
  Rest: warm-gray text, no bg
  Hover: charcoal text, arrow shifts right, arrow turns green
```

---

## 8. Content Strategy

### 8.1 Voice & Tone

| Attribute | Description |
|-----------|-------------|
| **Register** | Elevated but accessible. Not academic. Not casual. |
| **Warmth** | Present but restrained. Feels human, not corporate. |
| **Authority** | Quiet. The brand doesn't explain why it's credible. It demonstrates it. |
| **Pace** | Slow. Sentences breathe. Short paragraphs. Generous whitespace. |
| **Vocabulary** | "Curated" not "selected." "Architecture" not "design." "Investment" not "purchase." |

### 8.2 Copy Rules

- Headlines use serif italic for the emotional word (usually one per headline)
- Body text weight 200. Emphasis within body uses weight 400, never bold
- Tags/labels always uppercase, tracked wide, lower opacity
- Never use exclamation marks
- CTAs are statements, not commands. "Explore the Lifestyle" not "Click Here"
- The word "luxury" never appears. The design communicates it.

### 8.3 Pathway-Specific Messaging

| Pathway | Tone Shift | Lead With |
|---------|-----------|-----------|
| Buyer | Warm, educational, guiding | "Your next chapter starts with understanding, not searching." |
| Seller | Confident, positioning-focused | "Your property deserves more than a listing. It deserves a presentation." |
| Investor | Data-informed, strategic | "Lifestyle-architected properties generate compound returns." |
| Renter | Welcoming, low-pressure | "Not ready to buy? Experience the community first." |

---

## 9. Technical Implementation

### 9.1 Current Stack (V2)

- Single HTML file with embedded CSS and JS
- Google Fonts (external)
- Logo embedded as base64 data URI
- No build tools, no framework, no dependencies
- Fully static, deployable to any hosting

### 9.2 Migration Path (V3)

**Phase 1 — Multi-page static HTML:**
- Extract CSS into `tokens.css` + `components.css`
- Create pathway pages as separate HTML files
- Shared nav/footer as HTML includes or copy
- Maintain zero-dependency approach

**Phase 2 — Framework migration (when needed):**
- React or Next.js for component reuse
- CSS Modules or Tailwind (maintain token values)
- Dynamic routing for pathway pages
- CMS integration for property content

### 9.3 Responsive Breakpoints

```css
/* Mobile-first approach */
/* Default: mobile (< 900px) */
@media (min-width: 900px)  { /* Tablet / Desktop */ }
@media (min-width: 1200px) { /* Wide desktop */ }
@media (min-width: 1600px) { /* Ultra-wide */ }
```

**Mobile adaptations:**
- Nav links hidden (hamburger menu needed for V3)
- All grids collapse to single column
- Logo scales to 40px
- Horizontal padding: 24px
- Hero: cream bg covers full width at 25% opacity

### 9.4 Performance

- Inline critical CSS (already done in V2)
- Logo as base64 eliminates one network request
- Google Fonts: preconnect + display=swap
- Intersection Observer for lazy reveal (no library)
- Total V2 page weight: ~50KB (including embedded logo)

### 9.5 SEO Considerations

- Separate pathway pages improve keyword targeting
  - `silverkey.com/buyer` → "buy a home [city]"
  - `silverkey.com/seller` → "sell my home [city]"
  - `silverkey.com/investor` → "real estate investment [city]"
  - `silverkey.com/rentals` → "rentals [city]"
- Each pathway page needs unique meta title + description
- Schema.org RealEstateAgent markup on all pages
- Open Graph + Twitter Card meta for sharing

---

## 10. File Structure

### Current Files (V2)

```
outputs/
├── silver-key-realty-v1.html     ← Version 1 (original, no logo)
├── silver-key-realty-v2.html     ← Version 2 (current, with logo + green)
├── SKR_LOGO_white.png            ← Clean logo, white background
├── SKR_LOGO_transparent.png      ← Clean logo, transparent background
├── FULL_LOGO.png                 ← Original logo file (black bg)
└── Dynasty_Matrix.docx                   ← Strategy document
```

### Target Structure (V3)

```
silver-key-realty/
├── README.md                     ← This document
├── CHANGELOG.md                  ← Version history
├── index.html                    ← Landing page
├── buyer/index.html
├── seller/index.html
├── investor/index.html
├── rentals/index.html
├── assets/
│   ├── css/
│   │   ├── tokens.css            ← All design tokens
│   │   ├── base.css              ← Reset, typography, global
│   │   ├── nav.css               ← Navigation component
│   │   ├── hero.css              ← Hero section
│   │   ├── pathways.css          ← Pathway selector + cards
│   │   ├── sections.css          ← Philosophy, pillars, feature, etc.
│   │   └── responsive.css        ← All breakpoint overrides
│   ├── js/
│   │   ├── nav.js
│   │   ├── reveal.js
│   │   └── pathways.js
│   └── images/
│       ├── logo-transparent.png
│       └── logo-white.png
└── docs/
    ├── brand-guidelines.md       ← Extracted brand rules
    ├── copy-bank.md              ← All approved copy lines
    └── pathway-specs.md          ← Detailed pathway user flows
```

---

## 11. Integration Guidelines

### 11.1 Using This Document in Cursor

This README is structured as a **single source of truth** for any AI-assisted development. When opening the project in Cursor:

1. **Always reference this file first** before making design decisions
2. **Color tokens are non-negotiable** — use CSS variables, never hardcoded hex values
3. **Green opacity rules must be followed** — review section 3.1 before any green usage
4. **Typography pairings are locked** — Cormorant Garamond + Outfit only
5. **Animation easing is global** — `cubic-bezier(0.22, 1, 0.36, 1)` everywhere

### 11.2 Adding New Components

When creating any new component for the site:

```
1. Check if a similar pattern exists in V2 (section 4)
2. Use design tokens from section 3
3. Follow interaction patterns from section 7
4. Match content tone from section 8
5. Test against responsive breakpoints from section 9.3
```

**New component checklist:**
- [ ] Uses CSS variables from tokens (no hardcoded values)
- [ ] Has scroll reveal animation (`.reveal` class)
- [ ] Green effects follow recessed lighting rules
- [ ] Typography matches hierarchy from section 3.2
- [ ] Works at mobile breakpoint (900px)
- [ ] Hover states use correct easing curve
- [ ] Copy follows voice guidelines from section 8

### 11.3 GitHub Workflow

```
main              ← Production (current deployed version)
├── develop       ← Integration branch
│   ├── v3/landing-page    ← Landing page rebuild with pathway selector
│   ├── v3/buyer-pathway   ← Buyer journey pages
│   ├── v3/seller-pathway  ← Seller journey pages
│   └── v3/investor-pathway ← Investor journey pages
```

**Commit message format:**
```
[section] description

[hero] Add pathway selector cards below hero
[buyer] Create first-time buyer resource page
[design] Update green opacity on pillar hover states
[fix] Correct mobile nav collapse behavior
```

### 11.4 External System Integration Points

| System | Purpose | Integration Type |
|--------|---------|-----------------|
| Agent websites | Individual agent profiles/pages | Link-out from agent directory |
| Property management | Rental inventory | Redirect or iframe from /rentals |
| CRM | Lead capture from pathway forms | API or form submission |
| MLS/IDX | Property search (future) | Widget or API integration |
| Pre-approval partners | Lender connections | Referral links from buyer pathway |
| KelleyReno | Construction intelligence | Developer/investor pathway reference |

---

## 12. Source Intelligence

### 12.1 Research Foundations

This design system and architecture is informed by analysis of:

| Source | What It Contributed |
|--------|-------------------|
| **Sotheby's Buyer Guide** | Curation-first UX pattern. Pre-qualification before engagement. User segmentation by engagement method. |
| **Berkshire Hathaway HomeServices** | Brand trust inheritance model. "Cabernet and Cream" as precedent for color-driven identity. Franchise-adjacent scaling model. Agent as secondary user to resident as primary. |
| **Wharton Real Estate Curriculum** | Prerequisite chain logic — foundation before depth. Educational progression as user journey model. |
| **Zell/Lurie "Homeownership & Commercial RE"** | Investment thesis backbone. Homeownership = 1/3 investment + 2/3 consumption. Silver Key proposition: collapse that gap through designed community. 0.38 correlation data supports hybrid asset class. |
| **BHHS 2024 Brand Brochure** | 158-page visual brand book as precedent — at scale, the brand IS the product. Visual identity communicates before copy does. |
| **Empath Conversation (Transcript 1)** | 25-year operational intelligence. Branch-and-tree progressive disclosure model. Renter pathway addition. Education-first principle. "Don't buy a home. Buy the experience." |
| **Trigram Conversation (Transcript 2)** | Four-pathway taxonomy locked: Buyer, Seller, Investor, Renter. Three primary + one tertiary visual hierarchy. Rental operational separation confirmed. KelleyReno routing pattern as proven precedent. |

### 12.2 Competitive Positioning

```
Traditional Brokerage:  Transaction → Close → Done
BHHS:                   Brand Trust → Transaction → Close → Done
Sotheby's:              Curation → Qualification → Transaction → Close → Done
Silver Key Realty:       Education → Curation → Relationship → Investment → Community → Dynasty
                         (the relationship never ends — the close is the beginning)
```

---

## Appendix: Version History

| Version | Date | Changes |
|---------|------|---------|
| V1 | 2026-02-12 | Initial landing page. SVG key logo. Champagne/cream palette. Single buyer pathway. |
| V2 | 2026-02-12 | Added Silver Key Realty LLC logo (embedded base64). Introduced green recessed lighting system. Logo in nav, hero watermark, footer. |
| V3 | In Progress | Four-pathway architecture. Pathway selector post-hero. Multi-page structure. Buyer/Seller/Investor dedicated journeys. Renter redirect. |

---

*This document is the source of truth for Silver Key Realty's digital presence. All design decisions, component additions, and architectural changes should reference and update this document.*
