import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, QrCode, FileText, Camera, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRScanner } from '@/components/QRScanner';
import { AppShell } from '@/components/layout/AppShell';
import { useVerify as useVerifyVC } from '@/hooks/useVerify';
import { useToast } from '@/hooks/use-toast';
import type { VerifyVCResult } from '@/types/api';

export default function Verify() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [certId, setCertId] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerifyVCResult | null>(null);
  const [activeTab, setActiveTab] = useState('search');
  
  const verifyVC = useVerifyVC();
  const { toast } = useToast();
  
  // Check for QR parameter on mount
  useEffect(() => {
    const qrParam = searchParams.get('qr');
    const certParam = searchParams.get('cert');
    
    if (qrParam) {
      setActiveTab('qr');
      handleVerifyQR(qrParam);
    } else if (certParam) {
      setCertId(certParam);
      handleSearchById(certParam);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (certId.trim()) {
      handleSearchById(certId.trim());
    }
  };

  const handleSearchById = async (id: string) => {
    try {
      setVerificationResult(null);
      
      // First try to get the certificate by ID
      const certResponse = await fetch(`/api/vc/certificates/${id}`);
      if (certResponse.ok) {
        const certData = await certResponse.json();
        const certificate = certData.data;
        
        // Verify the certificate's VC
        const result = await verifyVC.mutateAsync({
          vcJson: certificate.vc
        });
        
        setVerificationResult({
          ...result,
          certificateId: certificate.id,
        });
      } else {
        // Certificate not found
        setVerificationResult({
          valid: false,
          signatureValid: false,
          revoked: false,
          issuer: '',
          issuanceDate: '',
          credentialSubject: {},
          details: 'Certificate not found',
          locallyVerified: true,
          revocationChecked: true,
          errors: ['Certificate with this ID does not exist'],
        });
      }
    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationResult({
        valid: false,
        signatureValid: false,
        revoked: false,
        issuer: '',
        issuanceDate: '',
        credentialSubject: {},
        details: 'Verification failed',
        locallyVerified: true,
        revocationChecked: false,
        errors: ['Failed to verify certificate'],
      });
    }
  };

  const handleVerifyQR = async (qrData: string) => {
    try {
      setVerificationResult(null);
      
      const result = await verifyVC.mutateAsync({
        qrPayload: qrData
      });
      
      setVerificationResult(result);
    } catch (error) {
      console.error('QR verification failed:', error);
      setVerificationResult({
        valid: false,
        signatureValid: false,
        revoked: false,
        issuer: '',
        issuanceDate: '',
        credentialSubject: {},
        details: 'QR verification failed',
        locallyVerified: true,
        revocationChecked: false,
        errors: ['Failed to verify QR code'],
      });
    }
  };

  const handleQRScanSuccess = (result: string) => {
    setActiveTab('result');
    handleVerifyQR(result);
  };

  const handleDemoQR = async () => {
    // Simulate QR scan with demo data
    const demoQRData = JSON.stringify({
      type: 'AgriQCert',
      certId: 'CERT-2024-001',
      batchId: 'BATCH-2024-001',
      verifyUrl: 'https://agriqcert.com/verify/CERT-2024-001',
    });

    setActiveTab('result');
    handleVerifyQR(demoQRData);
  };

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold">Verify Certificate</h1>
          <p className="text-muted-foreground mt-2">
            Verify the authenticity of AgriQCert digital certificates
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search by ID
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Scanner
            </TabsTrigger>
            <TabsTrigger value="result" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Result
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search by Certificate ID
                </CardTitle>
                <CardDescription>
                  Enter the certificate ID to verify its authenticity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Enter certificate ID (e.g., CERT-2024-001)"
                      value={certId}
                      onChange={(e) => setCertId(e.target.value)}
                      className="text-center font-mono"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!certId.trim() || verifyVC.isPending}
                  >
                    {verifyVC.isPending ? 'Verifying...' : 'Verify Certificate'}
                  </Button>
                </form>

                {/* Quick Demo */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Try Demo Certificate</h4>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setCertId('CERT-2024-001');
                    }}
                    className="font-mono"
                  >
                    CERT-2024-001
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <QRScanner
              onScanSuccess={handleQRScanSuccess}
              onScanError={(error) => {
                toast({
                  title: 'Scan Failed',
                  description: error.message,
                  variant: 'destructive',
                });
              }}
            />
            
            {/* Demo QR button */}
            <Card>
              <CardContent className="p-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={handleDemoQR}
                  disabled={verifyVC.isPending}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {verifyVC.isPending ? 'Processing...' : 'Try Demo QR Code'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Simulates scanning a certificate QR code
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="result" className="space-y-4">
            {verificationResult ? (
              <VerificationResultCard result={verificationResult} />
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Results</h3>
                  <p className="text-muted-foreground">
                    Use the search or QR scanner to verify a certificate
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Show result immediately if we have one */}
        {verificationResult && activeTab !== 'result' && (
          <VerificationResultCard result={verificationResult} />
        )}
      </motion.div>
    </AppShell>
  );
}

interface VerificationResultCardProps {
  result: VerifyVCResult;
}

function VerificationResultCard({ result }: VerificationResultCardProps) {
  const getStatusIcon = () => {
    if (result.revoked) {
      return <X className="h-6 w-6 text-destructive" />;
    }
    if (result.valid && result.signatureValid) {
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    }
    return <AlertCircle className="h-6 w-6 text-destructive" />;
  };

  const getStatusText = () => {
    if (result.revoked) return 'Revoked';
    if (result.valid && result.signatureValid) return 'Valid & Authentic';
    return 'Invalid';
  };

  const getStatusColor = () => {
    if (result.revoked) return 'destructive';
    if (result.valid && result.signatureValid) return 'default';
    return 'destructive';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            {getStatusIcon()}
          </div>
          <h2 className="text-2xl font-bold mb-2">{getStatusText()}</h2>
          <Badge variant={getStatusColor()}>
            {result.details || 'Verification complete'}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Verification Details</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Signature:</span>
                <Badge variant={result.signatureValid ? 'default' : 'destructive'} size="sm">
                  {result.signatureValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revocation Check:</span>
                <Badge variant={result.revocationChecked ? 'default' : 'secondary'} size="sm">
                  {result.revocationChecked ? 'Checked' : 'Not Checked'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Verification Method:</span>
                <Badge variant="outline" size="sm">
                  {result.locallyVerified ? 'Local' : 'Provider'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Certificate Info</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Issuer:</span>
                <p className="font-mono text-xs">{result.issuer}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Issued:</span>
                <p>{new Date(result.issuanceDate).toLocaleDateString()}</p>
              </div>
              {result.expirationDate && (
                <div>
                  <span className="text-muted-foreground">Expires:</span>
                  <p>{new Date(result.expirationDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {result.credentialSubject && Object.keys(result.credentialSubject).length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Product Information</h3>
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(result.credentialSubject, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {result.errors && result.errors.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-destructive">Errors</h3>
            <ul className="space-y-1">
              {result.errors.map((error, index) => (
                <li key={index} className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
