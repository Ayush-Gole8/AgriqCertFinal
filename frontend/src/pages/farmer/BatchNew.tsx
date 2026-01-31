import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, ArrowRight, CheckCircle, Loader2, MapPin, Camera, Upload, 
  Phone, Mail, Calendar, Package, Beaker, FileText, Shield, User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppShell } from '@/components/layout/AppShell';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/api/apiClient';
import { AlertCircle } from 'lucide-react';

const CROPS = [
  { value: 'wheat', label: 'Wheat' },
  { value: 'rice', label: 'Rice' },
  { value: 'maize', label: 'Maize/Corn' },
  { value: 'barley', label: 'Barley' },
  { value: 'soybean', label: 'Soybean' },
  { value: 'cotton', label: 'Cotton' },
  { value: 'sugarcane', label: 'Sugarcane' },
  { value: 'potato', label: 'Potato' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'other', label: 'Other' },
];

const CROP_VARIETIES: Record<string, { value: string; label: string }[]> = {
  rice: [
    { value: 'basmati', label: 'Basmati' },
    { value: 'sona_masuri', label: 'Sona Masuri' },
    { value: 'ir64', label: 'IR-64' },
    { value: 'mtu1010', label: 'MTU-1010' },
    { value: 'swarna', label: 'Swarna' },
  ],

  wheat: [
    { value: 'hd_2967', label: 'HD-2967' },
    { value: 'hd_3086', label: 'HD-3086' },
    { value: 'lok1', label: 'Lok-1' },
    { value: 'pbw_343', label: 'PBW-343' },
    { value: 'dbw_187', label: 'DBW-187' },
  ],

  maize: [
    { value: 'dent', label: 'Dent Corn' },
    { value: 'flint', label: 'Flint Corn' },
    { value: 'sweet', label: 'Sweet Corn' },
    { value: 'baby_corn', label: 'Baby Corn' },
    { value: 'hybrid_maize', label: 'Hybrid Maize' },
  ],

  barley: [
    { value: 'bh393', label: 'BH-393' },
    { value: 'rd2035', label: 'RD-2035' },
    { value: 'rd2552', label: 'RD-2552' },
  ],

  soybean: [
    { value: 'js335', label: 'JS-335' },
    { value: 'js9560', label: 'JS-9560' },
    { value: 'nrc37', label: 'NRC-37' },
    { value: 'ps1347', label: 'PS-1347' },
  ],

  cotton: [
    { value: 'bt_cotton', label: 'BT Cotton' },
    { value: 'desi_cotton', label: 'Desi Cotton' },
    { value: 'hybrid_cotton', label: 'Hybrid Cotton' },
    { value: 'shankar6', label: 'Shankar-6' },
  ],

  sugarcane: [
    { value: 'co0238', label: 'CO-0238' },
    { value: 'co86032', label: 'CO-86032' },
    { value: 'co671', label: 'CO-671' },
    { value: 'co99004', label: 'CO-99004' },
  ],

  potato: [
    { value: 'kufri_jyoti', label: 'Kufri Jyoti' },
    { value: 'kufri_pukhraj', label: 'Kufri Pukhraj' },
    { value: 'kufri_bahaar', label: 'Kufri Bahaar' },
    { value: 'kufri_chipsona', label: 'Kufri Chipsona' },
  ],

  tomato: [
    { value: 'pusa_ruby', label: 'Pusa Ruby' },
    { value: 'arka_vikas', label: 'Arka Vikas' },
    { value: 'roma', label: 'Roma' },
    { value: 'cherry_tomato', label: 'Cherry Tomato' },
    { value: 'hybrid_tomato', label: 'Hybrid Tomato' },
  ],
};

const PACKAGING_TYPES = [
  { value: 'jute_sack', label: 'Jute Sack' },
  { value: 'polybag', label: 'Polybag' },
  { value: 'bulk_container', label: 'Bulk Container' },
  { value: 'box', label: 'Box' },
  { value: 'crate', label: 'Crate' },
];

const INSPECTION_RESULTS = [
  { value: 'pass', label: 'Pass' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'fail', label: 'Fail' },
];

const INCOTERMS = [
  { value: 'FOB', label: 'FOB - Free on Board' },
  { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
  { value: 'EXW', label: 'EXW - Ex Works' },
  { value: 'FCA', label: 'FCA - Free Carrier' },
  { value: 'CFR', label: 'CFR - Cost and Freight' },
];

const PHOTO_TYPES = [
  { value: 'field', label: 'Field View' },
  { value: 'harvest', label: 'Harvest Process' },
  { value: 'packing', label: 'Packing/Storage' },
  { value: 'weighbridge', label: 'Weighbridge/Scale' },
];

// Generate batch ID
const generateBatchId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `AGQC-${year}${month}${day}-REG-${random}`;
};

