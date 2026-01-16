import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function Settings() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground text-sm">
              Configure platform-level preferences and integrations.
            </p>
          </div>
          <Button variant="outline">
            Save Changes
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email alerts</p>
                  <p className="text-muted-foreground text-xs">
                    Send batch, inspection and certificate updates via email.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">In-app notifications</p>
                  <p className="text-muted-foreground text-xs">
                    Use the notification bell for system messages.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verifiable Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">VC provider</p>
                  <p className="text-muted-foreground text-xs">
                    Control issuance through the configured MOSIP environment.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs">
                  Sandbox
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-revoke on expiry</p>
                  <p className="text-muted-foreground text-xs">
                    Mark certificates as revoked when their VC expires.
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

