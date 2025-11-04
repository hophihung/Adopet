import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PetType, EvolutionStage } from '../../../config/virtualPet/animations';

// Helper function to create pixel style
const createPixelStyle = (props: {
  top: number;
  left?: number;
  right?: number;
  width: number;
  height: number;
  backgroundColor: string;
  borderRadius?: number;
}) => ({
  ...styles.pixel,
  top: props.top,
  left: props.left,
  right: props.right,
  width: props.width,
  height: props.height,
  backgroundColor: props.backgroundColor,
  borderRadius: props.borderRadius,
});

// ============================================
// CAT EVOLUTION STAGES
// ============================================

export const CatStage1 = () => (
  <View style={styles.pixelContainer}>
    {/* Baby Cat - Small, simple */}
    <View style={createPixelStyle({ top: 0, left: 8, width: 10, height: 10, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 0, right: 8, width: 10, height: 10, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 8, left: 10, width: 32, height: 24, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 14, left: 18, width: 4, height: 4, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 14, right: 18, width: 4, height: 4, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 20, left: 23, width: 4, height: 3, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 32, left: 12, width: 28, height: 32, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 64, left: 14, width: 6, height: 12, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 64, left: 24, width: 6, height: 12, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 64, right: 24, width: 6, height: 12, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 64, right: 14, width: 6, height: 12, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 40, right: -2, width: 8, height: 6, backgroundColor: '#FFB347' })} />
  </View>
);

export const CatStage2 = () => (
  <View style={styles.pixelContainer}>
    {/* Adult Cat - Medium size, more details */}
    <View style={createPixelStyle({ top: 0, left: 8, width: 12, height: 12, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 0, right: 8, width: 12, height: 12, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 8, left: 10, width: 40, height: 32, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 16, left: 20, width: 6, height: 6, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 16, right: 20, width: 6, height: 6, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 24, left: 27, width: 6, height: 4, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 40, left: 12, width: 36, height: 40, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 80, left: 16, width: 8, height: 16, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 80, left: 28, width: 8, height: 16, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 80, right: 28, width: 8, height: 16, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 80, right: 16, width: 8, height: 16, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 48, right: -4, width: 12, height: 8, backgroundColor: '#FFB347' })} />
    {/* Collar */}
    <View style={createPixelStyle({ top: 42, left: 14, width: 32, height: 4, backgroundColor: '#FF6B9D' })} />
  </View>
);

export const CatStage3 = () => (
  <View style={styles.pixelContainer}>
    {/* Mature Cat - Large, with accessories */}
    <View style={createPixelStyle({ top: -2, left: 6, width: 16, height: 16, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: -2, right: 6, width: 16, height: 16, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 6, left: 8, width: 48, height: 40, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 18, left: 22, width: 8, height: 8, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 18, right: 22, width: 8, height: 8, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 28, left: 30, width: 8, height: 6, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 46, left: 10, width: 44, height: 48, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 94, left: 18, width: 10, height: 20, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 94, left: 32, width: 10, height: 20, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 94, right: 32, width: 10, height: 20, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 94, right: 18, width: 10, height: 20, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 56, right: -6, width: 16, height: 12, backgroundColor: '#FFB347' })} />
    {/* Collar with bell */}
    <View style={createPixelStyle({ top: 50, left: 12, width: 40, height: 6, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 52, left: 30, width: 4, height: 4, backgroundColor: '#FFD700', borderRadius: 2 })} />
    {/* Chest pattern */}
    <View style={createPixelStyle({ top: 54, left: 24, width: 16, height: 8, backgroundColor: '#FFF8DC' })} />
  </View>
);

