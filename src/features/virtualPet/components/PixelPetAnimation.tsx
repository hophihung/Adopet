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
import {
  PetType,
  PetMood,
  getAnimationConfig,
  getEvolutionStage,
} from '../../../config/virtualPet/animations';
import { PET_MODELS } from './PixelPetModels';

interface PixelPetAnimationProps {
  petType: PetType;
  mood: PetMood;
  level: number;
  size?: number;
}

export function PixelPetAnimation({
  petType,
  mood,
  level,
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

  // Get evolution stage from level
  const evolutionStage = getEvolutionStage(level);
  const PixelComponent = PET_MODELS[petType][evolutionStage];

  // Scale factor based on evolution stage (higher stage = bigger)
  const baseScale = size / 120;
  const stageScale = [0.8, 1.0, 1.2, 1.5][evolutionStage - 1]; // Scale multipliers for each stage
  const scaleFactor = baseScale * stageScale;

  // Container size adjusts based on stage
  const containerHeight = size * 1.2 * stageScale;

  return (
    <View style={[styles.container, { width: size, height: containerHeight }]}>
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
});

