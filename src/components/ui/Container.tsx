import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { spacing } from '@/src/theme/spacing';

interface ContainerProps {
  children: React.ReactNode;
  padding?: keyof typeof spacing;
  paddingHorizontal?: keyof typeof spacing;
  paddingVertical?: keyof typeof spacing;
  style?: ViewStyle;
}

/**
 * Container component with consistent spacing
 * Usage: <Container padding={4}>...</Container>
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  padding,
  paddingHorizontal,
  paddingVertical,
  style,
}) => {
  return (
    <View
      style={[
        padding && { padding: spacing[padding] },
        paddingHorizontal && { paddingHorizontal: spacing[paddingHorizontal] },
        paddingVertical && { paddingVertical: spacing[paddingVertical] },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default Container;
