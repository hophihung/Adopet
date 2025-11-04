import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { PetType, PetMood, getAnimationConfig } from '../../../config/virtualPet/animations';

interface PixelPetAnimationProps {
  petType: PetType;
  mood: PetMood;
  size?: number;
}

// Pixel art component cho từng loại pet
const PixelCat = () => (
  <View style={styles.pixelContainer}>
    {/* Ears */}
    <View style={[styles.pixel, { top: 0, left: 8, width: 12, height: 12, backgroundColor: '#FFB347' }]} />
    <View style={[styles.pixel, { top: 0, right: 8, width: 12, height: 12, backgroundColor: '#FFB347' }]} />
    {/* Head */}
    <View style={[styles.pixel, { top: 8, left: 10, width: 40, height: 32, backgroundColor: '#FFB347' }]} />
    {/* Eyes */}
    <View style={[styles.pixel, { top: 16, left: 20, width: 6, height: 6, backgroundColor: '#000' }]} />
    <View style={[styles.pixel, { top: 16, right: 20, width: 6, height: 6, backgroundColor: '#000' }]} />
    {/* Nose */}
    <View style={[styles.pixel, { top: 24, left: 27, width: 6, height: 4, backgroundColor: '#FF6B9D' }]} />
    {/* Body */}
    <View style={[styles.pixel, { top: 40, left: 12, width: 36, height: 40, backgroundColor: '#FFB347' }]} />
    {/* Legs */}
    <View style={[styles.pixel, { top: 80, left: 16, width: 8, height: 16, backgroundColor: '#FF9500' }]} />
    <View style={[styles.pixel, { top: 80, left: 28, width: 8, height: 16, backgroundColor: '#FF9500' }]} />
    <View style={[styles.pixel, { top: 80, right: 28, width: 8, height: 16, backgroundColor: '#FF9500' }]} />
    <View style={[styles.pixel, { top: 80, right: 16, width: 8, height: 16, backgroundColor: '#FF9500' }]} />
    {/* Tail */}
    <View style={[styles.pixel, { top: 48, right: -4, width: 12, height: 8, backgroundColor: '#FFB347' }]} />
  </View>
);

const PixelDog = () => (
  <View style={styles.pixelContainer}>
    {/* Ears */}
    <View style={[styles.pixel, { top: 4, left: 4, width: 16, height: 20, backgroundColor: '#2E5C8A' }]} />
    <View style={[styles.pixel, { top: 4, right: 4, width: 16, height: 20, backgroundColor: '#2E5C8A' }]} />
    {/* Head */}
    <View style={[styles.pixel, { top: 8, left: 10, width: 40, height: 32, backgroundColor: '#4A90E2' }]} />
    {/* Eyes */}
    <View style={[styles.pixel, { top: 16, left: 20, width: 6, height: 6, backgroundColor: '#000' }]} />
    <View style={[styles.pixel, { top: 16, right: 20, width: 6, height: 6, backgroundColor: '#000' }]} />
    {/* Nose */}
    <View style={[styles.pixel, { top: 24, left: 27, width: 6, height: 4, backgroundColor: '#000' }]} />
    {/* Body */}
    <View style={[styles.pixel, { top: 40, left: 12, width: 36, height: 40, backgroundColor: '#4A90E2' }]} />
    {/* Legs */}
    <View style={[styles.pixel, { top: 80, left: 16, width: 8, height: 16, backgroundColor: '#2E5C8A' }]} />
    <View style={[styles.pixel, { top: 80, left: 28, width: 8, height: 16, backgroundColor: '#2E5C8A' }]} />
    <View style={[styles.pixel, { top: 80, right: 28, width: 8, height: 16, backgroundColor: '#2E5C8A' }]} />
    <View style={[styles.pixel, { top: 80, right: 16, width: 8, height: 16, backgroundColor: '#2E5C8A' }]} />
    {/* Tail */}
    <View style={[styles.pixel, { top: 48, right: -4, width: 10, height: 24, backgroundColor: '#4A90E2' }]} />
  </View>
);

const PixelBird = () => (
  <View style={styles.pixelContainer}>
    {/* Head */}
    <View style={[styles.pixel, { top: 0, left: 18, width: 24, height: 20, backgroundColor: '#FFD700', borderRadius: 12 }]} />
    {/* Beak */}
    <View style={[styles.pixel, { top: 8, left: 12, width: 8, height: 6, backgroundColor: '#FFB347' }]} />
    {/* Eyes */}
    <View style={[styles.pixel, { top: 4, left: 24, width: 4, height: 4, backgroundColor: '#000' }]} />
    {/* Body */}
    <View style={[styles.pixel, { top: 20, left: 16, width: 28, height: 28, backgroundColor: '#FFB347', borderRadius: 14 }]} />
    {/* Wings */}
    <View style={[styles.pixel, { top: 24, left: 4, width: 14, height: 18, backgroundColor: '#FF9500', borderRadius: 7 }]} />
    <View style={[styles.pixel, { top: 24, right: 4, width: 14, height: 18, backgroundColor: '#FF9500', borderRadius: 7 }]} />
    {/* Legs */}
    <View style={[styles.pixel, { top: 48, left: 22, width: 3, height: 10, backgroundColor: '#FF9500' }]} />
    <View style={[styles.pixel, { top: 48, right: 22, width: 3, height: 10, backgroundColor: '#FF9500' }]} />
  </View>
);

