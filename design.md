# TaskFlow - Design Reference

This document captures the visual design decisions for TaskFlow, so anyone working on the UI later doesn't have to reverse-engineer choices from code.

## Brand Colors (from ProductSquads logo)

- **Design Violet:** '#6100E4'
- **Bright Purple:** '#9812FF'

These are TaskFlow's brand colors, matching the ProductSquads logo.

## Sidebar

- Background: deep violet gradient (`inkViolet` → darker violet)
- Active nav item: white text, bold (700 weight)
- Inactive nav item: brand violet text (`inkViolet`) for contrast against the bright background
- Section labels (Workspace/Manager/Director): uppercase, letter-spaced, muted white

## Typography

- **Headings:** Manrope (geometric, confident — used for page titles, card values, logo text)
- **Body/data:** Inter (clean, legible — used for labels, table content, form fields)

Loaded via Google Fonts in `index.html`.

## Color Palette

**Brand**
- Deep Violet (`inkViolet`): `#6100E4` — sidebar, primary gradients
- Bright Purple (`primary`): `#9812FF` — buttons, active states, accents

**Semantic (status colors)**
- Green: `#10B981` — success, approved states
- Amber: `#F59E0B` — warnings, pending states
- Coral: `#F87171` — errors, destructive actions, returned status

**Neutrals**
- Background: `#F8F6FC` — app background (purple-tinted)
- Surface: `#FFFFFF` — cards, modals
- Border: `#E9E7F0`
- Text Primary: `#1E1B2E`
- Text Secondary: `#4B4658`
- Text Muted: `#8B8599`

**Usage rule:** semantic colors (green/amber/coral) are reserved for status meaning only — never used decoratively. Brand purple is for interactive/primary elements.

## Component Patterns

**Cards**
- White background, 16px border radius, subtle border, light shadow
- Used for: stat cards, table containers, empty states

**Buttons (primary)**
- Purple gradient background, white text, bold, 10px radius
- Used for primary actions (Save, Submit, Create)

**Buttons (secondary)**
- Transparent background, bordered, muted text
- Used for: Edit, Cancel, Deactivate

**Destructive actions**
- Coral text/background, always require confirmation (Cancel/Confirm inline, not a browser popup)

**Modals**
- Centered, semi-transparent dark overlay, white card, X close button top-right
- Used for: Create/Edit forms, drill-down detail views

**Toasts**
- Top-right, slide-in animation, color-coded dot (green/coral/amber) + message, auto-dismiss after 3s

**Status badges**
- Pill-shaped, color-coded background + text (light tint background, solid text color)
- Used for: task status, submission status, active/inactive

## Logo

- Source: ProductSquads company logo (`PS_Logo.png`)
- Colors match brand palette (`#6100E4` / `#9812FF`)
- Current sidebar uses a placeholder "T" mark. The actual logo was tested in-app but didn't read well at sidebar scale/low resolution — revisit once a higher-resolution or simplified icon-only version of the mark is available.
- Available resolution: 200×57px — sufficient for sidebar use, too small for larger placements (e.g. login page hero)
- **Action item:** request a higher-res / vector (SVG) version from marketing/brand team for broader use

## Design Philosophy

TaskFlow's visual identity is built around ProductSquads actual brand colors — not a generic SaaS palette — so the tool feels distinctly ours, not templated. The deep violet sidebar is the signature element: premium, confident, immediately recognizable.

Functional color (green/amber/coral) is kept strictly separate from brand color (purple) — status always means something specific, brand color never competes with it for attention.

Typography pairs a geometric display font (Manrope) for personality with a clean, highly legible body font (Inter) for data-heavy screens like Log Time and Reports — since this is fundamentally a data entry and reporting tool, readability takes priority over decoration.