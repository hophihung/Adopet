// Modern Theme - Inspired by Tinder + Duolingo
export const modernTheme = {
  // Primary Colors - Vibrant and playful
  colors: {
    // Main brand colors
    primary: '#FF6B6B',        // Coral red (Tinder-inspired)
    primaryDark: '#FF5252',
    primaryLight: '#FFB3B3',
    primarySoft: '#FFF0F0',
    
    // Secondary colors
    secondary: '#4ECDC4',      // Turquoise (Duolingo-inspired)
    secondaryDark: '#3DBDB4',
    secondaryLight: '#7FE3DC',
    
    // Accent colors
    accent: '#FFE66D',         // Sunny yellow
    accentDark: '#FFD93D',
    accentLight: '#FFF4B3',
    
    // Semantic colors
    success: '#58CC02',        // Duolingo green
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    // Neutrals
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F8F9FA',
    
    // Text
    text: '#1A1A1A',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    
    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    borderDark: '#D1D5DB',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    
    // Gradients
    gradientPrimary: ['#FF6B6B', '#FF8E53'],
    gradientSecondary: ['#4ECDC4', '#44A08D'],
    gradientAccent: ['#FFE66D', '#FFBE0B'],
    gradientSunset: ['#FF6B6B', '#FFE66D'],
    gradientOcean: ['#4ECDC4', '#5AC8FA'],
  },
  
  // Typography
  typography: {
    // Font families
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    
    // Font sizes
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    
    // Line heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    
    // Font weights
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  
  // Border radius
  borderRadius: {
    none: 0,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    colored: {
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
  
  // Animations
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      spring: 'spring',
    },
  },
};

export type ModernTheme = typeof modernTheme;