const PIXEL_PETS: Record<PetType, () => React.ReactNode> = {
  cat: PixelCat,
  dog: PixelDog,
  bird: PixelBird,
};

export function PixelPetAnimation({
  petType,
  mood,
  size = 120,
}: PixelPetAnimationProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const config = getAnimationConfig(petType, mood);
    const animConfig = config.config;

    // Reset values
    scale.value = animConfig.scale?.from ?? 1;
    translateY.value = animConfig.translateY?.from ?? 0;
    rotate.value = animConfig.rotate?.from ?? 0;

    // Animate based on mood
    switch (mood) {
      case 'idle':
        translateY.value = withRepeat(
          withSequence(
            withTiming(animConfig.translateY?.to ?? -5, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(animConfig.translateY?.from ?? 0, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
        break;

      case 'happy':
        scale.value = withSequence(
          withTiming(animConfig.scale?.to ?? 1.2, {
            duration: animConfig.duration / 2,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(animConfig.scale?.from ?? 1, {
            duration: animConfig.duration / 2,
            easing: Easing.in(Easing.ease),
          })
        );
        translateY.value = withSequence(
          withTiming(animConfig.translateY?.to ?? -30, {
            duration: animConfig.duration / 2,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(animConfig.translateY?.from ?? 0, {
            duration: animConfig.duration / 2,
            easing: Easing.in(Easing.ease),
          })
        );
        if (animConfig.rotate) {
          rotate.value = withRepeat(
            withSequence(
              withTiming(animConfig.rotate.to, {
                duration: animConfig.duration / 4,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(animConfig.rotate.from, {
                duration: animConfig.duration / 4,
                easing: Easing.inOut(Easing.ease),
              })
            ),
            2,
            false
          );
        }
        break;

      case 'sad':
        translateY.value = withRepeat(
          withSequence(
            withTiming(animConfig.translateY?.to ?? 10, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(animConfig.translateY?.from ?? 0, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(animConfig.scale?.to ?? 0.9, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(animConfig.scale?.from ?? 1, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
        break;

      case 'eating':
        scale.value = withRepeat(
          withSequence(
            withTiming(animConfig.scale?.to ?? 1.1, {
              duration: animConfig.duration / 2,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(animConfig.scale?.from ?? 1, {
              duration: animConfig.duration / 2,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
        break;

      case 'sleeping':
        translateY.value = withRepeat(
          withSequence(
            withTiming(animConfig.translateY?.to ?? 5, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(animConfig.translateY?.from ?? 0, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.8, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(1, {
              duration: animConfig.duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
        break;

      case 'playing':
        translateY.value = withRepeat(
          withSequence(
            withTiming(animConfig.translateY?.to ?? -20, {
              duration: animConfig.duration / 2,
              easing: Easing.out(Easing.ease),
            }),
            withTiming(animConfig.translateY?.from ?? 0, {
              duration: animConfig.duration / 2,
              easing: Easing.in(Easing.ease),
            })
          ),
          -1,
          false
        );
        if (animConfig.rotate) {
          rotate.value = withRepeat(
            withSequence(
              withTiming(animConfig.rotate.to, {
                duration: animConfig.duration / 2,
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(animConfig.rotate.from, {
                duration: animConfig.duration / 2,
                easing: Easing.inOut(Easing.ease),
              })
            ),
            -1,
            false
          );
        }
        break;

      case 'levelUp':
        scale.value = withSequence(
          withTiming(animConfig.scale?.to ?? 1.5, {
            duration: animConfig.duration,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(animConfig.scale?.from ?? 1, {
            duration: animConfig.duration / 2,
            easing: Easing.in(Easing.ease),
          })
        );
        translateY.value = withSequence(
          withTiming(animConfig.translateY?.to ?? -50, {
            duration: animConfig.duration,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(animConfig.translateY?.from ?? 0, {
            duration: animConfig.duration / 2,
            easing: Easing.in(Easing.ease),
          })
        );
        break;
    }
  }, [mood, petType]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const scaleFactor = size / 120;
  const PixelComponent = PIXEL_PETS[petType];

  return (
    <View style={[styles.container, { width: size, height: size * 1.2 }]}>
      <Animated.View style={[styles.petContainer, animatedStyle, { transform: [{ scale: scaleFactor }] }]}>
        <PixelComponent />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  petContainer: {
    width: 80,
    height: 110,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pixelContainer: {
    width: 60,
    height: 96,
    position: 'relative',
  },
  pixel: {
    position: 'absolute',
    borderRadius: 2,
  },
});

