import React, { createContext, useContext, useState, useEffect } from 'react';
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
        await updateLocation();
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
    const granted = await requestPermission();
    if (granted) {
      await updateLocation();
    }
  };

  const updateLocation = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const currentLocation = await locationService.getCurrentLocation();
      
      if (currentLocation) {
        setLocation(currentLocation);
        await locationService.updateUserLocation(user.id, currentLocation);
        console.log('✅ Location updated successfully');
      } else {
        console.warn('⚠️ Could not get current location - services may be disabled or permission denied');
        // Don't show error to user - location is optional
      }
    } catch (error) {
      console.error('Error updating location:', error);
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

