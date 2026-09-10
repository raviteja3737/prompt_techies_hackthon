---
version: alpha
name: Prompt Techies
description: >-
  Prompt Techies is an AI-first technology company empowering students, startups, and colleges through intelligent
  workshops, hackathons, and scalable digital product development. The brand combines neon-electric aesthetics with
  precision engineering to communicate innovation and technical excellence.
logo:
  src: https://prompttechies.in/logo.jpg
  srcDark: https://prompttechies.in/logo.jpg
colors:
  surface: '#ffffff'
  surface-dim: '#f5f5f5'
  surface-bright: '#ffffff'
  surface-container-lowest: '#fafafa'
  surface-container-low: '#f0f0f0'
  surface-container: '#e8e8e8'
  surface-container-high: '#d9d9d9'
  surface-container-highest: '#cccccc'
  on-surface: '#171717'
  on-surface-variant: '#6a7282'
  inverse-surface: '#0a0a0a'
  inverse-on-surface: '#ffffff'
  outline: '#99a1af'
  outline-variant: '#d1d5dc'
  surface-tint: '#004bff'
  primary: '#004bff'
  on-primary: '#ffffff'
  primary-container: '#003cb3'
  on-primary-container: '#e8f0ff'
  inverse-primary: '#00c8ff'
  secondary: '#00c8ff'
  on-secondary: '#0a0a0a'
  secondary-container: '#00b0e0'
  on-secondary-container: '#ffffff'
  tertiary: '#ffe07d'
  on-tertiary: '#0a0a0a'
  tertiary-container: '#f5af19'
  on-tertiary-container: '#ffffff'
  error: '#e65c00'
  on-error: '#ffffff'
  error-container: '#ffb4ab'
  on-error-container: '#0a0a0a'
  primary-fixed: '#003cb3'
  primary-fixed-dim: '#004bff'
  on-primary-fixed: '#ffffff'
  on-primary-fixed-variant: '#e8f0ff'
  secondary-fixed: '#00b0e0'
  secondary-fixed-dim: '#00c8ff'
  on-secondary-fixed: '#0a0a0a'
  on-secondary-fixed-variant: '#ffffff'
  tertiary-fixed: '#f5af19'
  tertiary-fixed-dim: '#ffe07d'
  on-tertiary-fixed: '#0a0a0a'
  on-tertiary-fixed-variant: '#ffffff'
  background: '#ffffff'
  on-background: '#171717'
  surface-variant: '#e5e7eb'
typography:
  display:
    fontFamily: Geist
    fontSize: 72px
    fontWeight: '400'
    lineHeight: 84px
    letterSpacing: '-0.02em'
  headline-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: '-0.01em'
  headline-md:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: 0em
  title-lg:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  container-max: 1400px
elevation:
  sm: 0 1px 2px rgba(0, 0, 0, 0.06)
  md: 0 4px 12px rgba(0, 0, 0, 0.08)
  lg: 0 8px 32px rgba(0, 0, 0, 0.37)
layout:
  containerMaxWidth: 1400px
  gridColumns: 12
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.full}'
    padding: 10px 20px
    height: 40px
    boxShadow: 0 2px 8px rgba(0, 75, 255, 0.2)
  button-primary-hover:
    backgroundColor: '{colors.primary-container}'
    boxShadow: 0 4px 16px rgba(0, 75, 255, 0.3)
  button-secondary:
    backgroundColor: transparent
    textColor: '{colors.primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.full}'
    padding: 10px 20px
    height: 40px
    border: 2px solid {colors.primary}
  button-secondary-hover:
    backgroundColor: '{colors.surface-container-low}'
    border: 2px solid {colors.primary-container}
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: '{spacing.md}'
    boxShadow: '{elevation.md}'
    border: 1px solid {colors.outline-variant}
  card-hover:
    backgroundColor: '{colors.surface-container-low}'
    boxShadow: '{elevation.lg}'
  input-field:
    backgroundColor: rgba(0, 0, 0, 0)
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.full}'
    padding: 12px 20px
    border: 1px solid {colors.outline-variant}
    height: 44px
  input-field-focus:
    borderColor: '{colors.primary}'
    boxShadow: 0 0 0 3px rgba(0, 75, 255, 0.1)
  badge:
    backgroundColor: '{colors.tertiary-container}'
    textColor: '{colors.on-tertiary-container}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: 6px 12px
  badge-secondary:
    backgroundColor: '{colors.secondary-container}'
    textColor: '{colors.on-secondary-container}'
  list-item:
    backgroundColor: transparent
    rounded: '{rounded.md}'
    padding: '{spacing.sm}'
    textColor: '{colors.on-surface}'
  list-item-hover:
    backgroundColor: '{colors.surface-container-low}'
    textColor: '{colors.primary}'
---

## Overview

