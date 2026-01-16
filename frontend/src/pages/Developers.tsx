import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Developers() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Developer Docs</h1>
          <p className="text-muted-foreground text-sm">
            Integrate AgriQCert into your own systems using REST and VC APIs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">REST API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Use the REST endpoints to manage batches, inspections and certificates.
              </p>
              <div className="space-y-1 font-mono text-xs bg-muted/40 p-3 rounded-lg">
                <p>GET /api/batches</p>
                <p>GET /api/certificates</p>
                <p>POST /api/inspections</p>
              </div>
              <Badge variant="outline">
                JSON over HTTPS
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verifiable Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Credentials follow W3C VC Data Model for export-quality guarantees.
              </p>
              <div className="space-y-1 font-mono text-xs bg-muted/40 p-3 rounded-lg">
                <p>Issue VC for approved batches</p>
                <p>Verify VC using QR or credential ID</p>
                <p>Revoke VC when quality is compromised</p>
              </div>
              <Badge variant="outline">
                W3C VC compatible
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

