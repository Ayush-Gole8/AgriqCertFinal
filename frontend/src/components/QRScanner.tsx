import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ZXingReader = {
  decodeOnceFromVideoDevice: (deviceId: string | undefined, videoElementId: string) => Promise<{ text: string }>;
  decodeFromImageFile: (file: File) => Promise<{ text: string }>;
  reset: () => void;
};

type ZXingModule = {
  BrowserQRCodeReader?: new () => ZXingReader;
};

interface QRScannerProps {
  onScanSuccess: (result: string) => void;
  onScanError?: (error: Error) => void;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  className,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<ZXingReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Dynamically import QR scanner library
  useEffect(() => {
    let mounted = true;

    const loadScanner = async () => {
      try {
        const module = (await import('@zxing/browser')) as unknown as ZXingModule;
        const Reader = module?.BrowserQRCodeReader;
        if (mounted && Reader) {
          scannerRef.current = new Reader();
        }
      } catch (error) {
        console.error('Failed to load QR scanner:', error);
        if (mounted) {
          setError('QR scanner library failed to load');
        }
      }
    };

    loadScanner();

    return () => {
      mounted = false;
    };
  }, []);

  // Check camera permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setHasPermission(result.state === 'granted');
        
        result.addEventListener('change', () => {
          setHasPermission(result.state === 'granted');
        });
      } catch (error) {
        console.warn('Permission API not supported:', error);
        setHasPermission(null);
      }
    };

    checkPermissions();
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) {
      setError('QR scanner not initialized');
      return;
    }

    try {
      setError('');
      setIsScanning(true);

      // Get video stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start decoding
        scannerRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current.id)
          .then((result: { text: string }) => {
            if (result) {
              stopScanning();
              onScanSuccess(result.text);
              toast({
                title: "QR Code Scanned!",
                description: "Processing the scanned code...",
              });
            }
          })
          .catch((err: Error) => {
            console.error('QR scanning error:', err);
            if (onScanError) {
              onScanError(err);
            }
            if (err.name !== 'NotFoundException') {
              setError('Scanning failed. Please try again.');
            }
          });
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setError('Camera access denied. Please enable camera permissions.');
      setIsScanning(false);
      setHasPermission(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (scannerRef.current) {
      scannerRef.current.reset();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!scannerRef.current) {
      setError('QR scanner not initialized');
      return;
    }

    try {
      setError('');
      
      const result = await scannerRef.current.decodeFromImageFile(file);
      if (result) {
        onScanSuccess(result.text);
        toast({
          title: "QR Code Read!",
          description: "Successfully read QR code from image",
        });
      }
    } catch (error) {
      console.error('File scanning error:', error);
      setError('Could not read QR code from image. Please try a different image.');
      if (onScanError) {
        onScanError(error as Error);
      }
    }

    // Reset file input
    event.target.value = '';
  };

  const requestPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      setError('');
    } catch (error) {
      setHasPermission(false);
      setError('Camera permission denied');
    }
  };

  if (!scannerRef.current) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading QR scanner...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
            <p className="text-sm text-muted-foreground">
              Point your camera at a QR code or upload an image
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          {isScanning && (
            <div className="relative">
              <video
                ref={videoRef}
                id="qr-video"
                className="w-full rounded-lg"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-primary"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-primary"></div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {!isScanning ? (
              <>
                {hasPermission === false ? (
                  <Button 
                    onClick={requestPermission}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Camera size={16} />
                    Enable Camera Access
                  </Button>
                ) : (
                  <Button 
                    onClick={startScanning}
                    className="flex items-center gap-2"
                  >
                    <Camera size={16} />
                    Start Camera Scan
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload Image
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={stopScanning}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  Stop Scanning
                </Button>
                
                <Button 
                  onClick={() => {
                    stopScanning();
                    setTimeout(startScanning, 100);
                  }}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Restart
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {hasPermission === false && (
            <div className="text-xs text-muted-foreground text-center">
              Camera access is required for QR code scanning. 
              You can also upload an image file as an alternative.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};