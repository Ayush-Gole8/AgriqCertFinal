import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  User,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Award,
  ExternalLink,
  QrCode,
  Download,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { QRViewer } from '@/components/QRViewer';
import { AppShell } from '@/components/layout/AppShell';
import { useBatch, useInspections } from '@/hooks/useApi';
import { useCertificateByBatch, useBatchCertificateStatus } from '@/hooks/useVCS';
import { useIssueVC } from '@/hooks/useIssueVC';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  
  const { data: batchData, isLoading, refetch: refetchBatch } = useBatch(id || '');
  const { data: inspectionsData } = useInspections({ batchId: id });
  const { certificate, hasCertificate, status: certificateStatus, canIssue } = useBatchCertificateStatus(id || '');
  const issueVC = useIssueVC();
  
  const batch = batchData?.data;
  const inspections = inspectionsData?.data || [];
  const inspection = inspections[0];

  const handleIssueVC = async () => {
    if (!batch || !inspection) return;
    
    try {
      await issueVC.mutateAsync({
        batchId: batch.id,
        inspectionId: inspection.id,
      });
    } catch (error) {
      console.error('Failed to issue VC:', error);
    }
  };

  const canUserIssueVC = () => {
    if (!user || !batch || !inspection) return false;
    
    const allowedRoles = ['qa_inspector', 'certifier', 'admin'];
    if (!allowedRoles.includes(user.role)) return false;
    
    if (inspection.status !== 'completed' || inspection.overallResult !== 'pass') return false;
    
    if (hasCertificate || issueVC.isPending) return false;
    
    return true;
  };

  if (isLoading) {
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
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Batch not found</h2>
          <p className="text-muted-foreground mb-4">The batch you're looking for doesn't exist.</p>
          <Button variant="outline" asChild>
            <Link to="/batches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Batches
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const timeline = [
    { event: 'Batch Created', date: batch.createdAt, status: 'completed' as const },
    { event: 'Submitted for Inspection', date: batch.submittedAt, status: batch.submittedAt ? 'completed' as const : 'pending' as const },
    { event: 'Inspection', date: inspection?.completedAt, status: inspection?.status === 'completed' ? 'completed' as const : inspection ? 'current' as const : 'pending' as const },
    { event: 'Certification', date: batch.certifiedAt, status: batch.certifiedAt ? 'completed' as const : 'pending' as const },
  ];

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/batches">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{batch.productName || 'Unnamed Product'}</h1>
                <StatusBadge status={batch.status} />
              </div>
              <p className="text-muted-foreground font-mono">{batch.id || 'No ID'}</p>
            </div>
          </div>
          
          {batch.status === 'certified' && certificate && (
            <Button variant="gradient" asChild>
              <Link to={`/certificates/${certificate.id}`}>
                <Award className="h-4 w-4 mr-2" />
                View Certificate
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Product Type</dt>
                    <dd className="font-medium capitalize">{batch.productType || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Quantity</dt>
                    <dd className="font-medium">{batch.quantity || 0} {batch.unit || 'units'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Harvest Date</dt>
                    <dd className="font-medium">{batch.harvestDate ? new Date(batch.harvestDate).toLocaleDateString() : 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Farmer</dt>
                    <dd className="font-medium">{batch.farmerName || 'Not specified'}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{batch.location?.address || 'Address not specified'}</p>
                  <p className="text-sm text-muted-foreground">{batch.location?.region || 'Region not specified'}</p>
                  <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                    <span>Lat: {batch.location?.latitude?.toFixed(4) || 'N/A'}</span>
                    <span>Long: {batch.location?.longitude?.toFixed(4) || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {batch.attachments && batch.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Attachments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {batch.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="group relative aspect-square rounded-xl border border-border overflow-hidden bg-muted"
                      >
                        {attachment.type === 'image' ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full p-4">
                            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-xs text-center truncate w-full">{attachment.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {inspection && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Inspection Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{inspection.inspectorName}</p>
                        <p className="text-sm text-muted-foreground">
                          {inspection.completedAt 
                            ? `Completed on ${new Date(inspection.completedAt).toLocaleDateString()}`
                            : 'In progress'}
                        </p>
                      </div>
                      <Badge variant={inspection.overallResult === 'pass' ? 'success' : inspection.overallResult === 'fail' ? 'rejected' : 'pending'}>
                        {inspection.overallResult === 'pass' ? 'Passed' : inspection.overallResult === 'fail' ? 'Failed' : 'Pending'}
                      </Badge>
                    </div>

                    {inspection.readings.length > 0 && (
                      <div className="space-y-2">
                        {inspection.readings.map((reading, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <span className="text-sm">{reading.parameter}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{reading.value} {reading.unit}</span>
                              {reading.passed ? (
                                <CheckCircle className="h-4 w-4 text-success" />
                              ) : (
                                <Clock className="h-4 w-4 text-warning" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lifecycle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />
                  <ul className="space-y-4">
                    {timeline.map((event, index) => (
                      <li key={index} className="relative flex gap-3 pl-9">
                        <div className={cn(
                          "absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2",
                          event.status === 'completed' ? "border-success bg-success/10" :
                          event.status === 'current' ? "border-primary bg-primary/10" :
                          "border-border bg-muted"
                        )}>
                          {event.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : event.status === 'current' ? (
                            <Clock className="h-4 w-4 text-primary animate-pulse" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{event.event}</p>
                          {event.date && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certificate Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge 
                      variant={
                        certificateStatus === 'not_issued' ? 'secondary' :
                        certificateStatus === 'revoked' ? 'destructive' : 'default'
                      }
                    >
                      {certificateStatus === 'not_issued' ? 'Not Issued' :
                       certificateStatus === 'revoked' ? 'Revoked' : 'Active'}
                    </Badge>
                  </div>
                  
                  {hasCertificate && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowQRModal(true)}
                    >
                      <QrCode className="h-4 w-4 mr-1.5" />
                      Show QR
                    </Button>
                  )}
                </div>

                {certificate && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issued:</span>
                      <span>{new Date(certificate.issuedAt).toLocaleDateString()}</span>
                    </div>
                    {certificate.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expires:</span>
                        <span>{new Date(certificate.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {canUserIssueVC() && (
                    <Button 
                      onClick={handleIssueVC}
                      disabled={issueVC.isPending}
                      className="flex items-center gap-2"
                    >
                      {issueVC.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Award className="h-4 w-4" />
                      )}
                      Issue Certificate
                    </Button>
                  )}
                  
                  {certificate && (
                    <>
                      <Button 
                        variant="outline"
                        asChild
                      >
                        <Link to={`/certificates/${certificate.id}`}>
                          <FileText className="h-4 w-4 mr-1.5" />
                          View Details
                        </Link>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => window.open(`/verify?cert=${certificate.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Verify
                      </Button>
                    </>
                  )}
                  
                  {!hasCertificate && !canUserIssueVC() && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <AlertCircle className="h-4 w-4" />
                          {inspection?.overallResult !== 'pass' ? 
                            'Batch must pass inspection to issue certificate' :
                            'Certificate issuance requires QA inspector or admin role'
                          }
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {certificate && (
              <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Certificate QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center py-4">
                    <QRViewer
                      data={certificate.qrCodeData}
                      title=""
                      subtitle=""
                      size={250}
                      showActions={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