export const CatStage4 = () => (
  <View style={styles.pixelContainer}>
    {/* Legendary Cat - Huge, with aura and special features */}
    <View style={createPixelStyle({ top: -4, left: 4, width: 20, height: 20, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: -4, right: 4, width: 20, height: 20, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 4, left: 6, width: 56, height: 48, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 20, left: 24, width: 10, height: 10, backgroundColor: '#FFD700' })} />
    <View style={createPixelStyle({ top: 20, right: 24, width: 10, height: 10, backgroundColor: '#FFD700' })} />
    <View style={createPixelStyle({ top: 32, left: 34, width: 10, height: 8, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 52, left: 8, width: 52, height: 56, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 108, left: 20, width: 12, height: 24, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 108, left: 36, width: 12, height: 24, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 108, right: 36, width: 12, height: 24, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 108, right: 20, width: 12, height: 24, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 64, right: -8, width: 20, height: 16, backgroundColor: '#FFB347' })} />
    {/* Premium collar */}
    <View style={createPixelStyle({ top: 58, left: 10, width: 48, height: 8, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 60, left: 32, width: 6, height: 6, backgroundColor: '#FFD700', borderRadius: 3 })} />
    {/* Crown/Aura effect */}
    <View style={createPixelStyle({ top: -2, left: 28, width: 12, height: 6, backgroundColor: '#FFD700', borderRadius: 6 })} />
    {/* Chest pattern - more elaborate */}
    <View style={createPixelStyle({ top: 62, left: 22, width: 24, height: 12, backgroundColor: '#FFF8DC' })} />
    {/* Glow effect */}
    <View style={[createPixelStyle({ top: 2, left: 2, width: 64, height: 120, backgroundColor: '#FFD700' }), styles.glow]} />
  </View>
);

// ============================================
// DOG EVOLUTION STAGES
// ============================================

export const DogStage1 = () => (
  <View style={styles.pixelContainer}>
    {/* Baby Dog */}
    <View style={createPixelStyle({ top: 4, left: 2, width: 12, height: 16, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 4, right: 2, width: 12, height: 16, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 8, left: 10, width: 32, height: 24, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 14, left: 18, width: 4, height: 4, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 14, right: 18, width: 4, height: 4, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 20, left: 23, width: 4, height: 3, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 32, left: 12, width: 28, height: 32, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 64, left: 14, width: 6, height: 12, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 64, left: 24, width: 6, height: 12, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 64, right: 24, width: 6, height: 12, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 64, right: 14, width: 6, height: 12, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 40, right: -2, width: 8, height: 20, backgroundColor: '#4A90E2' })} />
  </View>
);

export const DogStage2 = () => (
  <View style={styles.pixelContainer}>
    {/* Adult Dog */}
    <View style={createPixelStyle({ top: 4, left: 4, width: 16, height: 20, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 4, right: 4, width: 16, height: 20, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 8, left: 10, width: 40, height: 32, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 16, left: 20, width: 6, height: 6, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 16, right: 20, width: 6, height: 6, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 24, left: 27, width: 6, height: 4, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 40, left: 12, width: 36, height: 40, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 80, left: 16, width: 8, height: 16, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 80, left: 28, width: 8, height: 16, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 80, right: 28, width: 8, height: 16, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 80, right: 16, width: 8, height: 16, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 48, right: -4, width: 10, height: 24, backgroundColor: '#4A90E2' })} />
    {/* Collar */}
    <View style={createPixelStyle({ top: 42, left: 14, width: 32, height: 4, backgroundColor: '#FF6B9D' })} />
  </View>
);

export const DogStage3 = () => (
  <View style={styles.pixelContainer}>
    {/* Mature Dog */}
    <View style={createPixelStyle({ top: 2, left: 2, width: 20, height: 24, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 2, right: 2, width: 20, height: 24, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 6, left: 8, width: 48, height: 40, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 18, left: 22, width: 8, height: 8, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 18, right: 22, width: 8, height: 8, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 28, left: 30, width: 8, height: 6, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 46, left: 10, width: 44, height: 48, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 94, left: 18, width: 10, height: 20, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 94, left: 32, width: 10, height: 20, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 94, right: 32, width: 10, height: 20, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 94, right: 18, width: 10, height: 20, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 56, right: -6, width: 14, height: 28, backgroundColor: '#4A90E2' })} />
    {/* Collar with tag */}
    <View style={createPixelStyle({ top: 50, left: 12, width: 40, height: 6, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 52, left: 28, width: 8, height: 4, backgroundColor: '#FFD700' })} />
    {/* Chest pattern */}
    <View style={createPixelStyle({ top: 54, left: 24, width: 16, height: 8, backgroundColor: '#FFF8DC' })} />
  </View>
);

