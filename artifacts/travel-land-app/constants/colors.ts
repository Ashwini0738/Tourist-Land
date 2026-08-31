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
    text: '#17232b',
    tint: '#d9825b',

    // Core surfaces
    background: '#f8f7f3',
    foreground: '#17232b',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#17232b',

    // Primary action color (buttons, links, active states)
    primary: '#143f4a',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e9f0ec',
    secondaryForeground: '#24443d',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#f0ede7',
    mutedForeground: '#718087',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#e7b76b',
    accentForeground: '#633d20',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#dfe5e2',
    input: '#cbd8d3',
    navy: '#102d3a',
    onNavy: '#f8f7f3',
    coral: '#d9825b',
    success: '#2d8063',
    warning: '#b66e2c',
    overlay: 'rgba(16,45,58,0.58)',
  },

  dark: {
    text: '#f3f5f0',
    tint: '#e6a17c',
    background: '#10202a',
    foreground: '#f3f5f0',
    card: '#18303b',
    cardForeground: '#f3f5f0',
    primary: '#8fc4b2',
    primaryForeground: '#102d3a',
    secondary: '#203c42',
    secondaryForeground: '#dcece3',
    muted: '#1c333c',
    mutedForeground: '#a4b7b5',
    accent: '#e7b76b',
    accentForeground: '#3d2918',
    destructive: '#f58a83',
    destructiveForeground: '#351414',
    border: '#2d4650',
    input: '#41606a',
    navy: '#091d28',
    onNavy: '#f3f5f0',
    coral: '#e6a17c',
    success: '#8fc4b2',
    warning: '#e7b76b',
    overlay: 'rgba(5,18,25,0.68)',
  },

  radius: 14,
};

export default colors;
