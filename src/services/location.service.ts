import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

class LocationService {
  /**
   * Request location permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập vị trí',
          'Ứng dụng cần quyền truy cập vị trí để kết nối bạn với các người dùng và thú cưng xung quanh.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Cài đặt',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Location.requestForegroundPermissionsAsync();
                }
              },
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Check if location services are enabled
   */
  async isLocationEnabled(): Promise<boolean> {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      return enabled;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get current location
   * @param options Optional parameters to control location retrieval
   */
  async getCurrentLocation(options?: {
    timeout?: number;
    accuracy?: Location.Accuracy;
    useCached?: boolean;
    silent?: boolean; // If true, don't log warnings for failures
  }): Promise<LocationCoordinates | null> {
    const {
      timeout = 30000, // Increased to 30 seconds
      accuracy = Location.Accuracy.Low, // Use lower accuracy for faster response
      useCached = true,
      silent = false,
    } = options || {};

    try {
      // Check if location services are enabled
      const servicesEnabled = await this.isLocationEnabled();
      if (!servicesEnabled) {
        if (!silent) {
          console.warn('Location services are not enabled');
        }
        // Only show alert if not silent mode
        if (!silent) {
          Alert.alert(
            'Dịch vụ vị trí chưa bật',
            'Vui lòng bật dịch vụ vị trí trong cài đặt để sử dụng tính năng này.',
            [{ text: 'OK' }]
          );
        }
        return null;
      }

      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return null;
        }
      }

      // Try to get last known location first if useCached is true
      if (useCached) {
        try {
          const lastKnownPosition = await Location.getLastKnownPositionAsync({
            maxAge: 60000, // Accept location up to 1 minute old
            requiredAccuracy: 1000, // Accept accuracy within 1km
          });
          
          if (lastKnownPosition?.coords) {
            return {
              latitude: lastKnownPosition.coords.latitude,
              longitude: lastKnownPosition.coords.longitude,
            };
          }
        } catch (error) {
          // If last known location fails, continue to get current position
          if (!silent) {
            console.log('Could not get last known location, trying to get current position...');
          }
        }
      }

      // Try to get current location with timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy,
        maximumAge: useCached ? 60000 : 0, // Accept cached location up to 1 minute old
      });
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location request timeout')), timeout)
      );
      
      const location = await Promise.race([locationPromise, timeoutPromise]);

      if (!location || !location.coords) {
        if (!silent) {
          console.warn('Location data is invalid');
        }
        return null;
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error: any) {
      // Handle specific error messages
      const errorMessage = error?.message || 'Unknown error';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('unavailable')) {
        if (!silent) {
          console.warn('Location unavailable or timeout:', errorMessage);
        }
        // Don't show alert for timeout/unavailable - just return null silently
        // User can retry later
        return null;
      }
      
      if (!silent) {
        console.error('Error getting current location:', error);
      }
      return null;
    }
  }

  /**
   * Update user location in database
   */
  async updateUserLocation(userId: string, coordinates: LocationCoordinates): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          location_updated_at: new Date().toISOString(),
          location_permission_granted: true,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user location:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user location:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two coordinates (in km)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const locationService = new LocationService();

