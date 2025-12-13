import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { BatchStatus, InspectionStatus, CertificateStatus } from '@/types';

type Status = BatchStatus | InspectionStatus | CertificateStatus;

const statusConfig: Record<Status, { label: string; variant: 'draft' | 'pending' | 'approved' | 'rejected' | 'certified' | 'warning' | 'success' | 'info' }> = {
  draft: { label: 'Draft', variant: 'draft' },
  submitted: { label: 'Submitted', variant: 'pending' },
  inspecting: { label: 'Inspecting', variant: 'info' },
  approved: { label: 'Approved', variant: 'approved' },
  rejected: { label: 'Rejected', variant: 'rejected' },
  certified: { label: 'Certified', variant: 'certified' },
  pending: { label: 'Pending', variant: 'pending' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'rejected' },
  active: { label: 'Active', variant: 'success' },
  revoked: { label: 'Revoked', variant: 'rejected' },
  expired: { label: 'Expired', variant: 'warning' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'draft' as const };
  
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
