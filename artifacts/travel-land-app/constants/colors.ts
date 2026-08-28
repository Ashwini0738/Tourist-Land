/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#1f2a24',
    tint: '#c96f4a',

    // Core surfaces
    background: '#fbfaf6',
    foreground: '#1f2a24',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#1f2a24',

    // Primary action color (buttons, links, active states)
    primary: '#1f5a46',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#eef1e9',
    secondaryForeground: '#1f2a24',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#f3eee7',
    mutedForeground: '#718078',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#e8b478',
    accentForeground: '#5c351c',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e2e6df',
    input: '#d6ddd4',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
