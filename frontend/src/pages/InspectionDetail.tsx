import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  createAIClient, 
  extractTextFromFile, 
  processLabReportWithAI,
  validateExtractedParameters 
} from '@/services/aiLabReportService';
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  User,
  ClipboardCheck,
  Camera,
  Save,
  Send,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  FileText,
  Upload,
  Brain,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { OfflineStatus, OfflineCapabilityBanner } from '@/components/OfflineStatus';
import { DraftManager } from '@/components/DraftManager';
import { useAuth } from '@/contexts/AuthContext';
import { useBatch, useInspections, useCreateInspection, useUpdateInspection, useCompleteInspection } from '@/hooks/useApi';
import { useBatchCertificateStatus } from '@/hooks/useVCS';
import { useOfflineInspection, type OfflineInspectionDraft } from '@/hooks/useOfflineInspection';
import { useToast } from '@/hooks/use-toast';
import type { InspectionReading } from '@/types';

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: batchData, isLoading: batchLoading } = useBatch(id || '');
  const { data: inspectionsData, isLoading: inspectionsLoading } = useInspections({ batchId: id });
  const { certificate, hasCertificate, status: certificateStatus } = useBatchCertificateStatus(id || '');
  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();
  const completeInspection = useCompleteInspection();
  
  const batch = batchData?.data;
  const inspections = inspectionsData?.data || [];
  const existingInspection = inspections[0];
  
  // Offline inspection hook
  const {
    isOnline,
    drafts,
    currentDraft,
    saveDraft,
    exportDraft,
    importDraft,
    deleteDraft,
    getDraftStats
  } = useOfflineInspection(id);

  const [readings, setReadings] = useState<InspectionReading[]>(
    currentDraft?.readings ||
    existingInspection?.readings || [
      { parameter: 'Moisture Content', value: '', unit: '%', minThreshold: 10, maxThreshold: 14, passed: false },
      { parameter: 'Temperature', value: '', unit: '°C', minThreshold: 20, maxThreshold: 25, passed: false },
      { parameter: 'pH Level', value: '', unit: 'pH', minThreshold: 6.0, maxThreshold: 7.5, passed: false },
    ]
  );
  
  const [notes, setNotes] = useState(
    currentDraft?.notes ||
    existingInspection?.notes || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const updateReading = (index: number, field: keyof InspectionReading, value: string | number | undefined) => {
    const newReadings = [...readings];
    newReadings[index] = { ...newReadings[index], [field]: value };
    
    // Auto-calculate passed status based on thresholds
    if (field === 'value' && newReadings[index].minThreshold !== undefined && newReadings[index].maxThreshold !== undefined) {
      const numValue = parseFloat(value as string);
      const min = newReadings[index].minThreshold!;
      const max = newReadings[index].maxThreshold!;
      newReadings[index].passed = numValue >= min && numValue <= max;
    }
    
    setReadings(newReadings);
    
    // Auto-save to draft if offline or if current draft exists
    if (!isOnline || currentDraft) {
      saveDraft({
        readings: newReadings,
        notes,
        batchName: batch?.productName,
        farmerName: batch?.farmerName
      });
    }
  };

  const addReading = () => {
    setReadings([...readings, { parameter: '', value: '', unit: '', passed: false }]);
  };

  const removeReading = (index: number) => {
    setReadings(readings.filter((_, i) => i !== index));
  };

  // OpenRouter AI client configuration
  const getAIClient = () => {
    try {
      return createAIClient();
    } catch (error) {
      console.error('Failed to initialize AI client:', error);
      toast({
        title: "Configuration Error",
        description: "AI service is not properly configured. Please check your API key.",
        variant: "destructive"
      });
      return null;
    }
  };

  // Handle file upload and AI processing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsProcessingAI(true);

    try {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const aiClient = getAIClient();
      if (!aiClient) {
        return; // Error already shown in getAIClient
      }
      
      // Extract text from file
      console.log('[InspectionDetail] Extracting text from uploaded file...');
      const reportText = await extractTextFromFile(file);
      
      console.log('[InspectionDetail] Text extracted. Length:', reportText.length);
      
      if (!reportText.trim()) {
        throw new Error('The uploaded file appears to be empty or contains no readable text');
      }
      
      // Process with AI
      console.log('[InspectionDetail] Sending extracted text to Open Router AI...');
      const extractedData = await processLabReportWithAI(reportText, aiClient);
      console.log('[InspectionDetail] AI processing completed. Extracted parameters:', extractedData.parameters?.length || 0);
      
      // Validate and update readings with extracted parameters
      if (extractedData.parameters && Array.isArray(extractedData.parameters)) {
        const validatedParameters = validateExtractedParameters(extractedData.parameters);
        
        const newReadings = validatedParameters.map((param: any) => ({
          parameter: param.parameter,
          value: param.value,
          unit: param.unit,
          minThreshold: param.minThreshold,
          maxThreshold: param.maxThreshold,
          passed: param.passed
        }));
        
        setReadings(newReadings);
        
        // Add AI processing notes if available
        if (extractedData.notes) {
          const aiNotes = `\n\n--- AI Extraction Notes ---\n${extractedData.notes}\nFile: ${file.name}\nProcessed: ${new Date().toLocaleString()}`;
          setNotes(prevNotes => prevNotes + aiNotes);
        }
        
        toast({
          title: "Lab Report Successfully Processed",
          description: `Extracted ${extractedData.extractedValues} parameters with ${extractedData.confidence} confidence. ${validatedParameters.filter(p => p.passed).length}/${validatedParameters.length} parameters passed quality thresholds.`,
          variant: "default"
        });

        // Auto-save to draft if offline or if current draft exists
        if (!isOnline || currentDraft) {
          saveDraft({
            readings: newReadings,
            notes,
            batchName: batch?.productName,
            farmerName: batch?.farmerName
          });
        }
      } else {
        throw new Error('No valid parameters were extracted from the lab report');
      }
    } catch (error) {
      console.error('File processing error:', error);
      
      let errorMessage = 'Failed to process the lab report. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Lab Report Processing Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessingAI(false);
      // Clear the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Initialize with at least one reading if empty
  React.useEffect(() => {
    if (readings.length === 0) {
      setReadings([{ parameter: '', value: '', unit: '', passed: false }]);
    }
  }, [readings.length]);

  const handleSaveProgress = async () => {
    if (!id) return;
    
    if (!batch) {
      toast({
        title: "Error",
        description: "Batch information not available. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    // Check if batch is in the right state for inspection
    if (batch.status === 'draft') {
      toast({
        title: "Cannot Start Inspection",
        description: "Batch must be submitted before inspection can begin. Please submit the batch first.",
        variant: "destructive"
      });
      return;
    }
    
    const validReadings = readings.filter(r => r.parameter && r.value !== '');
    
    if (validReadings.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one quality reading with parameter and value before saving.",
        variant: "destructive"
      });
      return;
    }

    // If offline, save as draft
    if (!isOnline) {
      saveDraft({
        readings: validReadings,
        notes,
        batchName: batch?.productName,
        farmerName: batch?.farmerName,
        geolocation: {
          latitude: batch?.location?.latitude || 0,
          longitude: batch?.location?.longitude || 0,
          accuracy: 10,
          timestamp: new Date().toISOString(),
        }
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const inspectionData = {
        batchId: id,
        inspectorId: user?.id || '',
        inspectorName: user?.name || 'Unknown Inspector',
        readings: validReadings.map(r => ({
          parameter: r.parameter,
          value: typeof r.value === 'string' ? parseFloat(r.value) || 0 : r.value,
          unit: r.unit,
          minThreshold: r.minThreshold,
          maxThreshold: r.maxThreshold,
          passed: r.passed
        })),
        notes,
        status: 'in_progress' as const,
        geolocation: {
          latitude: batch?.location?.latitude || 0,
          longitude: batch?.location?.longitude || 0,
          accuracy: 10,
          timestamp: new Date().toISOString(),
        },
      };

      if (existingInspection) {
        await updateInspection.mutateAsync({ id: existingInspection.id, data: {
          readings: inspectionData.readings,
          notes: inspectionData.notes,
          status: inspectionData.status,
          geolocation: inspectionData.geolocation
        } as Record<string, unknown> });
        toast({ title: "Progress saved", description: "Inspection progress has been saved successfully." });
      } else {
        await createInspection.mutateAsync({ batchId: id, data: inspectionData });
        toast({ title: "Inspection started", description: "Quality inspection has been initiated." });
      }
    } catch (error: unknown) {
      console.error('Save progress error:', error);
      
      let errorMessage = "Failed to save inspection progress. Please try again.";
      
      // Handle specific error cases based on status code
      const errorResponse = error as { response?: { status?: number; data?: { message?: string } } };
      if (errorResponse.response?.status === 400) {
        if (errorResponse.response?.data?.message) {
          errorMessage = errorResponse.response.data.message;
        } else {
          errorMessage = "Invalid inspection data. Please check batch status and try again.";
        }
      } else if (errorResponse.response?.status === 404) {
        errorMessage = "Batch not found. Please refresh the page and try again.";
      } else if (errorResponse.response?.status === 409) {
        errorMessage = "Inspection already exists for this batch. Please refresh to see latest data.";
      } else if (errorResponse.response?.status === 422) {
        errorMessage = "Validation failed. Please check all required fields are filled correctly.";
      } else if (errorResponse && typeof errorResponse === 'object' && 'message' in errorResponse && typeof errorResponse.message === 'string') {
        errorMessage = errorResponse.message;
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load draft data
  const handleLoadDraft = (draft: OfflineInspectionDraft) => {
    setReadings(draft.readings);
    setNotes(draft.notes);
    toast({
      title: "Draft Loaded",
      description: `Loaded inspection draft from ${new Date(draft.lastModified).toLocaleString()}`,
      variant: "default"
    });
  };

  // Auto-save notes when changed
  const handleNotesChange = (value: string) => {
    setNotes(value);
    
    // Auto-save to draft if offline or if current draft exists
    if (!isOnline || currentDraft) {
      saveDraft({
        readings,
        notes: value,
        batchName: batch?.productName,
        farmerName: batch?.farmerName
      });
    }
  };

  const handleCompleteInspection = async () => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot complete inspection while offline. Please connect to internet and try again.",
        variant: "destructive"
      });
      return;
    }

    if (batch?.status === 'draft') {
      toast({ 
        title: "Batch Not Submitted", 
        description: "This batch must be submitted for inspection first. Please contact the farmer to submit the batch.",
        variant: "destructive"
      });
      return;
    }

    const validReadings = readings.filter(r => r.parameter && r.value !== '');
    if (validReadings.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one quality reading before completing.",
        variant: "destructive"
      });
      return;
    }

    const passed = validReadings.every(r => r.passed);
    
    setIsSubmitting(true);
    try {
      let inspectionId = existingInspection?.id;
      
      // Create inspection if it doesn't exist
      if (!existingInspection) {
        const inspectionData = {
          batchId: id,
          inspectorId: user?.id || '',
          inspectorName: user?.name || 'Unknown Inspector',
          readings: validReadings,
          notes,
          geolocation: {
            latitude: batch?.location?.latitude || 0,
            longitude: batch?.location?.longitude || 0,
            accuracy: 10,
            timestamp: new Date().toISOString(),
          },
        };
        
        const newInspection = await createInspection.mutateAsync({ 
          batchId: id, 
          data: inspectionData 
        });
        inspectionId = newInspection.data.id;
      }

      await completeInspection.mutateAsync({
        id: inspectionId,
        data: {
          readings: validReadings as unknown as Record<string, unknown>[],
          notes,
          overallResult: passed ? 'pass' : 'fail',
          outcome: {
            classification: passed ? 'pass' : 'fail',
            reasoning: passed ? 'All quality parameters meet the required standards.' : 'One or more quality parameters failed to meet standards.',
            followUpRequired: !passed,
            complianceNotes: notes || ''
          }
        }
      });
      
      toast({ 
        title: "Inspection completed", 
        description: `Quality inspection ${passed ? 'passed' : 'failed'}. Batch status has been updated.`,
      });
      
      navigate('/inspections');
    } catch (error) {
      console.error('Complete inspection error:', error);
      let message = "Failed to complete inspection. Please try again.";

      if (error && typeof error === "object") {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };

        message = err.response?.data?.message || err.message || message;
      }
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (batchLoading || inspectionsLoading) {
    return (
      <AppShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!batch) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Batch not found</h2>
          <p className="text-muted-foreground mb-4">The requested batch could not be found.</p>
          <Button asChild>
            <Link to="/inspections">Back to Inspections</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (user?.role !== 'qa_inspector' && user?.role !== 'admin') {
    return (
      <AppShell>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You don't have permission to inspect batches.</p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const allReadingsPassed = readings.filter(r => r.parameter && r.value !== '').every(r => r.passed);
  const hasValidReadings = readings.some(r => r.parameter && r.value !== '');

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/inspections">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inspections
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Quality Inspection</h1>
            <p className="text-muted-foreground">
              Inspecting batch {batch.id || 'Loading...'} • {batch.productName || 'Loading...'}
            </p>
          </div>
          <StatusBadge status={batch.status} />
        </div>

        {/* Draft Batch Warning */}
        {batch?.status === 'draft' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-900">Batch Not Yet Submitted</h3>
                    <p className="text-sm text-orange-700 mt-1">
                      This batch is still in draft status and has not been submitted for inspection. 
                      Please contact the farmer to submit the batch first.
                    </p>
                    <div className="mt-2">
                      <Badge variant="outline" className="border-orange-300 text-orange-700">
                        Status: {batch.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Offline Capability Banner */}
        <OfflineCapabilityBanner />

        {/* Offline Status and Draft Management */}
        <div className="grid gap-6 lg:grid-cols-2">
          <OfflineStatus
            isOnline={isOnline}
            currentDraft={currentDraft}
            draftStats={getDraftStats()}
            onExport={() => exportDraft()}
            onImport={(file) => importDraft(file, async (file) => {
              // Unified file handler - processes lab reports with AI
              setUploadedFile(file);
              setIsProcessingAI(true);

              try {
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                  throw new Error('File size must be less than 5MB');
                }

                const aiClient = getAIClient();
                if (!aiClient) {
                  throw new Error('AI service is not properly configured');
                }
                
                // Extract text from file
                const reportText = await extractTextFromFile(file);
                
                if (!reportText.trim()) {
                  throw new Error('The uploaded file appears to be empty or contains no readable text');
                }
                
                // Process with AI
                const extractedData = await processLabReportWithAI(reportText, aiClient);
                
                // Validate and update readings with extracted parameters
                if (extractedData.parameters && Array.isArray(extractedData.parameters)) {
                  const validatedParameters = validateExtractedParameters(extractedData.parameters);
                  
                  const newReadings = validatedParameters.map((param: any) => ({
                    parameter: param.parameter,
                    value: param.value,
                    unit: param.unit,
                    minThreshold: param.minThreshold,
                    maxThreshold: param.maxThreshold,
                    passed: param.passed
                  }));
                  
                  setReadings(newReadings);
                  
                  // Add AI processing notes if available
                  if (extractedData.notes) {
                    const aiNotes = `\n\n--- AI Extraction Notes ---\n${extractedData.notes}\nFile: ${file.name}\nProcessed: ${new Date().toLocaleString()}`;
                    setNotes(prevNotes => prevNotes + aiNotes);
                  }
                  
                  toast({
                    title: "Lab Report Successfully Processed",
                    description: `Extracted ${extractedData.extractedValues} parameters with ${extractedData.confidence} confidence. ${validatedParameters.filter(p => p.passed).length}/${validatedParameters.length} parameters passed quality thresholds.`,
                    variant: "default"
                  });

                  // Auto-save to draft if offline or if current draft exists
                  if (!isOnline || currentDraft) {
                    saveDraft({
                      readings: newReadings,
                      notes,
                      batchName: batch?.productName,
                      farmerName: batch?.farmerName
                    });
                  }
                } else {
                  throw new Error('No valid parameters were extracted from the lab report');
                }
              } finally {
                setIsProcessingAI(false);
              }
            })}
          />
          
          {(drafts.length > 0 || showDraftManager) && (
            <DraftManager
              drafts={drafts}
              currentDraftId={currentDraft?.id}
              onExportDraft={exportDraft}
              onDeleteDraft={deleteDraft}
              onLoadDraft={handleLoadDraft}
            />
          )}
          
          {drafts.length > 0 && !showDraftManager && (
            <Button
              variant="outline"
              onClick={() => setShowDraftManager(true)}
              className="h-auto"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Drafts ({drafts.length})
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Batch Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Batch Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Product</Label>
                <p className="text-sm">{batch.productName || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <p className="text-sm">{batch.productType || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Quantity</Label>
                <p className="text-sm">{batch.quantity || 0} {batch.unit || 'units'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Farmer</Label>
                <p className="text-sm">{batch.farmerName || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Harvest Date</Label>
                <p className="text-sm">{batch.harvestDate ? new Date(batch.harvestDate).toLocaleDateString() : 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Location</Label>
                <p className="text-sm">{batch.location?.address || 'Location not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Certificate Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={hasCertificate ? 'default' : 'outline'}>
                    {hasCertificate ? 'Issued' : 'Not Issued'}
                  </Badge>
                  {hasCertificate && certificate && (
                    <span className="text-xs text-muted-foreground">
                      ID: {certificate.id.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Readings */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Quality Readings
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept=".txt,.json,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isProcessingAI}
                      id="lab-report-upload"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={isProcessingAI}
                      className="relative"
                    >
                      {isProcessingAI ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          AI Extract
                        </>
                      )}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={addReading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manual
                  </Button>
                </div>
              </div>
              {uploadedFile && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-lg">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Uploaded: {uploadedFile.name}
                  </span>
                  {isProcessingAI && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Processing...</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* AI Extraction Guide */}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">AI Lab Report Processing</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Upload a lab report (.txt, .pdf, .json) to automatically extract Moisture Content, Temperature, and pH Level. 
                      The AI will parse the report and populate readings with quality validation.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Supported formats: PDF files, Text files, JSON reports, or any readable lab document.
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {readings.map((reading, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg">
                  <div className="col-span-3">
                    <Label htmlFor={`parameter-${index}`}>Parameter</Label>
                    <Input
                      id={`parameter-${index}`}
                      value={reading.parameter}
                      onChange={(e) => updateReading(index, 'parameter', e.target.value)}
                      placeholder="e.g., pH Level"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`value-${index}`}>Value</Label>
                    <Input
                      id={`value-${index}`}
                      type="number"
                      step="any"
                      value={reading.value}
                      onChange={(e) => updateReading(index, 'value', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`unit-${index}`}>Unit</Label>
                    <Input
                      id={`unit-${index}`}
                      value={reading.unit}
                      onChange={(e) => updateReading(index, 'unit', e.target.value)}
                      placeholder="e.g., pH, %, °C"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`min-${index}`}>Min</Label>
                    <Input
                      id={`min-${index}`}
                      type="number"
                      step="any"
                      value={reading.minThreshold || ''}
                      onChange={(e) => updateReading(index, 'minThreshold', parseFloat(e.target.value) || undefined)}
                      placeholder="Min value"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor={`max-${index}`}>Max</Label>
                    <Input
                      id={`max-${index}`}
                      type="number"
                      step="any"
                      value={reading.maxThreshold || ''}
                      onChange={(e) => updateReading(index, 'maxThreshold', parseFloat(e.target.value) || undefined)}
                      placeholder="Max value"
                    />
                  </div>
                  <div className="col-span-1 flex items-center gap-2">
                    {reading.passed && reading.value !== '' ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : reading.value !== '' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReading(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {readings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No quality readings yet</p>
                  <Button variant="outline" onClick={addReading} className="mt-3">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first reading
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Inspector Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add any observations, notes, or comments about the quality inspection..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="lg:col-span-3">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {hasValidReadings && (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                      allReadingsPassed 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {allReadingsPassed ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      Quality: {allReadingsPassed ? 'Passed' : 'Failed'}
                    </div>
                  )}
                  {existingInspection && (
                    <Badge variant="outline">
                      Status: {existingInspection.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSaveProgress}
                    disabled={isSubmitting || !hasValidReadings}
                    className={cn(
                      !isOnline && "border-orange-300 bg-orange-50 text-orange-700"
                    )}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {!isOnline ? 'Save Locally' : 'Save Progress'}
                  </Button>
                  <Button
                    onClick={handleCompleteInspection}
                    disabled={
                      isSubmitting || 
                      !hasValidReadings || 
                      !isOnline ||
                      batch?.status === 'draft'
                    }
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {batch?.status === 'draft' ? 'Batch must be submitted first' : 'Complete Inspection'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AppShell>
  );
}
