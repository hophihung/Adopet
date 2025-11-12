/**
 * Performance Testing Utility for PetCardNew Component
 * 
 * This file provides utilities to test and verify:
 * 1. Component re-render frequency
 * 2. Animation performance (60fps target)
 * 3. Image loading performance
 * 4. Memory usage patterns
 * 
 * Usage:
 * 1. Import PerformanceMonitor and wrap your component
 * 2. Use React DevTools Profiler to record interactions
 * 3. Check console logs for performance metrics
 */

import React, { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
}

/**
 * Performance Monitor Hook
 * Tracks component render performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
  });

  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    // Mark render start
    renderStartTime.current = performance.now();

    return () => {
      // Calculate render time
      const renderTime = performance.now() - renderStartTime.current;
      const metrics = metricsRef.current;

      metrics.renderCount++;
      metrics.lastRenderTime = renderTime;
      metrics.totalRenderTime += renderTime;
      metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;

      // Log performance metrics every 10 renders
      if (metrics.renderCount % 10 === 0) {
        console.log(`[Performance] ${componentName}:`, {
          renders: metrics.renderCount,
          lastRender: `${renderTime.toFixed(2)}ms`,
          avgRender: `${metrics.averageRenderTime.toFixed(2)}ms`,
          target: '16.67ms (60fps)',
          status: metrics.averageRenderTime < 16.67 ? '✅ Good' : '⚠️ Slow',
        });
      }
    };
  });

  return metricsRef.current;
};

/**
 * Animation Performance Monitor
 * Tracks animation frame rate
 */
export const useAnimationPerformance = (animationName: string) => {
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);

  const measureFrame = () => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    const fps = 1000 / delta;

    frameCountRef.current++;
    lastFrameTimeRef.current = now;
    fpsHistoryRef.current.push(fps);

    // Keep only last 60 frames
    if (fpsHistoryRef.current.length > 60) {
      fpsHistoryRef.current.shift();
    }

    // Log every 60 frames (approximately 1 second at 60fps)
    if (frameCountRef.current % 60 === 0) {
      const avgFps =
        fpsHistoryRef.current.reduce((sum, f) => sum + f, 0) /
        fpsHistoryRef.current.length;
      const minFps = Math.min(...fpsHistoryRef.current);

      console.log(`[Animation] ${animationName}:`, {
        avgFps: avgFps.toFixed(1),
        minFps: minFps.toFixed(1),
        target: '60fps',
        status: avgFps >= 55 ? '✅ Smooth' : minFps < 30 ? '❌ Janky' : '⚠️ Acceptable',
      });
    }
  };

  return { measureFrame };
};

/**
 * Image Loading Performance Monitor
 * Tracks image load times
 */
export const useImageLoadPerformance = () => {
  const loadStartTimes = useRef<Map<string, number>>(new Map());

  const startLoad = (imageUrl: string) => {
    loadStartTimes.current.set(imageUrl, performance.now());
  };

  const endLoad = (imageUrl: string, success: boolean) => {
    const startTime = loadStartTimes.current.get(imageUrl);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      console.log(`[Image Load] ${success ? '✅' : '❌'}:`, {
        url: imageUrl.substring(0, 50) + '...',
        time: `${loadTime.toFixed(0)}ms`,
        status: loadTime < 1000 ? 'Fast' : loadTime < 3000 ? 'Acceptable' : 'Slow',
      });
      loadStartTimes.current.delete(imageUrl);
    }
  };

  return { startLoad, endLoad };
};

/**
 * Memory Usage Monitor
 * Tracks component memory footprint
 */
export const useMemoryMonitor = (componentName: string) => {
  useEffect(() => {
    // Check if performance.memory is available (Chrome/Edge only)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
      const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);

      console.log(`[Memory] ${componentName} mounted:`, {
        used: `${usedMB}MB`,
        total: `${totalMB}MB`,
        percentage: `${((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(1)}%`,
      });
    }

    return () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
        console.log(`[Memory] ${componentName} unmounted:`, {
          used: `${usedMB}MB`,
        });
      }
    };
  }, [componentName]);
};

