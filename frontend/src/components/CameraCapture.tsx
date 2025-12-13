import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File, metadata: { geolocation?: GeolocationPosition }) => void;
  onFileSelect: (file: File) => void;
  maxFiles?: number;
  currentFileCount?: number;
  acceptedFormats?: string[];
  isLoading?: boolean;
}

interface CapturedImage {
  id: string;
  file: File;
  preview: string;
  geolocation?: GeolocationPosition;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onFileSelect,
  maxFiles = 10,
  currentFileCount = 0,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/heic'],
  isLoading = false,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [geolocationEnabled, setGeolocationEnabled] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setIsCapturing(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure permissions are granted.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Get geolocation if enabled
      let geolocation: GeolocationPosition | undefined;
      if (geolocationEnabled) {
        try {
          geolocation = await getCurrentPosition();
        } catch (error) {
          console.warn('Could not get geolocation:', error);
        }
      }

      // Create file from blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `capture-${timestamp}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      // Create preview
      const preview = URL.createObjectURL(blob);
      const capturedImage: CapturedImage = {
        id: Math.random().toString(36),
        file,
        preview,
        geolocation,
      };

      setCapturedImages(prev => [...prev, capturedImage]);
      onCapture(file, { geolocation });
    }, 'image/jpeg', 0.9);
  }, [geolocationEnabled, onCapture]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (acceptedFormats.includes(file.type)) {
        if (currentFileCount + capturedImages.length < maxFiles) {
          onFileSelect(file);
          
          // Add to preview list
          const preview = URL.createObjectURL(file);
          setCapturedImages(prev => [...prev, {
            id: Math.random().toString(36),
            file,
            preview,
          }]);
        } else {
          alert(`Maximum ${maxFiles} files allowed`);
        }
      } else {
        alert(`File type ${file.type} not supported. Please use: ${acceptedFormats.join(', ')}`);
      }
    });

    // Reset input
    event.target.value = '';
  }, [acceptedFormats, currentFileCount, capturedImages.length, maxFiles, onFileSelect]);

  const removeImage = useCallback((imageId: string) => {
    setCapturedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  const canCaptureMore = currentFileCount + capturedImages.length < maxFiles;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Photo Capture</h3>
              <span className="text-sm text-gray-500">
                {currentFileCount + capturedImages.length}/{maxFiles} files
              </span>
            </div>

            {/* Geolocation Toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={geolocationEnabled}
                onChange={(e) => setGeolocationEnabled(e.target.checked)}
                className="rounded"
              />
              Include location data (recommended for field inspections)
            </label>
          </div>

          {/* Camera View */}
          {isCapturing && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-h-64 bg-black rounded-lg"
              />
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-4">
                <Button
                  onClick={capturePhoto}
                  disabled={!canCaptureMore || isLoading}
                  size="lg"
                  className="rounded-full"
                >
                  <Camera className="h-6 w-6" />
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="secondary"
                  size="lg"
                  className="rounded-full"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Camera Controls */}
          {!isCapturing && canCaptureMore && (
            <div className="flex gap-4">
              <Button
                onClick={startCamera}
                disabled={isLoading}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Open Camera
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats.join(',')}
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                disabled={isLoading}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          )}

          {/* Maximum files reached */}
          {!canCaptureMore && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">
                Maximum number of files ({maxFiles}) reached. Remove some files to add more.
              </p>
            </div>
          )}

          {/* Image Previews */}
          {capturedImages.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Captured Images</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {capturedImages.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.preview}
                      alt="Captured"
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      onClick={() => removeImage(image.id)}
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 h-auto"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {image.geolocation && (
                      <div className="absolute bottom-1 left-1">
                        <div className="bg-green-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};