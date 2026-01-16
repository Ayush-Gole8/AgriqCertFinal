import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useBatch, useInspections, useCreateInspection, useUpdateInspection, useCompleteInspection } from '@/hooks/useApi';
import { useToast } from '@/hooks/use-toast';

interface Reading {
  parameter: string;
  value: string | number;
  unit: string;
  minThreshold?: number;
  maxThreshold?: number;
  passed: boolean;
}

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: batchData, isLoading: batchLoading } = useBatch(id || '');
  const { data: inspectionsData, isLoading: inspectionsLoading } = useInspections({ batchId: id });
  const createInspection = useCreateInspection();
  const updateInspection = useUpdateInspection();
  const completeInspection = useCompleteInspection();
  
  const batch = batchData?.data;
  const inspections = inspectionsData?.data || [];
  const existingInspection = inspections[0];
  
  const [readings, setReadings] = useState<Reading[]>(
    existingInspection?.readings || [
      { parameter: 'Moisture Content', value: '', unit: '%', minThreshold: 10, maxThreshold: 14, passed: false },
      { parameter: 'Temperature', value: '', unit: '°C', minThreshold: 20, maxThreshold: 25, passed: false },
      { parameter: 'pH Level', value: '', unit: 'pH', minThreshold: 6.0, maxThreshold: 7.5, passed: false },
    ]
  );
  
  const [notes, setNotes] = useState(existingInspection?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateReading = (index: number, field: keyof Reading, value: string | number | undefined) => {
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
  };

  const addReading = () => {
    setReadings([...readings, { parameter: '', value: '', unit: '', passed: false }]);
  };

  const removeReading = (index: number) => {
    setReadings(readings.filter((_, i) => i !== index));
  };

  // Initialize with at least one reading if empty
  React.useEffect(() => {
    if (readings.length === 0) {
      setReadings([{ parameter: '', value: '', unit: '', passed: false }]);
    }
  }, [readings.length]);

  const handleSaveProgress = async () => {
    if (!id) return;
    
    const validReadings = readings.filter(r => r.parameter && r.value !== '');
    
    if (validReadings.length === 0) {
      toast({ 
        title: "Error", 
        description: "Please add at least one quality reading with parameter and value before saving.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const inspectionData = {
        readings: validReadings,
        notes,
        geolocation: {
          latitude: batch?.location?.latitude || 0,
          longitude: batch?.location?.longitude || 0,
          accuracy: 10,
          timestamp: new Date().toISOString(),
        },
      };

      if (existingInspection) {
        await updateInspection.mutateAsync({ id: existingInspection.id, data: inspectionData });
        toast({ title: "Progress saved", description: "Inspection progress has been saved successfully." });
      } else {
        await createInspection.mutateAsync({ batchId: id, data: inspectionData });
        toast({ title: "Inspection started", description: "Quality inspection has been initiated." });
      }
    } catch (error) {
      console.error('Save progress error:', error);
      let message = "Failed to save inspection progress. Please try again.";

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

  const handleCompleteInspection = async () => {
    if (!existingInspection) {
      toast({ 
        title: "Error", 
        description: "Please save your progress first before completing the inspection.",
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
      await completeInspection.mutateAsync({
        id: existingInspection.id,
        data: {
          readings: validReadings,
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
                <Button variant="outline" size="sm" onClick={addReading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reading
                </Button>
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
                onChange={(e) => setNotes(e.target.value)}
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
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Progress
                  </Button>
                  <Button
                    onClick={handleCompleteInspection}
                    disabled={isSubmitting || !hasValidReadings || !existingInspection}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Complete Inspection
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
