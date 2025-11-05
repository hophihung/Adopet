import { getAnimationConfig, petEmojis, PetMood, PetType } from '@/src/config/virtualPet/animations';
import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface VirtualPetAnimationProps {
  petType: PetType;
  mood: PetMood;
  size?: number;
}

export function VirtualPetAnimation({
  petType,
  mood,
  size = 120,
}: VirtualPetAnimationProps) {
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
        // Gentle floating animation
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
        // Bounce up animation
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
        // Slow sink down animation
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
        // Quick scale pulse
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
        // Slow gentle breathing
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
        // Quick bounce with rotation
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
        // Big celebration animation
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

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.petContainer, animatedStyle]}>
        <Text style={[styles.petEmoji, { fontSize: size * 0.8 }]}>
          {petEmojis[petType]}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petEmoji: {
    textAlign: 'center',
  },
});

