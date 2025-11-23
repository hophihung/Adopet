/**
 * LazyImage Component
 * Lazy load images để giảm bandwidth và tăng performance
 */

import React, { useState, useEffect, useRef } from 'react';
import { Image, ImageProps, View, ActivityIndicator, StyleSheet } from 'react-native';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  thumbnailUri?: string; // Low quality thumbnail to show first
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  delay?: number; // Delay before loading (ms)
  priority?: 'low' | 'normal' | 'high'; // Load priority
}

export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  placeholder,
  thumbnailUri,
  style,
  onLoadStart,
  onLoadEnd,
  onError,
  delay = 0,
  priority = 'normal',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(priority === 'high');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Delay loading for low priority images
    if (priority === 'low' && delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setShouldLoad(true);
      }, delay);
    } else if (priority !== 'low') {
      setShouldLoad(true);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [priority, delay]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Show placeholder or thumbnail while loading
  const showPlaceholder = isLoading && !thumbnailUri;
  const showThumbnail = isLoading && thumbnailUri && !hasError;

  if (!shouldLoad) {
    return (
      <View style={[style, styles.container]}>
        {placeholder || (
          <View style={[styles.placeholder, style]}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail (low quality) shown first */}
      {showThumbnail && thumbnailUri && (
        <Image
          source={{ uri: thumbnailUri }}
          style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
          resizeMode="cover"
        />
      )}

      {/* Main image */}
      <Image
        {...props}
        source={source}
        style={[style, isLoading && styles.loading]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        resizeMode={props.resizeMode || 'cover'}
      />

      {/* Loading indicator */}
      {showPlaceholder && (
        <View style={[StyleSheet.absoluteFill, styles.placeholderContainer]}>
          {placeholder || (
            <ActivityIndicator size="small" color="#999" />
          )}
        </View>
      )}

      {/* Error placeholder */}
      {hasError && (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          {placeholder || (
            <View style={styles.errorPlaceholder} />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loading: {
    opacity: 0.3,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
});

