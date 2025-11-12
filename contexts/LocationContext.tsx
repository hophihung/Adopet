import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { locationService, LocationCoordinates } from '../src/services/location.service';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

interface LocationContextType {
  location: LocationCoordinates | null;
  loading: boolean;
  permissionGranted: boolean;
  requestPermission: () => Promise<boolean>;
  updateLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, []);

  // Request location when user logs in (with delay to avoid blocking)
  useEffect(() => {
    if (user) {
      // Delay location request to avoid blocking app startup
      const timer = setTimeout(() => {
        requestPermissionAndUpdate();
      }, 2000); // Wait 2 seconds after login
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const checkPermission = async () => {
    const granted = await locationService.checkPermission();
    setPermissionGranted(granted);
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const granted = await locationService.requestPermission();
      setPermissionGranted(granted);
      
      if (granted && user) {
        // When user explicitly requests permission, don't use silent mode
        await updateLocation(false);
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requestPermissionAndUpdate = async () => {
    try {
      setLoading(true);
      const granted = await locationService.requestPermission();
      setPermissionGranted(granted);
      
      if (granted && user) {
        // Automatic update after login - use silent mode to avoid warnings
        await updateLocation(true);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async (silent: boolean = true) => {
    if (!user) return;

    try {
      setLoading(true);
      // Use silent mode for automatic updates to avoid warnings
      const currentLocation = await locationService.getCurrentLocation({
        timeout: 30000, // 30 seconds
        accuracy: Location.Accuracy.Low, // Use lower accuracy for faster response
        useCached: true, // Allow using cached location
        silent, // Don't log warnings for automatic updates
      });
      
      if (currentLocation) {
        setLocation(currentLocation);
        await locationService.updateUserLocation(user.id, currentLocation);
        if (!silent) {
          console.log('✅ Location updated successfully');
        }
      } else {
        // Only log warning if not in silent mode (user explicitly requested)
        if (!silent) {
          console.warn('⚠️ Could not get current location - services may be disabled or permission denied');
        }
        // Don't show error to user - location is optional
      }
    } catch (error) {
      // Only log error if not in silent mode
      if (!silent) {
        console.error('Error updating location:', error);
      }
      // Don't show error to user - location is optional
    } finally {
      setLoading(false);
    }
  };

  const value = {
    location,
    loading,
    permissionGranted,
    requestPermission,
    updateLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

