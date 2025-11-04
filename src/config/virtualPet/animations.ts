/**
 * Virtual Pet Animation Configuration
 * Cấu hình animation cho 3 loại pet: cat, dog, bird
 * 
 * Mỗi pet có các trạng thái:
 * - idle: Đứng yên, nhìn xung quanh
 * - happy: Vui vẻ, nhảy lên
 * - sad: Buồn, ngồi xuống
 * - eating: Ăn
 * - sleeping: Ngủ
 * - playing: Chơi, chạy vòng quanh
 * - levelUp: Hiệu ứng khi level up
 */

export type PetType = 'cat' | 'dog' | 'bird';
export type PetMood = 'idle' | 'happy' | 'sad' | 'eating' | 'sleeping' | 'playing' | 'levelUp';

/**
 * Evolution stages - Pet sẽ tiến hóa ở các level này
 */
export type EvolutionStage = 1 | 2 | 3 | 4;

export const EVOLUTION_LEVELS: EvolutionStage[] = [1, 10, 30, 50];

/**
 * Get evolution stage từ level
 */
export function getEvolutionStage(level: number): EvolutionStage {
  if (level >= 50) return 4;
  if (level >= 30) return 3;
  if (level >= 10) return 2;
  return 1;
}

export function getEvolutionStageName(stage: EvolutionStage): string {
  switch (stage) {
    case 1:
      return 'Baby';
    case 2:
      return 'Adult';
    case 3:
      return 'Mature';
    case 4:
      return 'Legendary';
    default:
      return 'Baby';
  }
}

export interface AnimationConfig {
  duration: number;
  easing: string;
  scale?: {
    from: number;
    to: number;
  };
  translateY?: {
    from: number;
    to: number;
  };
  rotate?: {
    from: number;
    to: number;
  };
}

export interface PetAnimationState {
  mood: PetMood;
  config: AnimationConfig;
  description: string;
}

/**
 * Animation states cho từng loại pet
 */
