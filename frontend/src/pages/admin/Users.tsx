import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { User } from '@/types';

const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Asha Farmer',
    email: 'asha@example.com',
    role: 'farmer',
    createdAt: new Date().toISOString(),
    isActive: true,
    isVerified: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'u2',
    name: 'Ravi QA',
    email: 'ravi.qa@example.com',
    role: 'qa_inspector',
    createdAt: new Date().toISOString(),
    isActive: true,
    isVerified: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'u3',
    name: 'Meera Certifier',
    email: 'meera@example.com',
    role: 'certifier',
    createdAt: new Date().toISOString(),
    isActive: true,
    isVerified: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'u4',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
    isActive: true,
    isVerified: true,
    updatedAt: new Date().toISOString(),
  },
];

export default function Users() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground text-sm">
              Manage platform users and their roles.
            </p>
          </div>
          <Button variant="gradient">
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 px-4 py-3"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {user.role.replace('_', ' ')}
                  </Badge>
                  <Badge variant={user.isActive ? 'success' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

