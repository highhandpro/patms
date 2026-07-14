export interface ThemePalette {
  name: string;
  colors: string[]; // representative colors shown as swatches (Primary, Accent, Background, etc.)
  variables: Record<string, string>;
}

export const COLOR_PALETTES: Record<string, ThemePalette> = {
  default: {
    name: 'Penny Ante Blue & Teal (Default)',
    colors: ['#0F1926', '#0477BF', '#77D0CB', '#F8F4F3', '#E6EFFD'],
    variables: {
      '--bg-main': '#F8F4F3',
      '--bg-surface': '#0F1926',
      '--border-focus': '#0477BF',
      '--color-emerald': '#0477BF',
      '--color-emerald-rgb': '4, 119, 191',
      '--color-emerald-glow': 'rgba(4, 119, 191, 0.1)',
      '--text-emerald': '#0477BF',
      '--bg-card-hover': '#E6EFFD',
      '--color-gold': '#77D0CB',
      '--color-gold-rgb': '119, 208, 203',
      '--color-gold-glow': 'rgba(119, 208, 203, 0.1)',
      '--text-gold': '#77D0CB',
      '--text-primary': '#0F1926',
      '--color-danger': '#800020',
      '--color-danger-rgb': '128, 0, 32',
      '--color-danger-glow': 'rgba(128, 0, 32, 0.1)',
    }
  },
  pennyantegreen: {
    name: 'Penny Ante Green',
    colors: ['#0B6B2A', '#D4AF37', '#F5F7F5'],
    variables: {
      '--bg-main': '#F5F7F5',
      '--bg-surface': '#0B6B2A',
      '--border-focus': '#0B6B2A',
      '--color-emerald': '#0B6B2A',
      '--color-emerald-rgb': '11, 107, 42',
      '--color-emerald-glow': 'rgba(11, 107, 42, 0.1)',
      '--text-emerald': '#0B6B2A',
      '--bg-card-hover': '#E8F5E9',
      '--color-gold': '#D4AF37',
      '--color-gold-rgb': '212, 175, 55',
      '--color-gold-glow': 'rgba(212, 175, 55, 0.1)',
      '--text-gold': '#D4AF37',
      '--text-primary': '#1F2937',
      '--color-danger': '#D93A2F',
      '--color-danger-rgb': '217, 58, 47',
      '--color-danger-glow': 'rgba(217, 58, 47, 0.1)',
    }
  },
  royalblue: {
    name: 'Royal Blue & Gold',
    colors: ['#1E3A8A', '#D4AF37', '#F3F4F6'],
    variables: {
      '--bg-main': '#F3F4F6',
      '--bg-surface': '#1E3A8A',
      '--border-focus': '#1E3A8A',
      '--color-emerald': '#1E3A8A',
      '--color-emerald-rgb': '30, 58, 138',
      '--color-emerald-glow': 'rgba(30, 58, 138, 0.1)',
      '--text-emerald': '#1E3A8A',
      '--bg-card-hover': '#EFF6FF',
      '--color-gold': '#D4AF37',
      '--color-gold-rgb': '212, 175, 55',
      '--color-gold-glow': 'rgba(212, 175, 55, 0.1)',
      '--text-gold': '#D4AF37',
      '--text-primary': '#1F2937',
      '--color-danger': '#D93A2F',
      '--color-danger-rgb': '217, 58, 47',
      '--color-danger-glow': 'rgba(217, 58, 47, 0.1)',
    }
  },
  vegasred: {
    name: 'Vegas Black & Red',
    colors: ['#1A1A1A', '#DC2626', '#F9FAFB'],
    variables: {
      '--bg-main': '#F9FAFB',
      '--bg-surface': '#1A1A1A',
      '--border-focus': '#DC2626',
      '--color-emerald': '#DC2626',
      '--color-emerald-rgb': '220, 38, 38',
      '--color-emerald-glow': 'rgba(220, 38, 38, 0.1)',
      '--text-emerald': '#DC2626',
      '--bg-card-hover': '#FEF2F2',
      '--color-gold': '#D4AF37',
      '--color-gold-rgb': '212, 175, 55',
      '--color-gold-glow': 'rgba(212, 175, 55, 0.1)',
      '--text-gold': '#D4AF37',
      '--text-primary': '#1F2937',
      '--color-danger': '#D93A2F',
      '--color-danger-rgb': '217, 58, 47',
      '--color-danger-glow': 'rgba(217, 58, 47, 0.1)',
    }
  },
  emerald: {
    name: 'Deep Emerald & Gold',
    colors: ['#064E3B', '#F59E0B', '#ECFDF5'],
    variables: {
      '--bg-main': '#ECFDF5',
      '--bg-surface': '#064E3B',
      '--border-focus': '#059669',
      '--color-emerald': '#059669',
      '--color-emerald-rgb': '5, 150, 105',
      '--color-emerald-glow': 'rgba(5, 150, 105, 0.1)',
      '--text-emerald': '#059669',
      '--bg-card-hover': '#E6FDF5',
      '--color-gold': '#F59E0B',
      '--color-gold-rgb': '245, 158, 11',
      '--color-gold-glow': 'rgba(245, 158, 11, 0.1)',
      '--text-gold': '#F59E0B',
      '--text-primary': '#1F2937',
      '--color-danger': '#D93A2F',
      '--color-danger-rgb': '217, 58, 47',
      '--color-danger-glow': 'rgba(217, 58, 47, 0.1)',
    }
  },
  burgundy: {
    name: 'Burgundy & Champagne',
    colors: ['#7F1D1D', '#F59E0B', '#FEF2F2'],
    variables: {
      '--bg-main': '#FEF2F2',
      '--bg-surface': '#7F1D1D',
      '--border-focus': '#B91C1C',
      '--color-emerald': '#B91C1C',
      '--color-emerald-rgb': '185, 28, 28',
      '--color-emerald-glow': 'rgba(185, 28, 28, 0.1)',
      '--text-emerald': '#B91C1C',
      '--bg-card-hover': '#FFF5F5',
      '--color-gold': '#F59E0B',
      '--color-gold-rgb': '245, 158, 11',
      '--color-gold-glow': 'rgba(245, 158, 11, 0.1)',
      '--text-gold': '#F59E0B',
      '--text-primary': '#1F2937',
      '--color-danger': '#D93A2F',
      '--color-danger-rgb': '217, 58, 47',
      '--color-danger-glow': 'rgba(217, 58, 47, 0.1)',
    }
  }
};

export const applyThemePalette = (paletteKey: string) => {
  const palette = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.default;
  const root = document.documentElement;
  Object.entries(palette.variables).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
};