// Validation schemas
const farmAddressSchema = z.object({
  street: z.string().optional(),
  village: z.string().min(2, 'Village is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().min(2, 'Country is required'),
  postal_code: z.string().optional(),
});

const photoSchema = z.object({
  url: z.string().min(1, 'Photo URL is required'),
  timestamp: z.string(),
  type: z.enum(['field', 'harvest', 'packing', 'weighbridge']),
  caption: z.string().optional(),
});

const batchSchema = z.object({
  // A. Basic/Identity
  batch_id: z.string().regex(/^[A-Z0-9\-]{6,50}$/, 'Invalid batch ID format'),
  farmer_id: z.string().min(1, 'Farmer ID is required'),
  farmer_name: z.string().min(2, 'Farmer name is required'),
  contact_phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),

  // B. Farm & Origin
  farm_address: farmAddressSchema,
  farm_geo_point: z.object({
    lat: z.coerce.number().min(-90).max(90, 'Invalid latitude'),
    lon: z.coerce.number().min(-180).max(180, 'Invalid longitude'),
  }),
  land_area_ha: z.coerce.number().positive('Land area must be positive').optional().or(z.literal(0)),

  // C. Crop & Batch
  crop: z.string().min(2, 'Crop type is required'),
  variety: z.string().min(1, 'Variety is required'),
  planting_date: z.string().optional().or(z.literal('')),
  harvest_date: z.string().min(1, 'Harvest date is required'),
  lot_number: z.string().optional().or(z.literal('')),
  quantity_net_kg: z.coerce.number().positive('Quantity must be positive'),
  packaging_type: z.string().optional(),
  num_packages: z.coerce.number().int().positive('Number of packages must be positive').optional().or(z.literal(0)),

  // D. Quality & Lab
  moisture_percent: z.coerce.number().min(0).max(100, 'Moisture must be 0-100%').optional().or(z.literal(0)),
  foreign_matter_percent: z.coerce.number().min(0).max(100, 'Foreign matter must be 0-100%').optional().or(z.literal(0)),
  broken_grain_percent: z.coerce.number().min(0).max(100, 'Broken grain must be 0-100%').optional().or(z.literal(0)),
  lab_test_id: z.string().optional().or(z.literal('')),

  // E. Compliance & Trade
  hs_code: z.string().regex(/^\d{6,8}$/, 'HS Code must be 6-8 digits').optional().or(z.literal('')),
  destination_country: z.string().min(2, 'Destination country is required').optional().or(z.literal('')),
  port_of_loading: z.string().optional().or(z.literal('')),
  incoterm: z.string().optional(),

  // F. Attachments
  photos: z.array(photoSchema).min(2, 'Minimum 2 photos required (field + packing)'),

  // G. Declarations
  farmer_declaration: z.boolean().refine(val => val === true, 'You must accept the farmer declaration'),
});

type BatchFormData = z.infer<typeof batchSchema>;

function BatchNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; timestamp: string; type: string; caption?: string }>>([]);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      batch_id: generateBatchId(),
      farmer_id: user?.id || '',
      farmer_name: user?.name || '',
      contact_phone: user?.phone || '',
      contact_email: user?.email || '',
      farm_address: {
        street: '',
        village: '',
        district: '',
        state: '',
        country: 'India',
        postal_code: '',
      },
      farm_geo_point: {
        lat: 0,
        lon: 0,
      },
      land_area_ha: 0,
      crop: '',
      variety: '',
      planting_date: '',
      harvest_date: '',
      lot_number: '',
      quantity_net_kg: 0,
      packaging_type: '',
      num_packages: 0,
      moisture_percent: 0,
      foreign_matter_percent: 0,
      broken_grain_percent: 0,
      lab_test_id: '',
      hs_code: '',
      destination_country: '',
      port_of_loading: '',
      incoterm: '',
      photos: [],
      farmer_declaration: false,
    },
  });

  // 👇 ADD HERE
