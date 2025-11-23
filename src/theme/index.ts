/**
 * Theme System
 * Centralized design tokens for consistent UI
 */

export { colors } from './colors';
export { typography, textStyles } from './typography';
export { spacing, borderRadius, shadows } from './spacing';
export { animations } from './animations';

// Re-export everything as a single theme object
import { colors } from './colors';
import { typography, textStyles } from './typography';
import { spacing, borderRadius, shadows } from './spacing';
import { animations } from './animations';

export const theme = {
  colors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  animations,
};

export default theme;
