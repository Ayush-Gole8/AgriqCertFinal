import React from 'react';
import { motion } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  AlertCircle, 
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OfflineInspectionDraft } from '@/hooks/useOfflineInspection';

interface OfflineStatusProps {
  isOnline: boolean;
  currentDraft?: OfflineInspectionDraft | null;
  draftStats: {
    total: number;
    pending: number;
    pendingSync: number;
    conflicts: number;
  };
  onExport?: () => void;
  onImport?: (file: File) => void | Promise<void>;
  className?: string;
}

export function OfflineStatus({ 
  isOnline, 
  currentDraft, 
  draftStats,
  onExport,
  onImport,
  className 
}: OfflineStatusProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      await onImport(file);
      // Reset input
      event.target.value = '';
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-orange-500" />;
    if (draftStats.conflicts > 0) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (draftStats.pendingSync > 0) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline Mode';
    if (draftStats.conflicts > 0) return `${draftStats.conflicts} Conflicts`;
    if (draftStats.pendingSync > 0) return `${draftStats.pendingSync} Pending`;
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (draftStats.conflicts > 0) return 'bg-red-100 text-red-800 border-red-200';
    if (draftStats.pendingSync > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <motion.div 
      className={cn("w-full", className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span>Inspection Status</span>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getStatusColor())}
            >
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Draft Status */}
          {currentDraft && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Current Draft
                </span>
                <span className="text-xs text-blue-600">
                  {new Date(currentDraft.lastModified).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-blue-700">
                Batch: {currentDraft.batchId} • {currentDraft.readings.length} readings
              </div>
            </div>
          )}

          {/* Offline Mode Warning */}
          {!isOnline && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-2">
                <WifiOff className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-900 mb-1">
                    Offline-Capable Demo
                  </p>
                  <p className="text-orange-700 text-xs">
                    Working in low-connectivity mode. Data will be saved locally and synced when connection is restored.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Draft Statistics */}
          {draftStats.total > 0 && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 rounded flex items-center justify-between">
                <span>Local Drafts:</span>
                <Badge variant="secondary" className="text-xs">
                  {draftStats.pending}
                </Badge>
              </div>
              {draftStats.conflicts > 0 && (
                <div className="p-2 bg-red-50 rounded flex items-center justify-between">
                  <span>Conflicts:</span>
                  <Badge variant="destructive" className="text-xs">
                    {draftStats.conflicts}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onExport}
              disabled={!currentDraft}
              className="flex-1 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Export Draft
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportClick}
              className="flex-1 text-xs"
              title="Import draft JSON or upload lab report (PDF/TXT) for AI processing"
            >
              <Upload className="h-3 w-3 mr-1" />
              Import / Upload
            </Button>
          </div>

          {/* Hidden file input - accepts both JSON drafts and lab reports (PDF, TXT) */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.pdf,.txt,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Mobile-optimized offline indicators */}
      <div className="mt-2 text-xs text-gray-600 text-center">
        {!isOnline && (
          <motion.div 
            className="flex items-center justify-center gap-1"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <span>Auto-saving locally every 30 seconds</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface OfflineCapabilityBannerProps {
  className?: string;
}

export function OfflineCapabilityBanner({ className }: OfflineCapabilityBannerProps) {
  return (
    <motion.div
      className={cn("w-full p-3 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-lg", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
        <div className="text-sm">
          <div className="font-medium">Offline-Capable Demo</div>
          <div className="text-blue-100 text-xs">
            Field inspections work in low-connectivity areas • Export/Import drafts • Auto-save locally
          </div>
        </div>
      </div>
    </motion.div>
  );
}