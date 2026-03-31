# Design System Document

## 1. Overview & Creative North Star: "The Kinetic Architect"
In the high-velocity world of ClickHouse log querying, speed is often at odds with clarity. This design system rejects the cluttered "dashboard-itis" of traditional enterprise tools. Our Creative North Star is **"The Kinetic Architect."** 

We view the interface not as a static page, but as a responsive, living blueprint. By leveraging **intentional asymmetry**, **tonal layering**, and **editorial typography**, we transform raw data into a narrative. We move beyond the "bootstrap" look by utilizing a "No-Line" philosophy—where structure is defined by the weight of light and the shift of surfaces rather than rigid borders. The result is a system that feels intelligent (AI-assisted), reliable (structurally sound), and efficient (zero visual friction).

---

## 2. Colors: Tonal Depth & The Kinetic Orange
Our palette avoids the "flat" look by using Material Design 3-inspired tonal shifts. The primary orange is not just a color; it is a beacon for action.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using `1px solid` borders for sectioning or layout containment. Use background color shifts (e.g., a `surface-container-low` component sitting on a `surface` background) to define boundaries. This creates a more sophisticated, "un-boxed" appearance.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, semi-translucent sheets. 
- **Base Layer:** `surface` (#faf8ff)
- **Primary Layout Containers:** `surface-container-low` (#f2f3ff)
- **Active Interactive Elements:** `surface-container-highest` (#dae2fd)
- **Nesting:** To highlight a specific log entry within a list, do not use a border. Transition the background from `surface-container-low` to `surface-container-lowest` (#ffffff) to create a "lifted" effect.

### The "Glass & Gradient" Rule
To elevate the AI-assisted elements, use **Glassmorphism**: 
- Apply `surface` at 70% opacity with a `backdrop-blur: 12px`.
- **Signature Textures:** For primary CTAs (e.g., "Run Query"), use a subtle linear gradient from `primary` (#a33e00) to `primary_container` (#ff6600). This provides "visual soul" and depth that flat hex codes cannot achieve.

---

## 3. Typography: Editorial Authority
We pair the technical precision of **Inter** with the architectural character of **Space Grotesk**.

*   **Display & Headlines (Space Grotesk):** Used for Page Titles and Data Hero numbers. The wider apertures and geometric forms convey modern, intelligent authority.
*   **Body & Labels (Inter):** Used for log data, configuration forms, and UI controls. Inter provides maximum legibility at the small scales required for data-dense ClickHouse environments.

**Hierarchy as Identity:** 
- Use `display-sm` for aggregate counts (e.g., "4.2M Logs") to make data feel like a headline. 
- Use `label-sm` with increased letter-spacing (0.05rem) for metadata to ensure it remains readable but secondary.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are forbidden unless an element is "floating" (Modals/Popovers).

*   **The Layering Principle:** Depth is achieved by stacking `surface-container` tiers. A `surface-container-highest` card on a `surface` background creates a natural, soft lift.
*   **Ambient Shadows:** For floating AI-assist panels, use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(19, 27, 46, 0.06)`. Note the use of the `on-surface` color (#131b2e) for the shadow tint—never use pure black.
*   **The "Ghost Border" Fallback:** If a divider is mandatory for accessibility, use `outline-variant` (#e3bfb1) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Precision Primitives

### High-Quality Data Tables
*   **Structure:** No vertical or horizontal lines. Use `surface-container-low` for the header and `surface-container-lowest` for alternating rows (zebra striping) at 40% opacity.
*   **Spacing:** Use `spacing-3` for vertical cell padding to maintain density without sacrificing readability.
*   **Hover:** On hover, transition the row background to `primary_fixed` (#ffdbcd) at 20% opacity.

### The "Log-Stream" Chip
*   **Style:** Pill-shaped (`rounded-full`). 
*   **Color:** Use `secondary_container` (#d5e3fc) with `on_secondary_container` text. This provides a cool contrast to the "hot" Primary Orange used for highlights.

### Primary Action Buttons
*   **Visuals:** Gradient fill (`primary` to `primary_container`). 
*   **Corner Radius:** Use `xl` (0.75rem) for a modern, approachable feel that offsets the "brutal" nature of raw logs.
*   **AI-Enhanced States:** Buttons that trigger AI insights should feature a subtle 1px "Ghost Border" using the `tertiary` (#0062a1) token.

### Form Elements (Configuration)
*   **Inputs:** Utilize `surface-container-highest` as the input background. No borders. On focus, use a 2px `surface_tint` (#a33e00) bottom-border only.
*   **Validation:** Error states must use `error` (#ba1a1a) but should be paired with an `error_container` (#ffdad6) background wash over the entire input field.

### Intelligent Breadcrumbs
*   **Style:** Overlapping "Chevrons" are replaced by simple `/` dividers in `outline` (#8e7164). Use `label-md` for the text. The current page should always be `on_surface` (Bold), while parents are `on_surface_variant`.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `spacing-8` and `spacing-10` to create "Breathing Zones" between major functional areas (e.g., Sidebar vs. Main Query Area).
*   **Do** use Glassmorphism for the Sidebar navigation to allow the `background` color to bleed through, making the sidebar feel like a part of the environment, not a wall.
*   **Do** utilize the `tertiary` blue palette for AI-assisted suggestions to distinguish "system-generated" versus "human-queried" data.

### Don'ts
*   **Don't** use `100%` opaque black for text. Always use `on_surface` (#131b2e) to maintain a premium, high-end optical balance.
*   **Don't** use standard "Select Boxes." Use custom Trigger/Popover combinations with the Tonal Layering rules.
*   **Don't** use sharp corners (`none` or `sm`) for containers. This system relies on `md` and `lg` roundedness to feel modern and "intelligent."

---

## 7. Signature Layout: The Asymmetric Grid
Instead of a centered, symmetrical layout, the query results (the most "efficient" part of the tool) should occupy 70% of the viewport, with a 30% "Context Panel" (AI insights, saved queries) on the right. This asymmetry creates a "F-Pattern" focal point that guides the eye directly to the ClickHouse data stream.