Prompt Techies embodies a **Neon-Technical Futurism** aesthetic—a design language that merges electric cyan (#00c8ff) and cobalt blue (#004bff) accents with a clean, light-neutral canvas to communicate cutting-edge AI innovation and developer-first engineering. The brand serves ambitious students, startups, and enterprises seeking scalable, intelligent technology solutions. The visual identity evokes precision, energy, and forward momentum through bold color contrasts, geometric line work, and a minimalist interface hierarchy that prioritizes clarity over decoration.

The tone is direct, confident, and technically grounded—never breathless or hyperbolic. Prompt Techies speaks to builders and makers: the language is action-oriented, specific, and outcome-focused. Example: "Transform ambitious ideas into enterprise-ready digital products" (not "Unlock your potential"). The brand personality balances technical credibility with approachability; it's expert-level but not gatekeeping, innovative but not experimental.

## Colors

The color system is built on a **light-neutral foundation with electric accents**. The primary color, Cobalt Blue (#004bff), is the signature CTA and interactive accent—used on buttons, links, focus states, and brand-critical UI elements. It commands attention without overwhelming the interface. Secondary, Cyan (#00c8ff), provides a complementary accent for highlights, hover states, and secondary CTAs, creating visual rhythm and depth. Tertiary, Golden Yellow (#ffe07d) and Warm Amber (#f5af19), are reserved for badges, status indicators, and accent highlights that require warm energy.

Surface colors follow a light-first strategy: pure white (#ffffff) as the primary surface, with carefully calibrated grays (#f5f5f5 to #cccccc) for container hierarchy and depth. On-surface text is near-blac

## Typography

The type system uses **Geist** as the primary typeface—a modern, geometric sans-serif that communicates technical precision and contemporary design sensibility. Display (72px, 400 weight, -0.02em tracking) anchors hero sections with commanding presence; Headline-lg (40px, 600 weight) structures major sections; Body-md (16px, 400 weight, 24px line-height) ensures comfortable reading at standard viewing distances. Label-md (14px, 700 weight, 0.05em tracking) is applied to buttons and interactive labels to signal actionability. The hierarchy is intentionally flat—only 3–4 distinct sizes are used per page to avoid visual fragmentation. On small labels over busy backgrounds (e.g., badges on gradient overlays), apply text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15) to ensure legibility. Letter-spacing

## Layout

The layout uses a **12-column fluid grid** with a max-width of 1400px, centered on viewport. Sections use lg spacing (40px) for vertical rhythm between major content blocks; gutter (24px) is applied to horizontal padding on mobile and tablet, increasing to 40px on desktop. The hero section occupies 100vh with a dark gradient background (#0a0a0a to #0c0c0e) overlaid with animated neon line work, creating visual depth and energy. Content sections below use white backgrounds with subtle container shadows (0 4px 12px rgba(0, 0, 0, 0.08)) to separate layers. Cards and components use md spacing (24px) internally; list items use sm spacing (12px) for compact density. Whitespace is generous but purposeful—never more than 64px (xl) between major sections, never less than 24px within components. Con

## Elevation & Depth

Depth is conveyed through **layered shadows and subtle surface transitions** rather than dramatic elevation. The base layer (Level 1) is the white surface (#ffffff) with no shadow. Level 2 (cards, modals) uses box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08)—a soft, diffuse shadow that suggests gentle lift. Level 3 (floating elements, popovers) uses box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37)—a larger blur radius and offset to create pronounced separation. Interactive elements (buttons, inputs) receive a focused shadow on hover: 0 4px 16px rgba(0, 75, 255, 0.3), tinting the shadow with the primary bl

## Shapes

The shape language follows **Geometric Precision with Approachable Softness**. Buttons and interactive elements use full-radius (9999px / border-radius: 9999px) to signal friendliness and modernity while maintaining technical credibility. Cards and containers use lg radius (1rem / 16px) for a balanced, contemporary feel—sharp enough to feel intentional, soft enough to avoid harshness. Input fields match buttons at full-radius to create visual cohesion in forms. Smaller UI elements (badges, chips) also use full-radius for consistency. The only exception is the hero section's animated line work,

## Components

### Action Elements
Buttons are the primary interactive affordance. Primary buttons use #004bff background with white text, full-radius, 10px vertical / 20px horizontal padding, and 40px height. On hover, the background shifts to #003cb3 and the shadow expands to 0 4px 16px rgba(0, 75, 255, 0.3), creating a sense of lift and responsiveness. The transition duration is 200ms ease-out. Secondary buttons are transparent with a 2px solid #004bff border, same padding and height; on hover, the background becomes rgba(240, 240, 240, 1) and the border shifts to #003cb3. Ghost buttons (tertiary) use transparent background with #004bff text and no border; on hover, background becomes rgba(0, 75, 255, 0.05). All buttons use label-md typography (14px, 700 weight, 0.05em tracking) for maximum legibility

## Do's and Don'ts

**Do**
- Do use primary blue (#004bff) exclusively for CTAs, focus states, and brand-critical interactive elements—never dilute it with secondary uses.
- Do apply full-radius (9999px) to all buttons and input fields to maintain visual consistency and signal modern, approachable design.
- Do maintain generous whitespace (lg spacing: 40px) between major sections to avoid visual clutter and improve scannability.
- Do use the neon cyan (#00c8ff) and blue (#004bff) line work in hero sections to create atmospheric energy; blur at 8–40px for depth.
- Do apply box-shadow transitions on hover (200–300ms ease-out) to all interactive elements to signal responsiveness without jarring jumps.

**Don't**
- Don't use secondary colors (cyan, yellow) as primary CTAs—reserve them for accents, badges, and secondary interactions only.
- Don't apply sharp corners (0px radius) to buttons or inputs; the brand relies on full-radius for visual identity.
- Don't exceed 64px (xl spacing) between major sections; the layout should feel connected and rhythmic, not fragmented.
- Don't use drop-shadows on text except in specific cases (small labels over busy backgrounds); rely on color contrast and typography weight instead.
- Don't mix typefaces within a section; Geist is the primary typeface for all body and UI text—maintain consistency across the interface.
