/**
 * Theme Colors - Light Theme với màu cam chủ đạo
 * Background trắng, màu cam cho buttons và accents
 */

export const colors = {
  // Primary colors - Màu chủ đạo (Pet Orange)
  primary: '#FF8C42',      // Warm Orange - Màu chính
  primaryDark: '#FF6B35',  // Orange đậm
  primaryLight: '#FFB366', // Orange nhạt
  primarySoft: '#FFF4EB',  // Orange rất nhạt (background)
  
  // Neutral colors - Light theme
  background: '#FFFFFF',    // Nền trắng
  backgroundSecondary: '#F8F9FA', // Nền xám nhạt
  backgroundTertiary: '#F5F7FA',  // Nền xám cho cards
  surface: '#FFFFFF',       // Card/container trắng
  surfaceElevated: '#F8F9FA', // Card nổi xám nhạt
  
  // Text colors - Dark text on light
  text: '#1F2937',          // Text chính - Xám đậm
  textSecondary: '#6B7280', // Text phụ - Xám vừa
  textTertiary: '#9CA3AF',  // Text nhạt - Xám nhạt
  textInverse: '#FFFFFF',   // Text trên nền tối
  
  // Border & Divider - Subtle on light
  border: '#E5E7EB',       // Border xám nhạt
  borderLight: '#F3F4F6',   // Border rất nhạt
  divider: '#E5E7EB',      // Divider
  
  // Status colors - Vibrant but not harsh
  success: '#10B981',       // Green
  warning: '#F59E0B',       // Orange
  error: '#EF4444',         // Red
  info: '#3B82F6',          // Blue
  
  // Tab bar - Light with glass effect
  tabBarBackground: '#FFFFFF', // Trắng
  tabBarActive: '#FF8C42',
  tabBarInactive: '#9CA3AF',
  
  // Pet-specific colors - Adjusted for dark theme
  petOrange: '#FF8C42',      // Giữ màu pet nhưng sáng hơn
  petCoral: '#FF6B9D',       // Cat-inspired pink
  petSky: '#87CEEB',         // Dog-inspired blue
  petSun: '#FFB347',         // Bird-inspired yellow
  
  // Overlay - Light overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Glassmorphism effects
  glassBackground: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.1)',
  
  // Gradient colors for modern effects
  gradientStart: '#FFFFFF',
  gradientEnd: '#F8F9FA',
};

export type ColorTheme = typeof colors;

