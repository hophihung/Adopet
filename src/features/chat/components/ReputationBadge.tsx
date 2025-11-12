import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown, Award, Star, Gem } from 'lucide-react-native';

export type ReputationTier = 'default' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface ReputationBadgeProps {
  reputationPoints: number;
  avatarFrame?: ReputationTier;
  size?: 'small' | 'medium' | 'large';
  showPoints?: boolean;
}

export function ReputationBadge({
  reputationPoints,
  avatarFrame,
  size = 'medium',
  showPoints = true,
}: ReputationBadgeProps) {
  const tier = avatarFrame || getReputationTier(reputationPoints);
  const config = getReputationConfig(tier);

  const iconSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;
  const fontSize = size === 'small' ? 10 : size === 'large' ? 16 : 12;
  const badgeSize = size === 'small' ? 16 : size === 'large' ? 28 : 20;
  const badgeRadius = size === 'small' ? 8 : size === 'large' ? 14 : 10;

  return (
    <View style={[styles.container, styles[`${size}Container`]]}>
      <View style={[
        styles.badge, 
        styles[`${tier}Badge`],
        { width: badgeSize, height: badgeSize, borderRadius: badgeRadius }
      ]}>
        {config.icon && (
          <config.icon 
            size={iconSize} 
            color={config.color} 
            fill={config.color}
          />
        )}
      </View>
      {showPoints && (
        <Text style={[styles.points, { fontSize }]}>
          {String(reputationPoints)}
        </Text>
      )}
    </View>
  );
}

export function getReputationTier(points: number): ReputationTier {
  if (points >= 1000) return 'diamond';
  if (points >= 500) return 'platinum';
  if (points >= 200) return 'gold';
  if (points >= 100) return 'silver';
  if (points >= 50) return 'bronze';
  return 'default';
}

function getReputationConfig(tier: ReputationTier) {
  switch (tier) {
    case 'diamond':
      return {
        icon: Gem,
        color: '#00BCD4',
        name: 'Kim Cương',
        gradient: ['#00BCD4', '#0097A7'],
      };
    case 'platinum':
      return {
        icon: Crown,
        color: '#E0E0E0',
        name: 'Bạch Kim',
        gradient: ['#E0E0E0', '#BDBDBD'],
      };
    case 'gold':
      return {
        icon: Award,
        color: '#FFD700',
        name: 'Vàng',
        gradient: ['#FFD700', '#FFA000'],
      };
    case 'silver':
      return {
        icon: Star,
        color: '#C0C0C0',
        name: 'Bạc',
        gradient: ['#C0C0C0', '#808080'],
      };
    case 'bronze':
      return {
        icon: Star,
        color: '#CD7F32',
        name: 'Đồng',
        gradient: ['#CD7F32', '#8B4513'],
      };
    default:
      return {
        icon: null,
        color: '#9E9E9E',
        name: 'Mới',
        gradient: ['#9E9E9E', '#757575'],
      };
  }
}

export function AvatarFrame({
  reputationPoints,
  avatarFrame,
  children,
}: {
  reputationPoints: number;
  avatarFrame?: ReputationTier;
  children: React.ReactNode;
}) {
  const tier = avatarFrame || getReputationTier(reputationPoints);
  const config = getReputationConfig(tier);

  if (tier === 'default') {
    return <>{children}</>;
  }

  return (
    <View style={styles.frameContainer}>
      <View style={[styles.frame, styles[`${tier}Frame`]]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallContainer: {
    gap: 2,
  },
  mediumContainer: {
    gap: 4,
  },
  largeContainer: {
    gap: 6,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  defaultBadge: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  bronzeBadge: {
    backgroundColor: '#FFF8E1',
    borderColor: '#CD7F32',
  },
  silverBadge: {
    backgroundColor: '#FAFAFA',
    borderColor: '#C0C0C0',
  },
  goldBadge: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFD700',
  },
  platinumBadge: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  diamondBadge: {
    backgroundColor: '#E0F7FA',
    borderColor: '#00BCD4',
  },
  points: {
    fontWeight: '600',
    color: '#333',
  },
  frameContainer: {
    position: 'relative',
  },
  frame: {
    borderRadius: 50,
    padding: 3,
    borderWidth: 3,
  },
  bronzeFrame: {
    borderColor: '#CD7F32',
    shadowColor: '#CD7F32',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  silverFrame: {
    borderColor: '#C0C0C0',
    shadowColor: '#C0C0C0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  goldFrame: {
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  platinumFrame: {
    borderColor: '#E0E0E0',
    borderWidth: 4,
    shadowColor: '#E0E0E0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  diamondFrame: {
    borderColor: '#00BCD4',
    borderWidth: 4,
    shadowColor: '#00BCD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
});

