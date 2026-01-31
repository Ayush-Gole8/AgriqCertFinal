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

  // Import draft from JSON or process lab reports with AI
  const importDraft = useCallback(async (file: File, onProcessLabReport?: (file: File) => Promise<void>) => {
    // Check if it's a PDF or other lab report file
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isLabReport = isPDF || 
      file.name.toLowerCase().includes('lab') || 
      file.name.toLowerCase().includes('report') ||
      file.type === 'text/plain' ||
      file.name.toLowerCase().endsWith('.txt');
    
    // If it's a lab report and we have the AI processing callback, process it automatically
    if ((isPDF || isLabReport) && onProcessLabReport) {
      try {
        // The onProcessLabReport function will handle its own toast notifications
        await onProcessLabReport(file);
        return;
      } catch (error) {
        console.error('Lab report processing error:', error);
        // Error toast is already shown by the processing function
        return;
      }
    }
    
    // If it's a lab report but no AI processor available, show helpful message
    if (isPDF || isLabReport) {
      toast({
        title: "Lab Report Detected",
        description: "Please use the 'AI Extract' button in the Quality Readings section to process lab reports with AI.",
        variant: "default"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        // Validate JSON format
        let importData;
        try {
          importData = JSON.parse(content);
        } catch (parseError) {
          throw new Error('File is not a valid JSON format. Please select a valid inspection draft file.');
        }

        // Validate inspection draft structure
        if (!importData.inspection || !importData.version) {
          throw new Error('Invalid inspection draft format. Please select a file exported from this application.');
        }

        // Additional validation for required fields
        if (!importData.inspection.batchId || !importData.inspection.readings) {
          throw new Error('Incomplete inspection draft data. Please select a valid inspection draft file.');
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
          
          toast({
            title: "Draft Replaced",
            description: `Replaced existing draft for batch ${importedDraft.batchId}`,
            variant: "default"
          });
        } else {
          // Add new draft
          saveDrafts([...drafts, importedDraft]);
          
          toast({
            title: "Import Successful",
            description: `Imported inspection draft for batch ${importedDraft.batchId}`,
            variant: "default"
          });
        }

        setCurrentDraft(importedDraft);

      } catch (error) {
        console.error('Import error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Invalid file format or corrupted data.';
        toast({
          title: "Import Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };
    
    reader.onerror = (error) => {
      console.error('File read error:', error);
      toast({
        title: "File Read Error",
        description: "Unable to read the selected file. Please try again.",
        variant: "destructive"
      });
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