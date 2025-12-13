import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import type { 
  Batch, 
  Inspection, 
  Certificate, 
  BatchDraft, 
  CreateBatchPayload, 
  UpdateBatchPayload,
  CreateInspectionPayload 
} from '@/types';

// Query Keys
export const queryKeys = {
  batches: ['batches'] as const,
  batch: (id: string) => ['batch', id] as const,
  inspections: ['inspections'] as const,
  inspection: (id: string) => ['inspection', id] as const,
  certificates: ['certificates'] as const,
  certificate: (id: string) => ['certificate', id] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  drafts: ['drafts'] as const,
  verification: (id: string) => ['verification', id] as const,
  // VC-related query keys
  vcJobs: ['vcJobs'] as const,
  vcJob: (id: string) => ['vcJob', id] as const,
  vcStats: ['vcStats'] as const,
  issueStatus: (jobId: string) => ['issueStatus', jobId] as const,
};

// Batch Hooks
export function useBatches(filters?: { status?: string; farmerId?: string }) {
  return useQuery({
    queryKey: [...queryKeys.batches, filters],
    queryFn: () => api.batches.list(filters),
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: queryKeys.batch(id),
    queryFn: () => api.batches.get(id),
    enabled: !!id && id !== 'undefined' && id !== 'null',
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBatchPayload) => api.batches.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
}

export function useSubmitBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.batches.submit(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
      queryClient.invalidateQueries({ queryKey: queryKeys.batch(id) });
    },
  });
}

// Draft Hooks
export function useDrafts() {
  return useQuery({
    queryKey: queryKeys.drafts,
    queryFn: () => api.drafts.list(),
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (draft: BatchDraft) => api.drafts.save(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.drafts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
    },
  });
}

// Inspection Hooks
export function useInspections(filters?: { batchId?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.inspections, filters],
    queryFn: () => api.inspections.list(filters),
  });
}

export function useInspection(id: string) {
  return useQuery({
    queryKey: queryKeys.inspection(id),
    queryFn: () => api.inspections.get(id),
    enabled: !!id && id !== 'undefined' && id !== 'null',
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: CreateInspectionPayload }) => 
      api.inspections.create(batchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<Inspection, 'readings' | 'notes' | 'photos' | 'geolocation'>> }) => 
      api.inspections.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections });
      queryClient.invalidateQueries({ queryKey: queryKeys.inspection(id) });
    },
  });
}

export function useCompleteInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { passed: boolean; comments?: string; readings?: unknown[] } }) => 
      api.inspections.complete(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inspections });
      queryClient.invalidateQueries({ queryKey: queryKeys.inspection(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
}

// Certificate Hooks
export function useCertificates() {
  return useQuery({
    queryKey: queryKeys.certificates,
    queryFn: () => api.certificates.list(),
  });
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: queryKeys.certificate(id),
    queryFn: () => api.certificates.get(id),
    enabled: !!id && id !== 'undefined' && id !== 'null',
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (batchId: string) => api.certificates.issue(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
}

export function useRevokeCertificate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      api.certificates.revoke(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates });
      queryClient.invalidateQueries({ queryKey: queryKeys.certificate(id) });
    },
  });
}

// Verification Hooks
export function useVerification(certId: string) {
  return useQuery({
    queryKey: queryKeys.verification(certId),
    queryFn: () => api.verify.byId(certId),
    enabled: !!certId && certId !== 'undefined' && certId !== 'null',
  });
}

export function useVerifyQR() {
  return useMutation({
    mutationFn: (qrData: string) => api.verify.byQR(qrData),
  });
}

// Notification Hooks
export function useNotifications(userId: string) {
  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: () => api.notifications.list(userId),
    enabled: !!userId && userId !== 'undefined' && userId !== 'null',
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Upload Hooks
export function useFileUpload() {
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
      api.uploads.upload(file, onProgress),
  });
}