export const DogStage4 = () => (
  <View style={styles.pixelContainer}>
    {/* Legendary Dog */}
    <View style={createPixelStyle({ top: 0, left: 0, width: 24, height: 28, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 0, right: 0, width: 24, height: 28, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 4, left: 6, width: 56, height: 48, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 20, left: 24, width: 10, height: 10, backgroundColor: '#FFD700' })} />
    <View style={createPixelStyle({ top: 20, right: 24, width: 10, height: 10, backgroundColor: '#FFD700' })} />
    <View style={createPixelStyle({ top: 32, left: 34, width: 10, height: 8, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 52, left: 8, width: 52, height: 56, backgroundColor: '#4A90E2' })} />
    <View style={createPixelStyle({ top: 108, left: 20, width: 12, height: 24, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 108, left: 36, width: 12, height: 24, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 108, right: 36, width: 12, height: 24, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 108, right: 20, width: 12, height: 24, backgroundColor: '#2E5C8A' })} />
    <View style={createPixelStyle({ top: 64, right: -8, width: 18, height: 32, backgroundColor: '#4A90E2' })} />
    {/* Premium collar */}
    <View style={createPixelStyle({ top: 58, left: 10, width: 48, height: 8, backgroundColor: '#FF6B9D' })} />
    <View style={createPixelStyle({ top: 60, left: 32, width: 6, height: 6, backgroundColor: '#FFD700', borderRadius: 3 })} />
    {/* Crown */}
    <View style={createPixelStyle({ top: -2, left: 28, width: 12, height: 6, backgroundColor: '#FFD700', borderRadius: 6 })} />
    {/* Chest pattern */}
    <View style={createPixelStyle({ top: 62, left: 22, width: 24, height: 12, backgroundColor: '#FFF8DC' })} />
    {/* Glow */}
    <View style={[createPixelStyle({ top: 2, left: 2, width: 64, height: 120, backgroundColor: '#4A90E2' }), styles.glow]} />
  </View>
);

// ============================================
// BIRD EVOLUTION STAGES
// ============================================

export const BirdStage1 = () => (
  <View style={styles.pixelContainer}>
    {/* Baby Bird */}
    <View style={createPixelStyle({ top: 0, left: 16, width: 20, height: 16, backgroundColor: '#FFD700', borderRadius: 10 })} />
    <View style={createPixelStyle({ top: 6, left: 10, width: 6, height: 4, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 2, left: 22, width: 3, height: 3, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 16, left: 14, width: 24, height: 24, backgroundColor: '#FFB347', borderRadius: 12 })} />
    <View style={createPixelStyle({ top: 20, left: 2, width: 12, height: 16, backgroundColor: '#FF9500', borderRadius: 6 })} />
    <View style={createPixelStyle({ top: 20, right: 2, width: 12, height: 16, backgroundColor: '#FF9500', borderRadius: 6 })} />
    <View style={createPixelStyle({ top: 40, left: 20, width: 2, height: 8, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 40, right: 20, width: 2, height: 8, backgroundColor: '#FF9500' })} />
  </View>
);

export const BirdStage2 = () => (
  <View style={styles.pixelContainer}>
    {/* Adult Bird */}
    <View style={createPixelStyle({ top: 0, left: 18, width: 24, height: 20, backgroundColor: '#FFD700', borderRadius: 12 })} />
    <View style={createPixelStyle({ top: 8, left: 12, width: 8, height: 6, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 4, left: 24, width: 4, height: 4, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 20, left: 16, width: 28, height: 28, backgroundColor: '#FFB347', borderRadius: 14 })} />
    <View style={createPixelStyle({ top: 24, left: 4, width: 14, height: 18, backgroundColor: '#FF9500', borderRadius: 7 })} />
    <View style={createPixelStyle({ top: 24, right: 4, width: 14, height: 18, backgroundColor: '#FF9500', borderRadius: 7 })} />
    <View style={createPixelStyle({ top: 48, left: 22, width: 3, height: 10, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 48, right: 22, width: 3, height: 10, backgroundColor: '#FF9500' })} />
  </View>
);

