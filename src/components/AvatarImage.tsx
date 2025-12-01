import React, { useState } from 'react';
import { Image, View, StyleSheet, ImageProps, ImageSourcePropType } from 'react-native';
import { User } from 'lucide-react-native';
import { colors } from '@/src/theme/colors';

interface AvatarImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  size?: number;
  placeholderColor?: string;
  showPlaceholder?: boolean;
}

/**
 * AvatarImage component với fallback khi load thất bại
 * Xử lý lỗi 403 từ Facebook CDN và các lỗi khác
 */
export function AvatarImage({
  uri,
  size = 40,
  placeholderColor = colors.primaryLight,
  showPlaceholder = true,
  style,
  ...props
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset error state khi URI thay đổi
  React.useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [uri]);

  const handleError = (error: any) => {
    // Facebook CDN URLs có thể hết hạn hoặc bị chặn (403)
    // Không log error để tránh spam console
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  // Nếu không có URI hoặc có lỗi, hiển thị placeholder
  if (!uri || hasError || !showPlaceholder) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: placeholderColor,
          },
          style,
        ]}
      >
        <User size={size * 0.5} color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      onError={handleError}
      onLoad={handleLoad}
      defaultSource={require('@/assets/images/icon.png')}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

