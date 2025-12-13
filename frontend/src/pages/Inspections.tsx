import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Calendar, User, MapPin, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useInspections, useBatches } from '@/hooks/useApi';

export default function Inspections() {
  const { user } = useAuth();
  const { data: inspectionsData, isLoading } = useInspections();
  const { data: batchesData } = useBatches();
  
  const inspections = inspectionsData?.data || [];
  const batches = batchesData?.data || [];
  
  // Get batches pending inspection for inspectors
  const pendingBatches = batches.filter(b => b.status === 'submitted' || b.status === 'inspecting');

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
            <h1 className="text-2xl font-bold">Inspections</h1>
            <p className="text-muted-foreground">
              {user?.role === 'qa_inspector' 
                ? 'Manage your quality inspections' 
                : 'View all inspection records'}
            </p>
          </div>
        </div>

        {/* Pending Batches for Inspection */}
        {user?.role === 'qa_inspector' && pendingBatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batches Awaiting Inspection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingBatches.map((batch, idx) => (
                  <Link
                    key={batch.id ?? batch._id ?? idx}
                    to={`/inspect/${batch.id ?? batch._id}`}
                    className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning font-medium">
                        {(batch.productName || 'U').charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{batch.productName || 'Unnamed Product'}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono">{batch.id ?? batch._id ?? 'No ID'}</span>
                          <span>•</span>
                          <span>{batch.farmerName || 'Unknown Farmer'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={batch.status} />
                      <Button variant="outline" size="sm">
                        Start Inspection
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inspections List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : inspections.length > 0 ? (
          <div className="space-y-4">
            {inspections.map((inspection, index) => {
              const batch = batches.find(b => b.id === inspection.batchId);
              
              return (
                <motion.div
                  key={inspection.id ?? inspection._id ?? index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:bg-accent/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <ClipboardCheck className="h-6 w-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold">{batch?.productName || 'Unknown Batch'}</h3>
                            <Badge variant={
                              inspection.overallResult === 'pass' ? 'success' : 
                              inspection.overallResult === 'fail' ? 'rejected' : 
                              'pending'
                            }>
                              {inspection.overallResult === 'pass' ? 'Passed' : 
                               inspection.overallResult === 'fail' ? 'Failed' : 
                               'Pending'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="font-mono">{inspection.id ?? inspection._id}</span>
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {inspection.inspectorName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {inspection.completedAt 
                                ? new Date(inspection.completedAt).toLocaleDateString()
                                : 'In Progress'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {inspection.readings.filter(r => r.passed).length}/{inspection.readings.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Tests Passed</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-1">No inspections yet</h3>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'qa_inspector' 
                    ? 'Inspections will appear here when batches are assigned to you.'
                    : 'Inspection records will appear here.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AppShell>
  );
}