/**
 * Interaction Performance Monitor
 * Measures time from user interaction to UI update
 */
export const useInteractionPerformance = () => {
  const interactionStartTime = useRef<number>(0);

  const startInteraction = (interactionName: string) => {
    interactionStartTime.current = performance.now();
    console.log(`[Interaction] ${interactionName} started`);
  };

  const endInteraction = (interactionName: string) => {
    InteractionManager.runAfterInteractions(() => {
      const interactionTime = performance.now() - interactionStartTime.current;
      console.log(`[Interaction] ${interactionName} completed:`, {
        time: `${interactionTime.toFixed(0)}ms`,
        target: '<100ms',
        status: interactionTime < 100 ? '✅ Responsive' : interactionTime < 300 ? '⚠️ Acceptable' : '❌ Slow',
      });
    });
  };

  return { startInteraction, endInteraction };
};

/**
 * Performance Test Wrapper Component
 * Wraps any component with performance monitoring
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    usePerformanceMonitor(componentName);
    useMemoryMonitor(componentName);

    return <Component {...props} />;
  });
};

/**
 * Performance Testing Instructions
 * 
 * To test PetCardNew performance:
 * 
 * 1. Enable Performance Monitoring:
 *    ```tsx
 *    import { usePerformanceMonitor } from './__performance-test__';
 *    
 *    function MyScreen() {
 *      usePerformanceMonitor('MyScreen');
 *      // ... rest of component
 *    }
 *    ```
 * 
 * 2. Test Animation Performance:
 *    - Open React DevTools Profiler
 *    - Click "Record" button
 *    - Interact with pet cards (swipe, tap buttons)
 *    - Stop recording
 *    - Check flame graph for render times
 *    - Target: Each render should be < 16.67ms (60fps)
 * 
 * 3. Test Image Loading:
 *    - Monitor console for image load times
 *    - Target: < 1000ms for good performance
 *    - Check that next image preloading works
 * 
 * 4. Test Memory Usage:
 *    - Scroll through multiple pet cards
 *    - Check memory doesn't continuously increase
 *    - Target: Stable memory usage after initial load
 * 
 * 5. Test Interaction Responsiveness:
 *    - Tap buttons and measure response time
 *    - Target: < 100ms from tap to visual feedback
 * 
 * 6. Performance Benchmarks:
 *    - Component render: < 16.67ms (60fps)
 *    - Animation frame rate: 55-60fps average
 *    - Image load: < 1000ms
 *    - Button interaction: < 100ms
 *    - Memory: Stable, no leaks
 * 
 * 7. Testing on Different Devices:
 *    - Test on low-end device (e.g., iPhone SE, Android mid-range)
 *    - Test on high-end device (e.g., iPhone 14 Pro)
 *    - Verify 60fps on both device types
 * 
 * 8. Common Performance Issues:
 *    - Excessive re-renders: Check React.memo and useCallback usage
 *    - Slow animations: Ensure useNativeDriver: true
 *    - Memory leaks: Check cleanup in useEffect
 *    - Slow image loading: Verify image preloading works
 */

export const PERFORMANCE_TARGETS = {
  RENDER_TIME_MS: 16.67, // 60fps
  ANIMATION_FPS: 60,
  IMAGE_LOAD_MS: 1000,
  INTERACTION_MS: 100,
  MIN_ACCEPTABLE_FPS: 55,
} as const;

/**
 * Example Usage in a Screen Component:
 * 
 * ```tsx
 * import { PetCardNew } from './PetCardNew';
 * import { usePerformanceMonitor, useAnimationPerformance } from './__performance-test__';
 * 
 * function DiscoverScreen() {
 *   usePerformanceMonitor('DiscoverScreen');
 *   const { measureFrame } = useAnimationPerformance('CardSwipe');
 *   
 *   const handleSwipe = () => {
 *     measureFrame();
 *     // ... swipe logic
 *   };
 *   
 *   return (
 *     <PetCardNew
 *       pet={currentPet}
 *       nextPetImage={nextPet?.images?.[0]} // Enable preloading
 *       onPress={handlePress}
 *     />
 *   );
 * }
 * ```
 */
