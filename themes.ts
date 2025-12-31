
import { AppTheme, ThemeType } from './types';

export const THEMES: Record<ThemeType, AppTheme> = {
  indigo: {
    primary: '#4f46e5',
    secondary: '#818cf8',
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    accent: '#e0e7ff'
  },
  dark: {
    primary: '#6366f1',
    secondary: '#4f46e5',
    bg: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    accent: '#334155'
  },
  neon: {
    primary: '#22c55e',
    secondary: '#4ade80',
    bg: '#050505',
    card: '#111111',
    text: '#ffffff',
    accent: '#14532d'
  },
  rose: {
    primary: '#e11d48',
    secondary: '#fb7185',
    bg: '#fff1f2',
    card: '#ffffff',
    text: '#4c0519',
    accent: '#ffe4e6'
  },
  cyberpunk: {
    primary: '#facc15',
    secondary: '#d946ef',
    bg: '#1a1b26',
    card: '#24283b',
    text: '#c0caf5',
    accent: '#3d59a1'
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#2dd4bf',
    bg: '#f0f9ff',
    card: '#ffffff',
    text: '#0c4a6e',
    accent: '#e0f2fe'
  },
  sunset: {
    primary: '#f59e0b',
    secondary: '#ec4899',
    bg: '#fff7ed',
    card: '#ffffff',
    text: '#7c2d12',
    accent: '#ffedd5'
  },
  lava: {
    primary: '#dc2626',
    secondary: '#f97316',
    bg: '#111111',
    card: '#1a1a1a',
    text: '#fecaca',
    accent: '#450a0a'
  },
  monochrome: {
    primary: '#171717',
    secondary: '#737373',
    bg: '#ffffff',
    card: '#f5f5f5',
    text: '#000000',
    accent: '#e5e5e5'
  }
};
