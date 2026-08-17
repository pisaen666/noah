---
name: Block-Based Learning Odyssey
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bec7d4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#89919d'
  outline-variant: '#3f4852'
  surface-tint: '#99cbff'
  primary: '#99cbff'
  on-primary: '#003355'
  primary-container: '#00a2ff'
  on-primary-container: '#003659'
  inverse-primary: '#00629d'
  secondary: '#71ff74'
  on-secondary: '#003909'
  secondary-container: '#00e540'
  on-secondary-container: '#006015'
  tertiary: '#ffb4ab'
  on-tertiary: '#690005'
  tertiary-container: '#ff6d60'
  on-tertiary-container: '#6e0005'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#99cbff'
  on-primary-fixed: '#001d34'
  on-primary-fixed-variant: '#004a78'
  secondary-fixed: '#71ff74'
  secondary-fixed-dim: '#00e540'
  on-secondary-fixed: '#002203'
  on-secondary-fixed-variant: '#005311'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '900'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered to evoke the high-energy, sandbox atmosphere of modern digital gaming environments. Targeting a younger demographic, the UI prioritizes immediate visual feedback, structural clarity, and an adventurous spirit.

The style is a hybrid of **Modern Corporate** structure and **Brutalist-lite** gaming aesthetics. It utilizes a deep dark-mode foundation to make high-saturation interactive elements pop, simulating a "heads-up display" (HUD) feel. Layouts are characterized by heavy structural lines, blocky components, and neon-inspired state indicators that provide a tactile, responsive experience.

## Colors
The palette is built on a "True Black" and "Deep Charcoal" foundation to maximize contrast. 

- **Primary (Action Blue):** Used for main navigation, primary buttons, and progress indicators.
- **Secondary (Success Green):** Reserved for "Correct" states, leveling up, and completion rewards.
- **Tertiary (Alert Red):** Used for errors, health bars, or critical warnings.
- **Surface Tiers:** Backgrounds use `#000000`. Content containers use `#111111` or `#1B1D1E` with high-opacity borders to maintain structural integrity in dark mode.

## Typography
Typography is bold and authoritative. **Montserrat** is utilized for all display and heading roles, set at heavy weights (700-900) to mimic the "blocky" aesthetic of game title screens.

**Inter** handles functional text and body copy to ensure legibility during learning exercises. All labels should be uppercase with slightly increased letter spacing to enhance the "UI/HUD" feel. For mobile, headline sizes scale down aggressively to maintain screen real estate for interactive game elements.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a distinct "Card-based" organization. Spacing is strictly based on a 4px increment system to maintain alignment with the blocky visual language.

- **Mobile:** 4-column grid with 16px margins.
- **Tablet:** 8-column grid with 24px margins.
- **Desktop:** 12-column grid with a max-width of 1440px and 32px margins.

Gaps between components should feel substantial to prevent the UI from feeling cluttered, allowing the high-contrast borders and shadows to define the hierarchy.

## Elevation & Depth
Depth in this design system is achieved through physical metaphors rather than soft realism.

1.  **Block Shadows:** Instead of soft blurs, use 100% opacity offset shadows (e.g., `4px 4px 0px #000000`) to give buttons a 3D "pressed" appearance.
2.  **Semi-Transparent Overlays:** Use 70-80% opacity for modal backdrops and HUD overlays, allowing the "game world" (background) to remain visible.
3.  **Neon Glows:** Active or "Legendary" items should utilize an outer glow (bloom effect) using the component's primary color to signify high importance or energy.
4.  **Heavy Outlines:** All containers should feature a 1px or 2px solid border (`#333333`) to separate them from the pure black background.

## Shapes
This design system avoids the "bubbly" aesthetic common in early-childhood apps in favor of a more "pro-gamer" look. Corners are strictly **Soft (4px - 8px)**. 

Interactive elements like buttons and input fields should feel like physical blocks. Use a square aspect ratio for icons and badges wherever possible to reinforce the grid-based, modular nature of the design.

## Components

- **Buttons:** Large, blocky, and high-contrast. Primary buttons feature a "thick bottom border" effect (3px - 4px) that shifts upward by 2px when hovered or pressed to simulate a mechanical click.
- **Chips & Badges:** Used for difficulty levels or subjects. These should use vibrant background colors (Blue, Green, Red) with black text for maximum punch.
- **Input Fields:** Dark background (`#111111`) with a 2px stroke. The stroke glows with the Primary Blue when focused.
- **Progress Bars:** Thick, rectangular bars with no rounding. The background is a dark gray, while the "fill" is a vibrant gradient or solid Primary Green.
- **Cards:** Semi-transparent containers with a subtle 1px border. Cards should hover with a slight scale effect (1.02x) and a glow to indicate interactivity.
- **Inventory Slots:** Square boxes with heavy borders used for selecting rewards or lesson modules, mimicking a game inventory screen.