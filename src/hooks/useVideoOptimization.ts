import { useEffect, useRef, useCallback } from 'react';
import { Video } from 'expo-av';

interface UseVideoOptimizationProps {
  videoId: string;
  isCurrentVideo: boolean;
  videoUrl: string;
}

/**
 * Hook to optimize video playback and memory usage
 * - Only loads video when needed
 * - Unloads video when not visible
 * - Manages playback state efficiently
 */
export const useVideoOptimization = ({
  videoId,
  isCurrentVideo,
  videoUrl,
}: UseVideoOptimizationProps) => {
  const videoRef = useRef<Video>(null);
  const isLoadedRef = useRef(false);

  // Play video when it becomes current
  useEffect(() => {
    if (isCurrentVideo && videoRef.current && isLoadedRef.current) {
      videoRef.current.playAsync().catch(console.error);
    } else if (!isCurrentVideo && videoRef.current && isLoadedRef.current) {
      videoRef.current.pauseAsync().catch(console.error);
    }
  }, [isCurrentVideo]);

  // Unload video when component unmounts
  useEffect(() => {
    return () => {
      if (videoRef.current && isLoadedRef.current) {
        videoRef.current.unloadAsync().catch(console.error);
      }
    };
  }, []);

  const handleLoad = useCallback(() => {
    isLoadedRef.current = true;
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('Video error:', error);
    isLoadedRef.current = false;
  }, []);

  return {
    videoRef,
    handleLoad,
    handleError,
  };
};
