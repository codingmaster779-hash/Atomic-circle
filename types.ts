
export interface Point {
  x: number;
  y: number;
}

export interface CircleResult {
  score: number;
  centerX: number;
  centerY: number;
  radius: number;
  message: string;
  isTooSmall: boolean;
  notClosed: boolean;
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  DRAWING = 'DRAWING',
  RATED = 'RATED',
}

export type ThemeType = 'indigo' | 'dark' | 'neon' | 'rose' | 'cyberpunk' | 'ocean' | 'sunset' | 'lava' | 'monochrome';

export interface AppTheme {
  primary: string;
  secondary: string;
  bg: string;
  card: string;
  text: string;
  accent: string;
}
