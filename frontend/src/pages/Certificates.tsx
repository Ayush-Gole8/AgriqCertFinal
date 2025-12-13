import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Calendar, ExternalLink, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/AppShell';
import { useCertificates } from '@/hooks/useApi';
import { cn } from '@/lib/utils';

export default function Certificates() {
  const { data, isLoading } = useCertificates();
  const certificates = data?.data || [];

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
            <h1 className="text-2xl font-bold">Certificates</h1>
            <p className="text-muted-foreground">View and manage issued certificates</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/verify">
              <QrCode className="h-4 w-4 mr-2" />
              Verify Certificate
            </Link>
          </Button>
        </div>

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : certificates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="elevated" className="overflow-hidden">
                  <div className={cn(
                    "h-2",
                    cert.status === 'active' ? "bg-success" :
                    cert.status === 'revoked' ? "bg-destructive" :
                    "bg-warning"
                  )} />
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Award className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold">{cert.vc.credentialSubject.productName}</p>
                          <p className="text-sm text-muted-foreground font-mono">{cert.id}</p>
                        </div>
                      </div>
                      <Badge variant={cert.status === 'active' ? 'success' : cert.status === 'revoked' ? 'rejected' : 'warning'}>
                        {cert.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Batch ID</span>
                        <span className="font-mono">{cert.batchId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Issued</span>
                        <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>
                      </div>
                      {cert.expiresAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expires</span>
                          <span>{new Date(cert.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard</span>
                        <span>{cert.vc.credentialSubject.certificationStandard}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/certificates/${cert.id}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/verify?id=${cert.id}`}>
                          <QrCode className="h-4 w-4 mr-1" />
                          QR Code
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-1">No certificates yet</h3>
                <p className="text-sm text-muted-foreground">
                  Certificates will appear here once batches are certified.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AppShell>
  );
}
