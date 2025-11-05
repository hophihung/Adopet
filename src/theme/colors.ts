/**
 * Theme Colors - Pet-friendly colors
 * Màu chủ đạo: Warm Orange (#FF8C42) - Ấm áp, thân thiện, liên quan đến PET
 * Inspirations: Màu lông chó/mèo, màu nắng, màu tự nhiên
 */

export const colors = {
  // Primary colors - Màu chủ đạo (Pet Orange)
  primary: '#FF8C42',      // Warm Orange - Màu chính (giống màu lông pet)
  primaryDark: '#FF6B35',  // Orange đậm
  primaryLight: '#FFB366', // Orange nhạt
  primarySoft: '#FFF4EB',  // Orange rất nhạt (background)
  
  // Neutral colors - Màu trung tính
  background: '#FFFFFF',    // Nền trắng
  backgroundSecondary: '#F8F9FA', // Nền xám nhạt
  surface: '#FFFFFF',       // Card/container
  surfaceElevated: '#F8F9FA', // Card nổi
  
  // Text colors
  text: '#1F2937',          // Text chính - Xám đậm
  textSecondary: '#6B7280', // Text phụ - Xám vừa
  textTertiary: '#9CA3AF',  // Text nhạt - Xám nhạt
  textInverse: '#FFFFFF',   // Text trên nền tối
  
  // Border & Divider
  border: '#E5E7EB',       // Border nhạt
  borderLight: '#F3F4F6',   // Border rất nhạt
  divider: '#E5E7EB',      // Divider
  
  // Status colors - Đơn giản, không chói
  success: '#10B981',       // Xanh lá nhẹ
  warning: '#F59E0B',       // Vàng cam nhẹ
  error: '#EF4444',         // Đỏ nhẹ
  info: '#3B82F6',          // Xanh dương nhẹ
  
  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#FF8C42',
  tabBarInactive: '#9CA3AF',
  
  // Pet-specific colors
  petOrange: '#FF8C42',      // Primary pet color
  petCoral: '#FF6B9D',       // Cat-inspired pink
  petSky: '#87CEEB',         // Dog-inspired blue
  petSun: '#FFB347',         // Bird-inspired yellow
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export type ColorTheme = typeof colors;