export const petAnimations: Record<PetType, Record<PetMood, PetAnimationState>> = {
  cat: {
    idle: {
      mood: 'idle',
      config: {
        duration: 2000,
        easing: 'easeInOut',
        translateY: { from: 0, to: -5 },
      },
      description: 'Mèo đang nghỉ ngơi',
    },
    happy: {
      mood: 'happy',
      config: {
        duration: 800,
        easing: 'easeOut',
        scale: { from: 1, to: 1.2 },
        translateY: { from: 0, to: -30 },
      },
      description: 'Mèo vui vẻ! 🐱',
    },
    sad: {
      mood: 'sad',
      config: {
        duration: 1500,
        easing: 'easeInOut',
        translateY: { from: 0, to: 10 },
        scale: { from: 1, to: 0.9 },
      },
      description: 'Mèo buồn... 😿',
    },
    eating: {
      mood: 'eating',
      config: {
        duration: 600,
        easing: 'easeInOut',
        scale: { from: 1, to: 1.1 },
      },
      description: 'Mèo đang ăn',
    },
    sleeping: {
      mood: 'sleeping',
      config: {
        duration: 3000,
        easing: 'easeInOut',
        translateY: { from: 0, to: 5 },
      },
      description: 'Mèo đang ngủ... 😴',
    },
    playing: {
      mood: 'playing',
      config: {
        duration: 500,
        easing: 'easeInOut',
        translateY: { from: 0, to: -20 },
        rotate: { from: -10, to: 10 },
      },
      description: 'Mèo đang chơi!',
    },
    levelUp: {
      mood: 'levelUp',
      config: {
        duration: 1000,
        easing: 'easeOut',
        scale: { from: 1, to: 1.5 },
        translateY: { from: 0, to: -50 },
      },
      description: 'Level Up! 🎉',
    },
  },
  dog: {
    idle: {
      mood: 'idle',
      config: {
        duration: 2000,
        easing: 'easeInOut',
        translateY: { from: 0, to: -5 },
      },
      description: 'Chó đang nghỉ ngơi',
    },
    happy: {
      mood: 'happy',
      config: {
        duration: 600,
        easing: 'easeOut',
        scale: { from: 1, to: 1.3 },
        translateY: { from: 0, to: -40 },
        rotate: { from: -5, to: 5 },
      },
      description: 'Chó vui vẻ! 🐶',
    },
    sad: {
      mood: 'sad',
      config: {
        duration: 1500,
        easing: 'easeInOut',
        translateY: { from: 0, to: 15 },
        scale: { from: 1, to: 0.85 },
      },
      description: 'Chó buồn... 🐕',
    },
    eating: {
      mood: 'eating',
      config: {
        duration: 500,
        easing: 'easeInOut',
        scale: { from: 1, to: 1.15 },
      },
      description: 'Chó đang ăn',
    },
    sleeping: {
      mood: 'sleeping',
      config: {
        duration: 3000,
        easing: 'easeInOut',
        translateY: { from: 0, to: 8 },
      },
      description: 'Chó đang ngủ... 😴',
    },
    playing: {
      mood: 'playing',
      config: {
        duration: 400,
        easing: 'easeInOut',
        translateY: { from: 0, to: -25 },
        rotate: { from: -15, to: 15 },
      },
      description: 'Chó đang chơi!',
    },
    levelUp: {
      mood: 'levelUp',
      config: {
        duration: 1000,
        easing: 'easeOut',
        scale: { from: 1, to: 1.6 },
        translateY: { from: 0, to: -60 },
      },
      description: 'Level Up! 🎉',
    },
  },
  bird: {
    idle: {
      mood: 'idle',
      config: {
        duration: 2000,
        easing: 'easeInOut',
        translateY: { from: 0, to: -3 },
      },
      description: 'Chim đang nghỉ ngơi',
    },
    happy: {
      mood: 'happy',
      config: {
        duration: 700,
        easing: 'easeOut',
        scale: { from: 1, to: 1.25 },
        translateY: { from: 0, to: -35 },
      },
      description: 'Chim vui vẻ! 🐦',
    },
    sad: {
      mood: 'sad',
      config: {
        duration: 1500,
        easing: 'easeInOut',
        translateY: { from: 0, to: 12 },
        scale: { from: 1, to: 0.9 },
      },
      description: 'Chim buồn... 🐤',
    },
    eating: {
      mood: 'eating',
      config: {
        duration: 550,
        easing: 'easeInOut',
        scale: { from: 1, to: 1.1 },
      },
      description: 'Chim đang ăn',
    },
    sleeping: {
      mood: 'sleeping',
      config: {
        duration: 3000,
        easing: 'easeInOut',
        translateY: { from: 0, to: 6 },
      },
      description: 'Chim đang ngủ... 😴',
    },
    playing: {
      mood: 'playing',
      config: {
        duration: 450,
        easing: 'easeInOut',
        translateY: { from: 0, to: -18 },
      },
      description: 'Chim đang chơi!',
    },
    levelUp: {
      mood: 'levelUp',
      config: {
        duration: 1000,
        easing: 'easeOut',
        scale: { from: 1, to: 1.4 },
        translateY: { from: 0, to: -45 },
      },
      description: 'Level Up! 🎉',
    },
  },
};

/**
 * Get current mood based on mood value (0-100)
 */
export function getMoodFromValue(moodValue: number): PetMood {
  if (moodValue >= 80) return 'happy';
  if (moodValue >= 50) return 'idle';
  if (moodValue >= 30) return 'sad';
  return 'sad'; // Very low mood
}

/**
 * Get animation config for pet type and mood
 */
export function getAnimationConfig(
  petType: PetType,
  mood: PetMood
): PetAnimationState {
  return petAnimations[petType][mood];
}

/**
 * Pet colors for UI
 */
export const petColors: Record<PetType, { primary: string; secondary: string; accent: string }> = {
  cat: {
    primary: '#FF6B9D',
    secondary: '#FFB3D9',
    accent: '#FFE5F0',
  },
  dog: {
    primary: '#4A90E2',
    secondary: '#87CEEB',
    accent: '#E6F3FF',
  },
  bird: {
    primary: '#FFB347',
    secondary: '#FFD700',
    accent: '#FFF8DC',
  },
};

/**
 * Pet emojis
 */
export const petEmojis: Record<PetType, string> = {
  cat: '🐱',
  dog: '🐶',
  bird: '🐦',
};

