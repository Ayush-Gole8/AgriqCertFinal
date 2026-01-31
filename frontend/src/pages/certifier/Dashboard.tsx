import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  CheckCircle,
  Clock,
  Package,
  Users,
  Calendar,
  ArrowRight,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { useBatches, useCertificates, useIssueCertificate } from '@/hooks/useApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Batch } from '@/types';

export default function CertifierDashboard() {
  const { data: batchesData, isLoading: batchesLoading } = useBatches({ status: 'approved' });
  const { data: certificatesData, isLoading: certificatesLoading } = useCertificates();
  const issueCertificate = useIssueCertificate();
  const { toast } = useToast();

  const approvedBatches = batchesData?.data || [];
  const certificates = certificatesData?.data || [];
  
  // Get batches that are approved but don't have certificates yet
  const pendingCertification = approvedBatches.filter(
    batch => !certificates.find(cert => cert.batchId === batch.id)
  );

  const handleIssueCertificate = async (batchId: string, batchName: string) => {
    try {
      await issueCertificate.mutateAsync(batchId);
      toast({
        title: "Certificate Issued",
        description: `Certificate for batch "${batchName}" has been issued successfully.`,
      });
    } catch (error) {
      console.error('Certificate issuance error:', error);
      toast({
        title: "Issuance Failed",
        description: "Failed to issue certificate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stats = [
    {
      title: 'Pending Certification',
      value: pendingCertification.length,
      icon: Clock,
      color: 'orange',
      description: 'Approved batches awaiting certification'
    },
    {
      title: 'Certificates Issued',
      value: certificates.filter(c => c.status === 'active').length,
      icon: Award,
      color: 'green',
      description: 'Total active certificates'
    },
    {
      title: 'Total Batches',
      value: approvedBatches.length,
      icon: Package,
      color: 'blue',
      description: 'All approved batches'
    },
    {
      title: 'This Month',
      value: certificates.filter(c => {
        const certDate = new Date(c.issuedAt);
        const now = new Date();
        return certDate.getMonth() === now.getMonth() && certDate.getFullYear() === now.getFullYear();
      }).length,
      icon: Calendar,
      color: 'purple',
      description: 'Certificates issued this month'
    }
  ];

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Certifier Dashboard</h1>
            <p className="text-muted-foreground">Manage quality certifications and approve batches</p>
          </div>
          <Button asChild>
            <Link to="/certificates">
              <Award className="h-4 w-4 mr-2" />
              View All Certificates
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        stat.color === 'orange' && "bg-orange-100 text-orange-600",
                        stat.color === 'green' && "bg-green-100 text-green-600",
                        stat.color === 'blue' && "bg-blue-100 text-blue-600",
                        stat.color === 'purple' && "bg-purple-100 text-purple-600"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{stat.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Pending Certification Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Batches Ready for Certification
              </CardTitle>
              {pendingCertification.length > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {pendingCertification.length} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : pendingCertification.length > 0 ? (
              <div className="space-y-3">
                {pendingCertification.map((batch, index) => (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{batch.productName}</h3>
                          <StatusBadge status={batch.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Batch: {batch.id?.slice(-8) || 'N/A'}</span>
                          <span>•</span>
                          <span>Farmer: {batch.farmerName || 'Unknown'}</span>
                          <span>•</span>
                          <span>Quantity: {batch.quantity} {batch.unit}</span>
                          <span>•</span>
                          <span>Submitted: {new Date(batch.submittedAt || '').toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link to={`/inspection/${batch.id}`}>
                          View Inspection
                        </Link>
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleIssueCertificate(batch.id, batch.productName)}
                        disabled={issueCertificate.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {issueCertificate.isPending ? 'Issuing...' : 'Issue Certificate'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No pending certifications</h3>
                <p className="text-muted-foreground mb-4">
                  All approved batches have been certified. Check back when new inspections are completed.
                </p>
                <Button variant="outline" asChild>
                  <Link to="/certificates">
                    View Issued Certificates
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Certificates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-500" />
                Recent Certificates
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/certificates">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {certificatesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            ) : certificates.length > 0 ? (
              <div className="space-y-3">
                {certificates.slice(0, 5).map((cert, index) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{cert.vc?.credentialSubject?.productName || 'Unknown Product'}</h3>
                          <Badge variant={cert.status === 'active' ? 'success' : 'secondary'}>
                            {cert.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>ID: {cert.id?.slice(-8) || 'N/A'}</span>
                          <span>•</span>
                          <span>Issued: {new Date(cert.issuedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Batch: {cert.batchId?.slice(-8) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/certificates/${cert.id}`}>
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No certificates issued</h3>
                <p className="text-muted-foreground">
                  Start by issuing certificates for approved batches above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}