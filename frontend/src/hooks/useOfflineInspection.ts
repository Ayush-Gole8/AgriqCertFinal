import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface OfflineInspectionDraft {
  id: string;
  batchId: string;
  batchName?: string;
  farmerId?: string;
  farmerName?: string;
  timestamp: string;
  lastModified: string;
  readings: Array<{
    parameter: string;
    value: string | number;
    unit: string;
    minThreshold?: number;
    maxThreshold?: number;
    passed: boolean;
  }>;
  notes: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  photos?: Array<{
    id: string;
    url: string;
    caption?: string;
    timestamp: string;
  }>;
  isOffline: boolean;
  syncStatus: 'draft' | 'pending_sync' | 'synced' | 'conflict';
}

const STORAGE_KEY = 'agriqcert_inspection_drafts';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useOfflineInspection(batchId?: string) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [drafts, setDrafts] = useState<OfflineInspectionDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<OfflineInspectionDraft | null>(null);
  const { toast } = useToast();

  // Load drafts from localStorage
  const loadDrafts = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedDrafts = JSON.parse(stored) as OfflineInspectionDraft[];
        setDrafts(parsedDrafts);
        
        // Find current draft for this batch
        if (batchId) {
          const draft = parsedDrafts.find(d => d.batchId === batchId && d.syncStatus !== 'synced');
          if (draft) {
            setCurrentDraft(draft);
          }
        }
      }
    } catch (error) {
      console.error('Error loading offline drafts:', error);
    }
  }, [batchId]);

  // Save drafts to localStorage
  const saveDrafts = useCallback((newDrafts: OfflineInspectionDraft[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrafts));
      setDrafts(newDrafts);
    } catch (error) {
      console.error('Error saving offline drafts:', error);
      toast({
        title: "Storage Error",
        description: "Failed to save offline draft. Storage may be full.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Create or update draft
  const saveDraft = useCallback((draftData: Partial<OfflineInspectionDraft>) => {
    if (!batchId) return;

    const now = new Date().toISOString();
    const draftId = currentDraft?.id || `draft_${batchId}_${Date.now()}`;
    
    const updatedDraft: OfflineInspectionDraft = {
      id: draftId,
      batchId,
      timestamp: currentDraft?.timestamp || now,
      lastModified: now,
      readings: [],
      notes: '',
      isOffline: !isOnline,
      syncStatus: 'draft',
      ...currentDraft,
      ...draftData,
    };

    setCurrentDraft(updatedDraft);

    // Update drafts array
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    updatedDrafts.push(updatedDraft);
    
    saveDrafts(updatedDrafts);

    if (!isOnline) {
      toast({
        title: "Saved Offline",
        description: "Inspection progress saved locally. Will sync when online.",
        variant: "default"
      });
    }
  }, [batchId, currentDraft, drafts, saveDrafts, isOnline, toast]);

  // Export draft as JSON
  const exportDraft = useCallback((draft?: OfflineInspectionDraft) => {
    const draftToExport = draft || currentDraft;
    if (!draftToExport) return;

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      appName: "AgriQCert Mobile Inspector",
      inspection: draftToExport
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agriqcert_inspection_${draftToExport.batchId}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Inspection draft exported successfully. You can import this file later.",
      variant: "default"
    });
  }, [currentDraft, toast]);

  // Import draft from JSON
  const importDraft = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        if (!importData.inspection || !importData.version) {
          throw new Error('Invalid file format');
        }

        const importedDraft: OfflineInspectionDraft = {
          ...importData.inspection,
          id: `imported_${Date.now()}`,
          lastModified: new Date().toISOString(),
          syncStatus: 'draft' as const,
          isOffline: true
        };

        // Check if draft already exists
        const existingIndex = drafts.findIndex(d => d.batchId === importedDraft.batchId);
        if (existingIndex >= 0) {
          // Replace existing draft
          const updatedDrafts = [...drafts];
          updatedDrafts[existingIndex] = importedDraft;
          saveDrafts(updatedDrafts);
        } else {
          // Add new draft
          saveDrafts([...drafts, importedDraft]);
        }

        setCurrentDraft(importedDraft);

        toast({
          title: "Import Successful",
          description: `Imported inspection draft for batch ${importedDraft.batchId}`,
          variant: "default"
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: "Invalid file format or corrupted data.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  }, [drafts, saveDrafts, toast]);

  // Delete draft
  const deleteDraft = useCallback((draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    saveDrafts(updatedDrafts);
    
    if (currentDraft?.id === draftId) {
      setCurrentDraft(null);
    }

    toast({
      title: "Draft Deleted",
      description: "Inspection draft removed from local storage.",
      variant: "default"
    });
  }, [drafts, saveDrafts, currentDraft, toast]);

  // Get draft statistics
  const getDraftStats = useCallback(() => {
    return {
      total: drafts.length,
      pending: drafts.filter(d => d.syncStatus === 'draft').length,
      pendingSync: drafts.filter(d => d.syncStatus === 'pending_sync').length,
      conflicts: drafts.filter(d => d.syncStatus === 'conflict').length,
    };
  }, [drafts]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "You're back online. Drafts can now be synced.",
        variant: "default"
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Working Offline",
        description: "No internet connection. Inspection data will be saved locally.",
        variant: "default"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Auto-save functionality
  useEffect(() => {
    if (!currentDraft || isOnline) return;

    const autoSaveInterval = setInterval(() => {
      // Auto-save current draft
      saveDraft(currentDraft);
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(autoSaveInterval);
  }, [currentDraft, isOnline, saveDraft]);

  return {
    // State
    isOnline,
    drafts,
    currentDraft,
    
    // Actions
    saveDraft,
    exportDraft,
    importDraft,
    deleteDraft,
    loadDrafts,
    
    // Utils
    getDraftStats,
    
    // Constants
    AUTO_SAVE_INTERVAL
  };
}