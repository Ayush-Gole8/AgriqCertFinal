import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Package,
  Calendar,
  MapPin,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/api/apiClient';
import type { Batch } from '@/types';

const statusFilters: string[] = ['all', 'draft', 'submitted', 'inspecting', 'approved', 'certified', 'rejected'];

export default function BatchList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchBatches();
  }, [user, navigate]);

  const fetchBatches = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await api.batches.list({ page: 1, limit: 100 });

      let filteredBatches = response.data || [];

      // Role-based filtering
      if (user?.role === 'farmer') {
        // Farmers see only their own batches
        filteredBatches = filteredBatches.filter((b: Batch) => b.farmerId === user.id);
      } else if (user?.role === 'qa_inspector') {
        // QA Inspectors see only submitted and inspecting batches
        filteredBatches = filteredBatches.filter((b: Batch) => b.status === 'submitted' || b.status === 'inspecting');
      } else if (user?.role === 'certifier') {
        // Certifiers see only approved and rejected batches
        filteredBatches = filteredBatches.filter((b: Batch) => b.status === 'approved' || b.status === 'rejected' || b.status === 'certified');
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filteredBatches = filteredBatches.filter((b: Batch) => b.status === statusFilter);
      }

      setBatches(filteredBatches);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to fetch batches');
      console.error('Batch fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'inspecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'certified':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'inspecting':
        return <Clock className="w-4 h-4" />;
      case 'approved':
      case 'certified':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Batches</h1>
            <p className="text-muted-foreground">Manage and track agricultural batches</p>
          </div>
          {user?.role === 'farmer' && (
            <Button
              onClick={() => navigate('/batches/new')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Batch
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {statusFilters.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                statusFilter === status
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-32 bg-secondary/50 rounded" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && batches.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">No batches found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'all' 
                  ? `No batches with status "${statusFilter}"` 
                  : user?.role === 'farmer' 
                    ? 'Create your first batch to get started' 
                    : 'No batches available for your role'}
              </p>
              {user?.role === 'farmer' && statusFilter === 'all' && (
                <Button
                  onClick={() => navigate('/batches/new')}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                >
                  Create Your First Batch
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Batches Grid */}
        {!isLoading && batches.length > 0 && (
          <div className="grid gap-4">
            {batches.map((batch, index) => (
              <motion.div
                key={batch.id || `batch-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow hover:bg-accent/30" 
                  onClick={() => navigate(`/batches/${batch.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 font-semibold text-lg flex-shrink-0">
                          {batch.productName.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-semibold text-lg truncate">{batch.productName}</h3>
                            <Badge className={`${getStatusColor(batch.status)} flex items-center gap-1 flex-shrink-0`}>
                              {getStatusIcon(batch.status)}
                              <span className="capitalize">{batch.status}</span>
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span key={`${batch.id}-quantity`} className="flex items-center gap-1">
                              <Package className="h-3.5 w-3.5" />
                              {batch.quantity} {batch.unit}
                            </span>
                            <span key={`${batch.id}-harvest`} className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(batch.harvestDate).toLocaleDateString()}
                            </span>
                            <span key={`${batch.id}-location`} className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {batch.location.region}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/batches/${batch.id}`);
                        }}
                        className="flex-shrink-0"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
