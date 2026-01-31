import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Battery,
  Signal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useOfflineInspection } from '@/hooks/useOfflineInspection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MobileInspection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    isOnline,
    currentDraft,
    saveDraft,
    exportDraft,
    importDraft,
    getDraftStats
  } = useOfflineInspection(id);

  const [readings, setReadings] = React.useState([
    { parameter: 'Moisture Content', value: '', unit: '%', minThreshold: 10, maxThreshold: 14, passed: false },
    { parameter: 'Temperature', value: '', unit: '°C', minThreshold: 20, maxThreshold: 25, passed: false },
    { parameter: 'Protein Content', value: '', unit: '%', minThreshold: 12, maxThreshold: 16, passed: false },
  ]);
  
  const [notes, setNotes] = React.useState('');
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);

  // Auto-save when data changes
  React.useEffect(() => {
    if (readings.some(r => r.value) || notes) {
      saveDraft({
        readings,
        notes,
        batchName: `Demo Batch ${id?.slice(-4)}`,
        geolocation: location ? {
          latitude: location.lat,
          longitude: location.lng,
          accuracy: 10,
          timestamp: new Date().toISOString()
        } : undefined
      });
    }
  }, [readings, notes, location, saveDraft, id]);

  const updateReading = (index: number, field: string, value: string | number) => {
    const newReadings = [...readings];
    newReadings[index] = { ...newReadings[index], [field]: value };
    
    // Auto-calculate passed status
    if (field === 'value' && newReadings[index].minThreshold && newReadings[index].maxThreshold) {
      const numValue = parseFloat(String(value));
      const min = newReadings[index].minThreshold!;
      const max = newReadings[index].maxThreshold!;
      newReadings[index].passed = numValue >= min && numValue <= max;
    }
    
    setReadings(newReadings);
  };

  const captureLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation not supported", variant: "destructive" });
      return;
    }

    setIsCapturingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        toast({ title: "Location captured", description: "GPS coordinates recorded" });
        setIsCapturingLocation(false);
      },
      (error) => {
        toast({ title: "Location Error", description: error.message, variant: "destructive" });
        setIsCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importDraft(file);
      event.target.value = '';
    }
  };

  const draftStats = getDraftStats();
  const hasValidReadings = readings.some(r => r.value);
  const allReadingsPassed = readings.filter(r => r.value).every(r => r.passed);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg">Field Inspection</h1>
              <p className="text-sm text-gray-600">Batch {id?.slice(-8) || 'DEMO001'}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                isOnline 
                  ? "bg-green-100 text-green-800" 
                  : "bg-orange-100 text-orange-800"
              )}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>
              
              {/* Battery Simulation */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Battery className="h-3 w-3" />
                85%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Capability Banner */}
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 mx-4 mt-4 rounded-lg"
        >
          <div className="flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4" />
            <span className="font-medium">Offline Mode Active</span>
          </div>
          <p className="text-xs mt-1 opacity-90">
            ✅ Auto-saving locally • Export/Import ready • Round-1 Demo
          </p>
        </motion.div>
      )}

      <div className="p-4 space-y-4">
        {/* Draft Status Card */}
        {currentDraft && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-green-700">✅ Draft Saved</p>
                  <p className="text-xs text-gray-500">
                    {new Date(currentDraft.lastModified).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {currentDraft.readings.filter(r => r.value).length} readings
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quality Readings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quality Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {readings.map((reading, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{reading.parameter}</Label>
                  {reading.value && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                      reading.passed 
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    )}>
                      {reading.passed ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {reading.passed ? 'Pass' : 'Fail'}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Input
                      type="number"
                      step="any"
                      value={reading.value}
                      onChange={(e) => updateReading(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Input
                      value={reading.unit}
                      readOnly
                      className="text-center bg-gray-50"
                    />
                  </div>
                  <div className="text-xs text-gray-500 flex items-center justify-center">
                    {reading.minThreshold}-{reading.maxThreshold}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              GPS Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {location ? (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-800">
                    <p className="font-medium">📍 Location Captured</p>
                    <p className="text-xs mt-1">
                      Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={captureLocation}
                  disabled={isCapturingLocation}
                  className="w-full"
                  variant="outline"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {isCapturingLocation ? 'Capturing...' : 'Capture GPS Location'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inspection Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Field observations, quality notes, environmental conditions..."
              className="min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Offline Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Export/Import */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => exportDraft()}
                disabled={!hasValidReadings}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Draft
              </Button>
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Draft
              </Button>
            </div>

            {/* Status Summary */}
            {hasValidReadings && (
              <div className={cn(
                "p-3 rounded-lg border text-sm",
                allReadingsPassed 
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              )}>
                <div className="flex items-center gap-2">
                  {allReadingsPassed ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span className="font-medium">
                    Quality Status: {allReadingsPassed ? 'All Parameters Passed' : 'Some Parameters Failed'}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  {readings.filter(r => r.value).length} of {readings.length} parameters recorded
                </p>
              </div>
            )}

            {/* Demo Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-800">
                <p className="font-medium">🏆 Round-1 Demo Features:</p>
                <ul className="mt-1 space-y-1 text-blue-700">
                  <li>• ✅ Works completely offline</li>
                  <li>• ✅ Auto-saves every 30 seconds</li>
                  <li>• ✅ Export/Import JSON drafts</li>
                  <li>• ✅ GPS location capture</li>
                  <li>• ✅ Mobile-first design</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Bottom Navigation Simulation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              toast({ 
                title: "Demo Complete", 
                description: "Offline inspection capability demonstrated successfully!"
              });
              navigate('/inspections');
            }}
            className="w-full max-w-sm bg-green-600 hover:bg-green-700"
            disabled={!hasValidReadings}
          >
            <Save className="h-4 w-4 mr-2" />
            {isOnline ? 'Save & Sync' : 'Save Locally'}
          </Button>
        </div>
      </div>
    </div>
  );
}