const selectedCrop = form.watch('crop');
const selectedVariety = form.watch('variety');

  // Auto-fetch location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      setIsCapturingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue('farm_geo_point.lat', position.coords.latitude);
          form.setValue('farm_geo_point.lon', position.coords.longitude);
          setIsCapturingLocation(false);
          toast({
            title: "Location captured",
            description: "GPS coordinates automatically recorded",
          });
        },
        (error) => {
          console.error('Location error:', error);
          setIsCapturingLocation(false);
          toast({
            title: "Location unavailable",
            description: "Please enter coordinates manually",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [form, toast]);

  const steps = [
    { number: 1, title: 'Basic Info', icon: User },
    { number: 2, title: 'Farm Details', icon: MapPin },
    { number: 3, title: 'Crop Info', icon: Package },
    { number: 4, title: 'Quality Data', icon: Beaker },
    { number: 5, title: 'Trade Info', icon: FileText },
    { number: 6, title: 'Photos', icon: Camera },
    { number: 7, title: 'Declaration', icon: Shield },
  ];

  if (user?.role !== 'farmer') {
    return (
      <AppShell>
        <div className="max-w-md mx-auto mt-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only farmers can create new batches. Please contact your administrator if you believe this is an error.
            </AlertDescription>
          </Alert>
        </div>
      </AppShell>
    );
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      setIsLoading(true);
      const response = await api.uploads.upload(file);
      const newPhoto = {
        url: response.data.url,
        timestamp: new Date().toISOString(),
        type,
        caption: '',
      };

      setUploadedPhotos(prev => [...prev, newPhoto]);
      form.setValue('photos', [...uploadedPhotos, newPhoto]);

      toast({
        title: "Photo uploaded",
        description: `${type} photo added successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: BatchFormData) => {
    try {
      setIsLoading(true);

      // Create batch with comprehensive data
      const batchPayload = {
        farmerId: data.farmer_id,
        farmerName: data.farmer_name,
        productType: data.crop,
        productName: `${data.crop} - ${data.variety}`,
        quantity: data.quantity_net_kg,
        unit: 'kg',
        harvestDate: data.harvest_date,
        location: {
          latitude: data.farm_geo_point.lat,
          longitude: data.farm_geo_point.lon,
          address: `${data.farm_address.street || ''} ${data.farm_address.village}, ${data.farm_address.district}`,
          region: data.farm_address.state,
          country: data.farm_address.country,
        },
        // Additional comprehensive metadata
        batchMetadata: {
          batchId: data.batch_id,
          contactPhone: data.contact_phone,
          contactEmail: data.contact_email,
          farmAddress: data.farm_address,
          landAreaHa: data.land_area_ha,
          variety: data.variety,
          plantingDate: data.planting_date,
          lotNumber: data.lot_number,
          packagingType: data.packaging_type,
          numPackages: data.num_packages,
          qualityData: {
            moisturePercent: data.moisture_percent,
            foreignMatterPercent: data.foreign_matter_percent,
            brokenGrainPercent: data.broken_grain_percent,
            labTestId: data.lab_test_id,
          },
          tradeData: {
            hsCode: data.hs_code,
            destinationCountry: data.destination_country,
            portOfLoading: data.port_of_loading,
            incoterm: data.incoterm,
          },
          photos: data.photos,
          farmerDeclaration: data.farmer_declaration,
          signatureFarmer: `${data.farmer_name} - ${new Date().toISOString()}`,
          dataProvenance: {
            createdBy: user?.id,
            createdAt: new Date().toISOString(),
            clientVersion: '1.0.0',
          },
          verificationHash: '', // Will be generated server-side
        },
      };

      const response = await api.batches.create(batchPayload);

      toast({
        title: "Batch created successfully",
        description: `Batch ${data.batch_id} has been submitted for inspection`,
      });

      navigate(`/farmer/batches/${response.data.id}`);
    } catch (error: unknown) {
      console.error('Batch creation failed:', error);
      toast({
        title: "Submission failed",
        description: "Failed to create batch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormStep = () => {
    switch (currentStep) {
      case 1: // Basic Info
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batch_id">Batch ID</Label>
                <Input
                  {...form.register('batch_id')}
                  disabled
                  className="
                    bg-gray-50 text-gray-900
                    dark:bg-gray-900 dark:text-gray-100
                    dark:border-gray-700
                    disabled:opacity-100
                  "
                />
                {form.formState.errors.batch_id && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.batch_id.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="farmer_name">Farmer Name</Label>
                <Input {...form.register('farmer_name')} />
                {form.formState.errors.farmer_name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.farmer_name.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input 
                  {...form.register('contact_phone')} 
                  type="tel"
                  placeholder="+91 9876543210"
                />
                {form.formState.errors.contact_phone && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.contact_phone.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="contact_email">Contact Email (Optional)</Label>
                <Input 
                  {...form.register('contact_email')} 
                  type="email"
                  placeholder="farmer@example.com"
                />
                {form.formState.errors.contact_email && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.contact_email.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2: // Farm Details
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Farm Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="farm_address.street">Street Address (Optional)</Label>
                  <Input {...form.register('farm_address.street')} placeholder="House No., Street" />
                </div>
                <div>
                  <Label htmlFor="farm_address.village">Village *</Label>
                  <Input {...form.register('farm_address.village')} placeholder="Village name" />
                  {form.formState.errors.farm_address?.village && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.farm_address.village.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="farm_address.district">District *</Label>
                  <Input {...form.register('farm_address.district')} placeholder="District" />
                  {form.formState.errors.farm_address?.district && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.farm_address.district.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="farm_address.state">State *</Label>
                  <Input {...form.register('farm_address.state')} placeholder="State" />
                  {form.formState.errors.farm_address?.state && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.farm_address.state.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                GPS Coordinates
                {isCapturingLocation && <Loader2 className="h-4 w-4 animate-spin" />}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="farm_geo_point.lat">Latitude</Label>
                  <Input 
                    {...form.register('farm_geo_point.lat')} 
                    type="number" 
                    step="any"
                    placeholder="28.6139"
                  />
                  {form.formState.errors.farm_geo_point?.lat && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.farm_geo_point.lat.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="farm_geo_point.lon">Longitude</Label>
                  <Input 
                    {...form.register('farm_geo_point.lon')} 
                    type="number" 
                    step="any"
                    placeholder="77.2090"
                  />
                  {form.formState.errors.farm_geo_point?.lon && (
                    <p className="text-red-500 text-sm mt-1">{form.formState.errors.farm_geo_point.lon.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="land_area_ha">Farm Area (Hectares)</Label>
              <Input 
                {...form.register('land_area_ha')} 
                type="number" 
                step="0.1"
                placeholder="2.5"
              />
            </div>
          </div>
        );

      case 3: // Crop Info  
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
          <Label>Crop Type *</Label>
          <Select
            value={selectedCrop}
            onValueChange={(value) => form.setValue('crop', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select crop" />
            </SelectTrigger>
            <SelectContent>
              {CROPS.map((crop) => (
                <SelectItem key={crop.value} value={crop.value}>
                  {crop.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Variety */}
        <div>
          <Label>Variety *</Label>
          <Select
            value={selectedVariety}
            disabled={!selectedCrop}
            onValueChange={(value) => form.setValue('variety', value)}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={selectedCrop ? 'Select variety' : 'Select crop first'}
              />
            </SelectTrigger>
            <SelectContent>
              {selectedCrop &&
                CROP_VARIETIES[selectedCrop]?.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* 👇 THIS WAS MISSING */}
          {selectedVariety === 'other' && (
            <Input
              className="mt-2"
              placeholder="Enter variety name"
              onChange={(e) => form.setValue('variety', e.target.value)}
            />
          )}

          {form.formState.errors.variety && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.variety.message}
            </p>
          )}
        </div>
            
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="planting_date">Planting Date (Optional)</Label>
                <Input {...form.register('planting_date')} type="date" />
              </div>
              <div>
                <Label htmlFor="harvest_date">Harvest Date *</Label>
                <Input {...form.register('harvest_date')} type="date" />
                {form.formState.errors.harvest_date && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.harvest_date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity_net_kg">Quantity (kg) *</Label>
                <Input 
                  {...form.register('quantity_net_kg')} 
                  type="number" 
                  step="0.1"
                  placeholder="1000"
                />
                {form.formState.errors.quantity_net_kg && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.quantity_net_kg.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="packaging_type">Packaging Type</Label>
                <Select onValueChange={(value) => form.setValue('packaging_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="num_packages">Number of Packages</Label>
                <Input 
                  {...form.register('num_packages')} 
                  type="number"
                  placeholder="20"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lot_number">Lot Number (Optional)</Label>
              <Input {...form.register('lot_number')} placeholder="LOT-2024-001" />
            </div>
          </div>
        );

      case 4: // Quality Data
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="moisture_percent">Moisture Content (%)</Label>
                <Input 
                  {...form.register('moisture_percent')} 
                  type="number" 
                  step="0.1"
                  placeholder="12.5"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="foreign_matter_percent">Foreign Matter (%)</Label>
                <Input 
                  {...form.register('foreign_matter_percent')} 
                  type="number" 
                  step="0.1"
                  placeholder="1.2"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="broken_grain_percent">Broken Grain (%)</Label>
                <Input 
                  {...form.register('broken_grain_percent')} 
                  type="number" 
                  step="0.1"
                  placeholder="2.0"
                  max="100"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lab_test_id">Lab Test ID (Optional)</Label>
              <Input {...form.register('lab_test_id')} placeholder="LAB-2024-001" />
            </div>

            <Alert>
              <Beaker className="h-4 w-4" />
              <AlertDescription>
                Quality parameters will be verified during inspection. Initial values can be estimates.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 5: // Trade Info
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="destination_country">Destination Country</Label>
                <Input {...form.register('destination_country')} placeholder="India, USA, etc." />
              </div>
              <div>
                <Label htmlFor="hs_code">HS Code (6-8 digits)</Label>
                <Input {...form.register('hs_code')} placeholder="100190" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="port_of_loading">Port of Loading</Label>
                <Input {...form.register('port_of_loading')} placeholder="JNPT, Chennai, etc." />
              </div>
              <div>
                <Label htmlFor="incoterm">Incoterm</Label>
                <Select onValueChange={(value) => form.setValue('incoterm', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select incoterm" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {term.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Trade information is optional but recommended for export batches.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 6: // Photos
        return (
          <div className="space-y-6">
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Upload at least 2 photos: one field view and one packing/storage photo. Maximum 5MB each.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PHOTO_TYPES.map((photoType) => (
                <div key={photoType.value} className="space-y-2">
                  <Label>{photoType.label}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => handlePhotoUpload(e, photoType.value)}
                      className="hidden"
                      id={`photo-${photoType.value}`}
                    />
                    <label
                      htmlFor={`photo-${photoType.value}`}
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Upload {photoType.label}
                      </span>
                    </label>
                  </div>
                  {uploadedPhotos.filter(p => p.type === photoType.value).map((photo, index) => (
                    <div key={index} className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Photo uploaded successfully
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600">
              Uploaded photos: {uploadedPhotos.length} / 2 minimum required
            </div>
            
            {form.formState.errors.photos && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.photos.message}</p>
            )}
          </div>
        );

      case 7: // Declaration
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Farmer Declaration</h3>
              <div className="prose prose-sm max-w-none">
                <p>I, <strong>{form.getValues('farmer_name')}</strong>, hereby declare that:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The information provided in this batch submission is accurate and complete to the best of my knowledge.</li>
                  <li>The agricultural products described were grown on my farm at the specified location.</li>
                  <li>I have followed all applicable farming practices and regulations.</li>
                  <li>I consent to inspection of this batch by certified quality inspectors.</li>
                  <li>I understand that false information may result in rejection of certification.</li>
                  <li>I agree to the terms and conditions of the AgriQCert platform.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                checked={form.watch('farmer_declaration')}
                onCheckedChange={(checked) => form.setValue('farmer_declaration', !!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  I accept the farmer declaration
                </label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you agree to the terms stated above.
                </p>
              </div>
            </div>

            {form.formState.errors.farmer_declaration && (
              <p className="text-red-500 text-sm">{form.formState.errors.farmer_declaration.message}</p>
            )}

            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
              <strong>Digital Signature:</strong> {form.getValues('farmer_name')} - {new Date().toLocaleDateString()}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/farmer/batches')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Batches
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Batch
          </h1>
          <p className="text-gray-600">Submit your agricultural batch for quality certification</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-y-6">
  {steps.map((step, index) => {
    const isActive = currentStep === step.number;
    const isCompleted = currentStep > step.number;
    const IconComponent = step.icon;

    return (
      <React.Fragment key={step.number}>
        {/* Step */}
        <div className="flex flex-col items-center min-w-[90px]">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2
              ${
                isCompleted
                  ? 'bg-green-500 border-green-500 text-white'
                  : isActive
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-500'
              }
            `}
          >
            {isCompleted ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <IconComponent className="h-5 w-5" />
            )}
          </div>

          <p
            className={`mt-2 text-sm font-medium text-center
              ${
                isActive
                  ? 'text-blue-600'
                  : isCompleted
                  ? 'text-green-600'
                  : 'text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {step.title}
          </p>
        </div>

        {/* Connector Line */}
        {index < steps.length - 1 && (
          <div className="hidden md:flex flex-1 min-w-[40px] max-w-[80px] items-center">
            <div
              className={`h-0.5 w-full
                ${
                  isCompleted
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }
              `}
            />
          </div>
        )}
      </React.Fragment>
    );
  })}
</div>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(steps[currentStep - 1].icon, { className: "h-5 w-5" })}
                {steps[currentStep - 1].title}
              </CardTitle>
              <CardDescription>
                Step {currentStep} of {steps.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderFormStep()}
              </motion.div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep === steps.length ? (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Batch
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default BatchNew;

