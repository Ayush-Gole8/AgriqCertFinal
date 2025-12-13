import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  User, 
  Package,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { VerificationResult as VerificationResultType } from '@/types';
import { cn } from '@/lib/utils';

interface VerificationResultProps {
  result: VerificationResultType;
  className?: string;
}

export function VerificationResult({ result, className }: VerificationResultProps) {
  const { isValid, certificate, batch, inspection, errors, timeline, verifiedAt } = result;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant={isValid ? 'glow' : 'default'} className={cn(
          isValid ? 'border-success/30' : 'border-destructive/30'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full",
                isValid ? "bg-success/10" : "bg-destructive/10"
              )}>
                {isValid ? (
                  <CheckCircle className="h-8 w-8 text-success" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {isValid ? 'Certificate Verified' : 'Verification Failed'}
                </h2>
                <p className="text-muted-foreground">
                  Verified at {new Date(verifiedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {errors && errors.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">Verification Errors</span>
                </div>
                <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Certificate & Product Details */}
      {certificate && batch && (
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Certificate Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Certificate ID</span>
                  <span className="text-sm font-mono">{certificate.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={certificate.status === 'active' ? 'success' : 'rejected'}>
                    {certificate.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Issued</span>
                  <span className="text-sm">{new Date(certificate.issuedAt).toLocaleDateString()}</span>
                </div>
                {certificate.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expires</span>
                    <span className="text-sm">{new Date(certificate.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Product</span>
                  <span className="text-sm font-medium">{batch.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm capitalize">{batch.productType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-sm">{batch.quantity} {batch.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Farmer</span>
                  <span className="text-sm">{batch.farmerName}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Timeline */}
      {timeline && timeline.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Certification Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-border" />
                
                <ul className="space-y-4">
                  {timeline.map((event, index) => (
                    <li key={index} className="relative flex gap-4 pl-10">
                      <div className={cn(
                        "absolute left-0 flex h-9 w-9 items-center justify-center rounded-full border-2",
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
                      <div className="flex-1 pt-1">
                        <p className="font-medium text-sm">{event.event}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                          )}
                          {event.actor && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">{event.actor}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Inspection Results */}
      {inspection && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Quality Inspection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {inspection.readings.map((reading, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">{reading.parameter}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">
                        {reading.value} {reading.unit}
                      </span>
                      {reading.passed ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
