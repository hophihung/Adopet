import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ReelProduct } from '../services/product.service';

interface ProductTagProps {
  reelProduct: ReelProduct;
  onPress: (product: ReelProduct) => void;
  onClose?: () => void;
  videoDuration?: number;
  currentTime?: number;
}

export function ProductTag({
  reelProduct,
  onPress,
  onClose,
  videoDuration = 60,
  currentTime = 0,
}: ProductTagProps) {
  const [isVisible, setIsVisible] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Show/hide tag based on time range
    if (reelProduct.start_time !== undefined) {
      const startTime = reelProduct.start_time;
      const endTime = reelProduct.end_time || videoDuration;
      
      if (currentTime < startTime || currentTime > endTime) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    }
  }, [currentTime, reelProduct.start_time, reelProduct.end_time, videoDuration]);

  if (!isVisible || !reelProduct.product) {
    return null;
  }

  const product = reelProduct.product;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.tag}
        onPress={() => onPress(reelProduct)}
        activeOpacity={0.8}
      >
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  tag: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

