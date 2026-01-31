import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  Trash2, 
  Upload, 
  Download,
  AlertTriangle,
  CheckCircle,
  WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { OfflineInspectionDraft } from '@/hooks/useOfflineInspection';

interface DraftManagerProps {
  drafts: OfflineInspectionDraft[];
  currentDraftId?: string;
  onExportDraft: (draft: OfflineInspectionDraft) => void;
  onDeleteDraft: (draftId: string) => void;
  onLoadDraft?: (draft: OfflineInspectionDraft) => void;
  className?: string;
}

export function DraftManager({ 
  drafts, 
  currentDraftId,
  onExportDraft,
  onDeleteDraft,
  onLoadDraft,
  className 
}: DraftManagerProps) {
  const [selectedDraft, setSelectedDraft] = React.useState<OfflineInspectionDraft | null>(null);

  const getSyncStatusIcon = (status: OfflineInspectionDraft['syncStatus']) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'pending_sync':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'conflict':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSyncStatusText = (status: OfflineInspectionDraft['syncStatus']) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_sync': return 'Pending Sync';
      case 'synced': return 'Synced';
      case 'conflict': return 'Conflict';
      default: return 'Unknown';
    }
  };

  const getSyncStatusColor = (status: OfflineInspectionDraft['syncStatus']) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'pending_sync': return 'bg-blue-100 text-blue-800';
      case 'synced': return 'bg-green-100 text-green-800';
      case 'conflict': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastModified = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (drafts.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mb-4 text-gray-300" />
          <p className="text-sm">No offline drafts available</p>
          <p className="text-xs text-gray-400 mt-1">
            Drafts will appear here when working offline
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          Draft Manager ({drafts.length})
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            <AnimatePresence>
              {drafts.map((draft, index) => (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-3 border rounded-lg transition-all hover:shadow-md",
                    draft.id === currentDraftId && "border-blue-500 bg-blue-50"
                  )}
                >
                  {/* Draft Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSyncStatusIcon(draft.syncStatus)}
                      <span className="text-sm font-medium">
                        Batch {draft.batchId.slice(-8)}
                      </span>
                      {draft.isOffline && (
                        <WifiOff className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getSyncStatusColor(draft.syncStatus))}
                    >
                      {getSyncStatusText(draft.syncStatus)}
                    </Badge>
                  </div>

                  {/* Draft Details */}
                  <div className="text-xs text-gray-600 mb-3 space-y-1">
                    <div>Last modified: {formatLastModified(draft.lastModified)}</div>
                    <div>{draft.readings.length} readings • {draft.notes ? 'Notes added' : 'No notes'}</div>
                    {draft.batchName && <div>Product: {draft.batchName}</div>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {onLoadDraft && draft.id !== currentDraftId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLoadDraft(draft)}
                        className="text-xs flex-1"
                      >
                        Load
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onExportDraft(draft)}
                      className="text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Draft</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this inspection draft? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteDraft(draft.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <Separator className="my-4" />
        
        {/* Summary */}
        <div className="text-xs text-gray-500">
          <p>
            {drafts.filter(d => d.syncStatus === 'draft').length} unsaved drafts •{' '}
            {drafts.filter(d => d.syncStatus === 'pending_sync').length} pending sync
          </p>
        </div>
      </CardContent>
    </Card>
  );
}