export const BirdStage3 = () => (
  <View style={styles.pixelContainer}>
    {/* Mature Bird */}
    <View style={createPixelStyle({ top: 0, left: 16, width: 28, height: 24, backgroundColor: '#FFD700', borderRadius: 14 })} />
    <View style={createPixelStyle({ top: 10, left: 10, width: 10, height: 8, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 4, left: 24, width: 6, height: 6, backgroundColor: '#000' })} />
    <View style={createPixelStyle({ top: 24, left: 14, width: 32, height: 32, backgroundColor: '#FFB347', borderRadius: 16 })} />
    <View style={createPixelStyle({ top: 28, left: 2, width: 16, height: 20, backgroundColor: '#FF9500', borderRadius: 8 })} />
    <View style={createPixelStyle({ top: 28, right: 2, width: 16, height: 20, backgroundColor: '#FF9500', borderRadius: 8 })} />
    <View style={createPixelStyle({ top: 56, left: 24, width: 4, height: 12, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 56, right: 24, width: 4, height: 12, backgroundColor: '#FF9500' })} />
    {/* Feather pattern */}
    <View style={createPixelStyle({ top: 30, left: 20, width: 20, height: 6, backgroundColor: '#FFD700' })} />
  </View>
);

export const BirdStage4 = () => (
  <View style={styles.pixelContainer}>
    {/* Legendary Bird - Phoenix-like */}
    <View style={createPixelStyle({ top: 0, left: 14, width: 32, height: 28, backgroundColor: '#FFD700', borderRadius: 16 })} />
    <View style={createPixelStyle({ top: 12, left: 8, width: 12, height: 10, backgroundColor: '#FFB347' })} />
    <View style={createPixelStyle({ top: 4, left: 26, width: 8, height: 8, backgroundColor: '#FFD700' })} />
    <View style={createPixelStyle({ top: 28, left: 12, width: 36, height: 36, backgroundColor: '#FFB347', borderRadius: 18 })} />
    <View style={createPixelStyle({ top: 32, left: 0, width: 18, height: 24, backgroundColor: '#FF6B00', borderRadius: 9 })} />
    <View style={createPixelStyle({ top: 32, right: 0, width: 18, height: 24, backgroundColor: '#FF6B00', borderRadius: 9 })} />
    <View style={createPixelStyle({ top: 64, left: 26, width: 6, height: 14, backgroundColor: '#FF9500' })} />
    <View style={createPixelStyle({ top: 64, right: 26, width: 6, height: 14, backgroundColor: '#FF9500' })} />
    {/* Fire feathers */}
    <View style={createPixelStyle({ top: 34, left: 20, width: 24, height: 8, backgroundColor: '#FF6B00' })} />
    <View style={createPixelStyle({ top: 42, left: 22, width: 20, height: 6, backgroundColor: '#FFD700' })} />
    {/* Glow */}
    <View style={[createPixelStyle({ top: 2, left: 2, width: 56, height: 100, backgroundColor: '#FFD700' }), styles.glow]} />
  </View>
);

// ============================================
// MODEL MAPPING
// ============================================

export const PET_MODELS: Record<
  PetType,
  Record<EvolutionStage, () => React.ReactNode>
> = {
  cat: {
    1: CatStage1,
    2: CatStage2,
    3: CatStage3,
    4: CatStage4,
  },
  dog: {
    1: DogStage1,
    2: DogStage2,
    3: DogStage3,
    4: DogStage4,
  },
  bird: {
    1: BirdStage1,
    2: BirdStage2,
    3: BirdStage3,
    4: BirdStage4,
  },
};

const styles = StyleSheet.create({
  pixelContainer: {
    width: 60,
    height: 96,
    position: 'relative',
  },
  pixel: {
    position: 'absolute',
    borderRadius: 2,
  },
  glow: {
    opacity: 0.2,
    zIndex: -1,
  },
});

