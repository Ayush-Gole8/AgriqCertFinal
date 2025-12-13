import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  isoCode: string;
  region: string;
}

interface GeoTagProps {
  onLocationUpdate: (location: GeolocationData) => void;
  initialLocation?: Partial<GeolocationData>;
  required?: boolean;
  showMap?: boolean;
}

export const GeoTag: React.FC<GeoTagProps> = ({
  onLocationUpdate,
  initialLocation,
  required = false,
  showMap = false,
}) => {
  const [location, setLocation] = useState<Partial<GeolocationData>>(initialLocation || {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Check permission status on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state);
        });
      });
    }
  }, []);

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  const getLocationName = async (lat: number, lng: number): Promise<{ isoCode: string; region: string }> => {
    try {
      // Using a geocoding service (you might want to use a real service like Google Maps or Nominatim)
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const data = await response.json();
      
      return {
        isoCode: data.countryCode || 'XX',
        region: data.city || data.locality || data.principalSubdivision || 'Unknown',
      };
    } catch (error) {
      console.warn('Could not get location name:', error);
      return {
        isoCode: 'XX',
        region: 'Unknown',
      };
    }
  };

  const captureLocation = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;
      
      // Get location name
      const { isoCode, region } = await getLocationName(latitude, longitude);
      
      const locationData: GeolocationData = {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
        isoCode,
        region,
      };

      setLocation(locationData);
      onLocationUpdate(locationData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      
      if (errorMessage.includes('denied')) {
        setPermissionStatus('denied');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentPosition, onLocationUpdate]);

  const handleManualInput = useCallback((field: keyof GeolocationData, value: string) => {
    const updatedLocation = { ...location };
    
    if (field === 'latitude' || field === 'longitude' || field === 'accuracy') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        updatedLocation[field] = numValue;
      }
    } else if (field === 'isoCode' || field === 'region') {
      updatedLocation[field] = value;
    }

    setLocation(updatedLocation);
    
    // Update parent if all required fields are present
    if (updatedLocation.latitude && updatedLocation.longitude && updatedLocation.isoCode && updatedLocation.region) {
      onLocationUpdate({
        ...updatedLocation,
        timestamp: updatedLocation.timestamp || new Date(),
        accuracy: updatedLocation.accuracy || 0,
      } as GeolocationData);
    }
  }, [location, onLocationUpdate]);

  const formatAccuracy = (accuracy: number): string => {
    if (accuracy < 10) return `±${accuracy.toFixed(1)}m (Excellent)`;
    if (accuracy < 100) return `±${accuracy.toFixed(0)}m (Good)`;
    if (accuracy < 1000) return `±${accuracy.toFixed(0)}m (Fair)`;
    return `±${(accuracy / 1000).toFixed(1)}km (Poor)`;
  };

  const isLocationComplete = location.latitude && location.longitude && location.isoCode && location.region;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Location Data</h3>
              {required && <span className="text-red-500">*</span>}
            </div>
            
            {isLocationComplete && (
              <div className="flex items-center gap-1 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm">Complete</span>
              </div>
            )}
          </div>

          {/* Permission Status */}
          {permissionStatus === 'denied' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-red-800">
                Location access denied. Please enable location permissions in your browser settings or enter coordinates manually.
              </div>
            </div>
          )}

          {/* Auto-capture button */}
          <div className="space-y-2">
            <Button
              onClick={captureLocation}
              disabled={isLoading}
              className="w-full"
              variant={isLocationComplete ? "outline" : "default"}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  {isLocationComplete ? 'Update Location' : 'Get Current Location'}
                </>
              )}
            </Button>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <X className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Manual input fields */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-gray-700">Manual Entry (Optional)</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={location.latitude || ''}
                  onChange={(e) => handleManualInput('latitude', e.target.value)}
                  placeholder="e.g., 40.7128"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={location.longitude || ''}
                  onChange={(e) => handleManualInput('longitude', e.target.value)}
                  placeholder="e.g., -74.0060"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="isoCode">Country Code</Label>
                <Input
                  id="isoCode"
                  type="text"
                  maxLength={2}
                  value={location.isoCode || ''}
                  onChange={(e) => handleManualInput('isoCode', e.target.value.toUpperCase())}
                  placeholder="e.g., US"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region">Region/City</Label>
                <Input
                  id="region"
                  type="text"
                  value={location.region || ''}
                  onChange={(e) => handleManualInput('region', e.target.value)}
                  placeholder="e.g., New York"
                />
              </div>
            </div>
          </div>

          {/* Location summary */}
          {isLocationComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Current Location</h4>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Coordinates:</strong> {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}</p>
                <p><strong>Location:</strong> {location.region}, {location.isoCode}</p>
                {location.accuracy !== undefined && (
                  <p><strong>Accuracy:</strong> {formatAccuracy(location.accuracy)}</p>
                )}
                {location.timestamp && (
                  <p><strong>Captured:</strong> {location.timestamp.toLocaleString()}</p>
                )}
              </div>
              
              {showMap && location.latitude && location.longitude && (
                <div className="mt-3">
                  <a
                    href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};