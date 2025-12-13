import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  ClipboardCheck,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useBatches, useInspections, useCertificates, useNotifications } from '@/hooks/useApi';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: batchesData } = useBatches({ farmerId: user?.role === 'farmer' ? user.id : undefined });
  const { data: inspectionsData } = useInspections({});
  const { data: certificatesData } = useCertificates();
  const { data: notificationsData } = useNotifications(user?.id || '');

  const batches = batchesData?.data || [];
  const inspections = inspectionsData?.data || [];
  const certificates = certificatesData?.data || [];
  const notifications = notificationsData?.data || [];

  const stats = {
    farmer: [
      { label: 'Total Batches', value: batches.length, icon: Package, color: 'text-primary' },
      { label: 'Certified', value: batches.filter(b => b.status === 'certified').length, icon: Award, color: 'text-success' },
      { label: 'Pending', value: batches.filter(b => ['submitted', 'inspecting'].includes(b.status)).length, icon: Clock, color: 'text-warning' },
      { label: 'Drafts', value: batches.filter(b => b.status === 'draft').length, icon: AlertCircle, color: 'text-muted-foreground' },
    ],
    qa_inspector: [
      { label: 'Assigned', value: inspections.filter(i => i.status === 'pending').length, icon: ClipboardCheck, color: 'text-primary' },
      { label: 'In Progress', value: inspections.filter(i => i.status === 'in_progress').length, icon: Clock, color: 'text-warning' },
      { label: 'Completed', value: inspections.filter(i => i.status === 'completed').length, icon: CheckCircle, color: 'text-success' },
      { label: 'This Month', value: inspections.length, icon: TrendingUp, color: 'text-info' },
    ],
    certifier: [
      { label: 'Pending Review', value: batches.filter(b => b.status === 'approved').length, icon: Clock, color: 'text-warning' },
      { label: 'Issued', value: certificates.length, icon: Award, color: 'text-success' },
      { label: 'Active', value: certificates.filter(c => c.status === 'active').length, icon: CheckCircle, color: 'text-primary' },
      { label: 'Revoked', value: certificates.filter(c => c.status === 'revoked').length, icon: AlertCircle, color: 'text-destructive' },
    ],
    admin: [
      { label: 'Total Batches', value: batches.length, icon: Package, color: 'text-primary' },
      { label: 'Total Inspections', value: inspections.length, icon: ClipboardCheck, color: 'text-info' },
      { label: 'Certificates', value: certificates.length, icon: Award, color: 'text-success' },
      { label: 'Active Users', value: 127, icon: TrendingUp, color: 'text-warning' },
    ],
    verifier: [
      { label: 'Verifications Today', value: 24, icon: CheckCircle, color: 'text-success' },
      { label: 'Valid Certs', value: certificates.filter(c => c.status === 'active').length, icon: Award, color: 'text-primary' },
      { label: 'Invalid', value: 3, icon: AlertCircle, color: 'text-destructive' },
      { label: 'Total Scans', value: 1247, icon: TrendingUp, color: 'text-info' },
    ],
  };

  const roleStats = stats[user?.role || 'farmer'];

  return (
    <AppShell>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="text-muted-foreground">
              Here's what's happening with your {user?.role === 'farmer' ? 'batches' : 'work'} today.
            </p>
          </div>
          {user?.role === 'farmer' && (
            <Button variant="gradient" asChild>
              <Link to="/batches/new">
                <Plus className="h-4 w-4" />
                New Batch
              </Link>
            </Button>
          )}
          {user?.role === 'verifier' && (
            <Button variant="gradient" asChild>
              <Link to="/verify">
                <Eye className="h-4 w-4" />
                Verify Certificate
              </Link>
            </Button>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roleStats.map((stat) => (
            <Card key={stat.label} variant="elevated" className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl bg-muted", stat.color)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity / Batches */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {user?.role === 'farmer' ? 'Recent Batches' : 
                     user?.role === 'qa_inspector' ? 'Pending Inspections' : 
                     'Recent Activity'}
                  </CardTitle>
                  <CardDescription>
                    {user?.role === 'farmer' ? 'Your latest batch submissions' : 
                     'Items requiring your attention'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/batches">
                    View all <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {batches.slice(0, 5).map((batch, index) => (
                    <Link
                      key={batch.id ?? batch._id ?? index}
                      to={`/batches/${batch.id ?? batch._id}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-medium">
                          {(batch.productName || 'U').charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{batch.productName || 'Unnamed Product'}</p>
                          <p className="text-sm text-muted-foreground">
                            {batch.id ?? batch._id ?? 'No ID'} • {batch.quantity || 0} {batch.unit || 'units'}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={batch.status} />
                    </Link>
                  ))}
                  {batches.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No batches yet</p>
                      {user?.role === 'farmer' && (
                        <Button variant="outline" size="sm" className="mt-3" asChild>
                          <Link to="/batches/new">Create your first batch</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Stay updated on your activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((notification, idx) => (
                    <div
                      key={notification.id ?? notification._id ?? idx}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        notification.read ? "bg-background" : "bg-primary/5 border-primary/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          notification.type === 'certificate_issued' ? "bg-success/10 text-success" :
                          notification.type === 'action_required' ? "bg-warning/10 text-warning" :
                          "bg-primary/10 text-primary"
                        )}>
                          {notification.type === 'certificate_issued' ? <Award className="h-4 w-4" /> :
                           notification.type === 'action_required' ? <AlertCircle className="h-4 w-4" /> :
                           <CheckCircle className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        {user?.role === 'farmer' && (
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                    <Link to="/batches/new">
                      <Plus className="h-5 w-5 text-primary" />
                      <span>New Batch</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                    <Link to="/batches">
                      <Package className="h-5 w-5 text-primary" />
                      <span>View Batches</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                    <Link to="/certificates">
                      <Award className="h-5 w-5 text-primary" />
                      <span>Certificates</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                    <Link to="/verify">
                      <Eye className="h-5 w-5 text-primary" />
                      <span>Verify Cert</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
