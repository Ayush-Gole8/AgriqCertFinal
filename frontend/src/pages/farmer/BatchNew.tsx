import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/api/apiClient';

const UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'tonne', label: 'Tonne (MT)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'lbs', label: 'Pound (lbs)' },
  { value: 'oz', label: 'Ounce (oz)' },
  { value: 'quintal', label: 'Quintal (q)' },
  { value: 'bag', label: 'Bag' },
  { value: 'box', label: 'Box' },
  { value: 'crate', label: 'Crate' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'gallon', label: 'Gallon (US)' },
];

const batchSchema = z.object({
  productType: z.string().min(2, 'Product type is required'),
  productName: z.string().min(2, 'Product name is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  harvestDate: z.string().min(1, 'Harvest date is required'),
  location: z.object({
    latitude: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
    longitude: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
    address: z.string().min(5, 'Address is required'),
    region: z.string().min(2, 'Region is required'),
  }),
});

type BatchFormData = z.infer<typeof batchSchema>;

export default function BatchNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [step, setStep] = useState<'details' | 'location' | 'review'>('details');

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      productType: '',
      productName: '',
      quantity: 0,
      unit: 'kg',
      harvestDate: '',
      location: {
        latitude: 0,
        longitude: 0,
        address: '',
        region: '',
      },
    },
  });

  if (user?.role !== 'farmer') {
    return (
      <AppShell>
        <div className="max-w-md mx-auto py-12">
          <Card className="w-full">
            <CardContent className="pt-6">
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Only farmers can create batches
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate(-1)} className="w-full">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleBack = () => {
    if (step === 'location') {
      setStep('details');
    } else if (step === 'review') {
      setStep('location');
    }
  };

  const handleNext = async () => {
    if (step === 'details') {
      const isValid = await form.trigger(['productType', 'productName', 'quantity', 'unit', 'harvestDate']);
      if (isValid) {
        setStep('location');
      }
    } else if (step === 'location') {
      const isValid = await form.trigger([
        'location.latitude',
        'location.longitude',
        'location.address',
        'location.region',
      ]);
      if (isValid) {
        setStep('review');
      }
    }
  };

  const onSubmit = async (data: BatchFormData) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const location = {
        latitude: Number(data.location.latitude),
        longitude: Number(data.location.longitude),
        address: data.location.address || '',
        region: data.location.region || '',
      };

      const batchResponse = await api.batches.create({
        farmerId: user?.id || '',
        farmerName: user?.name || '',
        productType: data.productType,
        productName: data.productName,
        quantity: data.quantity,
        unit: data.unit,
        harvestDate: data.harvestDate,
        location,
        attachments: [],
      });

      if (!batchResponse.success) {
        throw new Error(batchResponse.message || 'Failed to create batch');
      }

      const batchId = batchResponse.data.id;

      const submitResponse = await api.batches.submit(batchId);

      if (!submitResponse.success) {
        throw new Error(submitResponse.message || 'Failed to submit batch');
      }

      setSuccessMessage('Batch created and submitted successfully!');
      setTimeout(() => {
        navigate('/batches');
      }, 2000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(err.response?.data?.message || err.message || 'An error occurred');
      console.error('Batch submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formData = form.watch();

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Batch</h1>
            <p className="text-muted-foreground">Step {step === 'details' ? '1' : step === 'location' ? '2' : '3'} of 3</p>
          </div>
        </div>

        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle>
              {step === 'details'
                ? 'Product Details'
                : step === 'location'
                  ? 'Location Information'
                  : 'Review & Submit'}
            </CardTitle>
            <CardDescription>
              {step === 'details'
                ? 'Enter the basic information about your batch'
                : step === 'location'
                  ? 'Provide location details for your batch'
                  : 'Review all information before submitting'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Step 1: Details */}
              {step === 'details' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">Product Type</label>
                    <Input
                      {...form.register('productType')}
                      placeholder="e.g., Tomato, Rice, Wheat"
                      className="w-full"
                    />
                    {form.formState.errors.productType && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.productType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Product Name</label>
                    <Input
                      {...form.register('productName')}
                      placeholder="e.g., Organic Red Tomatoes"
                      className="w-full"
                    />
                    {form.formState.errors.productName && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.productName.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Quantity</label>
                      <Input
                        {...form.register('quantity')}
                        type="number"
                        placeholder="0"
                        className="w-full"
                      />
                      {form.formState.errors.quantity && (
                        <p className="text-red-600 text-sm mt-1">{form.formState.errors.quantity.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Unit</label>
                      <select
                        {...form.register('unit')}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="">Select a unit</option>
                        {UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                      {form.formState.errors.unit && (
                        <p className="text-red-600 text-sm mt-1">{form.formState.errors.unit.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Harvest Date</label>
                    <Input
                      {...form.register('harvestDate')}
                      type="date"
                      className="w-full"
                    />
                    {form.formState.errors.harvestDate && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.harvestDate.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Location */}
              {step === 'location' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">Address</label>
                    <Input
                      {...form.register('location.address')}
                      placeholder="e.g., 123 Farm Road, Village"
                      className="w-full"
                    />
                    {form.formState.errors.location?.address && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.location.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Region</label>
                    <Input
                      {...form.register('location.region')}
                      placeholder="e.g., Maharashtra, Karnataka"
                      className="w-full"
                    />
                    {form.formState.errors.location?.region && (
                      <p className="text-red-600 text-sm mt-1">{form.formState.errors.location.region.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Latitude</label>
                      <Input
                        {...form.register('location.latitude')}
                        type="number"
                        step="0.000001"
                        placeholder="0.00"
                        className="w-full"
                      />
                      {form.formState.errors.location?.latitude && (
                        <p className="text-red-600 text-sm mt-1">{form.formState.errors.location.latitude.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Longitude</label>
                      <Input
                        {...form.register('location.longitude')}
                        type="number"
                        step="0.000001"
                        placeholder="0.00"
                        className="w-full"
                      />
                      {form.formState.errors.location?.longitude && (
                        <p className="text-red-600 text-sm mt-1">{form.formState.errors.location.longitude.message}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review */}
              {step === 'review' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <Card className="bg-secondary/50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-4">Product Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Product Type</p>
                          <p className="font-medium">{formData.productType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Product Name</p>
                          <p className="font-medium">{formData.productName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Quantity</p>
                          <p className="font-medium">{formData.quantity} {formData.unit}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Harvest Date</p>
                          <p className="font-medium">{new Date(formData.harvestDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-secondary/50">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-4">Location Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium">{formData.location.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Region</p>
                          <p className="font-medium">{formData.location.region}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Latitude</p>
                          <p className="font-medium">{formData.location.latitude}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Longitude</p>
                          <p className="font-medium">{formData.location.longitude}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      By submitting, you confirm that all information is accurate and complete.
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </form>
          </CardContent>

          <div className="flex items-center justify-between p-6 pt-0 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'details' || isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step !== 'review' ? (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Batch
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </AppShell>
  );
}

