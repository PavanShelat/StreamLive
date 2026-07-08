// src/constants/Colors.ts
// Design system color tokens — dark-first, vibrant accent palette

const tint = '#FF3B5C'    // Electric red-pink accent
const accent2 = '#A855F7' // Purple accent

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tint,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tint,
  },
  brand: {
    primary: tint,         // #FF3B5C
    secondary: accent2,    // #A855F7
    live: '#FF3B5C',
    ended: '#6B7280',
    bg: '#0D0D0F',         // Deep near-black
    surface: '#1A1A1F',    // Card surface
    surfaceHigh: '#252530', // Elevated surface
    border: '#2A2A35',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    gradient1: '#FF3B5C',
    gradient2: '#A855F7',
  },
}
