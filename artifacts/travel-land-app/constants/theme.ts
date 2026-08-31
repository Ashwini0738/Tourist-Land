export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const typeScale = {
  display: { fontSize: 34, lineHeight: 39, fontWeight: '700' as const, letterSpacing: -1.1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.7 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.3 },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' as const },
  label: { fontSize: 11, lineHeight: 15, fontWeight: '700' as const, letterSpacing: 1.2 },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
  price: { fontSize: 16, lineHeight: 20, fontWeight: '700' as const },
} as const;

export const elevation = {
  card: {
    shadowColor: '#102d3a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#102d3a',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
} as const;