import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { textStyles } from '@/src/theme/typography';
import { colors } from '@/src/theme/colors';

type TextVariant = keyof typeof textStyles;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  children: React.ReactNode;
}

/**
 * Typography component with consistent text styles
 * Usage: <Text variant="h1">Hello</Text>
 */
export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = colors.text,
  style,
  children,
  ...props
}) => {
  return (
    <RNText
      style={[
        textStyles[variant],
        { color },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

export default Text;
