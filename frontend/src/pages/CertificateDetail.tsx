import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  Calendar,
  User,
  Package,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  FileText,
  QrCode,
  Download,
  Share2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { QRViewer } from '@/components/QRViewer';
import { useCertificate } from '@/hooks/useVCS';
import { useRevokeVC } from '@/hooks/useVCS';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const revocationReasons = [
  { value: 'compromised_key', label: 'Compromised Key' },
  { value: 'cessation_of_operation', label: 'Cessation of Operation' },
  { value: 'affiliation_changed', label: 'Affiliation Changed' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'expired_inspection', label: 'Expired Inspection' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
];

export default function CertificateDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState<string>('');
  
  const { data: certificate, isLoading, error } = useCertificate(id || '');
  const revokeVC = useRevokeVC();

  const handleRevoke = async () => {
    if (!certificate || !revokeReason) return;
    
    try {
      await revokeVC.mutateAsync({
        certificateId: certificate.id,
        request: { reason: revokeReason as 'fraud' | 'quality_issue' | 'administrative' | 'other' },
      });
      setShowRevokeModal(false);
      setRevokeReason('');
    } catch (error) {
      console.error('Failed to revoke certificate:', error);
    }
  };

  const canRevoke = () => {
    if (!user || !certificate) return false;
    
    // Only admin and certifier can revoke
    if (!['admin', 'certifier'].includes(user.role)) return false;
    
    // Cannot revoke already revoked certificates
    if (certificate.revoked || certificate.status === 'revoked') return false;
    
    return true;
  };

  const downloadCertificate = () => {
    if (!certificate) return;
    
    const certData = {
      id: certificate.id,
      vc: certificate.vc,
      issued: certificate.issuedAt,
      expires: certificate.expiresAt,
      batch: certificate.batchId,
    };
    
    const dataStr = JSON.stringify(certData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificate-${certificate.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  if (error || !certificate) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Certificate Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The certificate you're looking for doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/batches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Batches
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/batches/${certificate.batchId.id || certificate.batchId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Certificate Details</h1>
                <Badge 
                  variant={
                    certificate.revoked ? 'destructive' : 
                    certificate.status === 'expired' ? 'secondary' : 'default'
                  }
                >
                  {certificate.revoked ? 'Revoked' : certificate.status}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono">#{certificate.id}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowQRModal(true)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            
            <Button 
              variant="outline"
              onClick={downloadCertificate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            {canRevoke() && (
              <Button 
                variant="destructive"
                onClick={() => setShowRevokeModal(true)}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Revoke
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Certificate Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Issued:</span>
                  <p className="font-medium">{new Date(certificate.issuedAt).toLocaleString()}</p>
                </div>
                {certificate.expiresAt && (
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <p className="font-medium">{new Date(certificate.expiresAt).toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Issuer:</span>
                  <p className="font-medium">{certificate.issuedBy?.name || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">{certificate.status}</p>
                </div>
              </div>
              
              {certificate.revoked && certificate.revokedAt && (
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-destructive mb-1">Revoked</h4>
                  <p className="text-xs text-muted-foreground">
                    Revoked on {new Date(certificate.revokedAt).toLocaleString()}
                  </p>
                  {certificate.revocationReason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason: {certificate.revocationReason}
                    </p>
                  )}
                </div>
              )}
              
              {certificate.vcUrl && (
                <div>
                  <span className="text-muted-foreground text-sm">Provider URL:</span>
                  <a 
                    href={certificate.vcUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline block break-all"
                  >
                    {certificate.vcUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Information */}
          {certificate.batchId && typeof certificate.batchId === 'object' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Batch Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">{certificate.batchId.productName}</h4>
                  <p className="text-sm text-muted-foreground">{certificate.batchId.productType}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <p className="font-medium">
                      {certificate.batchId.quantity} {certificate.batchId.unit}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Farmer:</span>
                    <p className="font-medium">{certificate.batchId.farmerName}</p>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/batches/${certificate.batchId.id || certificate.batchId}`}>
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    View Batch Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Verifiable Credential Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verifiable Credential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(certificate.vc, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Modal */}
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

        {/* Revoke Modal */}
        <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Revoke Certificate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to revoke this certificate? This action cannot be undone.
              </p>
              
              <div>
                <label className="text-sm font-medium">Reason for revocation:</label>
                <Select value={revokeReason} onValueChange={setRevokeReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {revocationReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowRevokeModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRevoke}
                disabled={!revokeReason || revokeVC.isPending}
              >
                {revokeVC.isPending ? 'Revoking...' : 'Revoke Certificate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppShell>
  );
}
