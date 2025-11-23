import { Animated, Easing } from 'react-native';

/**
 * Animation presets for smooth, professional animations
 * Inspired by TikTok, Tinder, and other modern apps
 */

export const animations = {
  // Timing configurations
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Easing functions
  easing: {
    smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
    bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
    easeOut: Easing.out(Easing.cubic),
    easeIn: Easing.in(Easing.cubic),
    linear: Easing.linear,
  },

  // Spring configurations
  spring: {
    gentle: {
      tension: 50,
      friction: 7,
    },
    bouncy: {
      tension: 100,
      friction: 3,
    },
    stiff: {
      tension: 200,
      friction: 10,
    },
  },

  // Common animation functions
  fadeIn: (animatedValue: Animated.Value, duration = 300, delay = 0) => {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    });
  },

  fadeOut: (animatedValue: Animated.Value, duration = 300, delay = 0) => {
    return Animated.timing(animatedValue, {
      toValue: 0,
      duration,
      delay,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    });
  },

  slideUp: (animatedValue: Animated.Value, duration = 300, delay = 0) => {
    return Animated.spring(animatedValue, {
      toValue: 0,
      delay,
      useNativeDriver: true,
      ...animations.spring.gentle,
    });
  },

  slideDown: (animatedValue: Animated.Value, toValue = 50, duration = 300, delay = 0) => {
    return Animated.spring(animatedValue, {
      toValue,
      delay,
      useNativeDriver: true,
      ...animations.spring.gentle,
    });
  },

  scale: (animatedValue: Animated.Value, toValue = 1, duration = 300, delay = 0) => {
    return Animated.spring(animatedValue, {
      toValue,
      delay,
      useNativeDriver: true,
      ...animations.spring.bouncy,
    });
  },

  // Like button animation (TikTok style)
  likeAnimation: (scaleValue: Animated.Value) => {
    return Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 1.3,
        useNativeDriver: true,
        ...animations.spring.bouncy,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        ...animations.spring.bouncy,
      }),
    ]);
  },

  // Entrance animation for lists
  staggeredEntrance: (items: Animated.Value[], delay = 50) => {
    return Animated.stagger(
      delay,
      items.map((item) =>
        Animated.parallel([
          animations.fadeIn(item, 400),
          animations.slideUp(item, 400),
        ])
      )
    );
  },
};

export default animations;
