import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCertificate, getCertificateByBatch, revokeVC, getVCStats } from '../api/vcApi';
import type { Certificate, RevokeVCRequest, VCStats } from '../api/vcApi';
import { useToast } from './use-toast';
import type { AxiosError } from 'axios';

export function useCertificate(certificateId: string, enabled: boolean = true) {
  return useQuery<Certificate>({
    queryKey: ['certificate', certificateId],
    queryFn: () => getCertificate(certificateId),
    enabled: enabled && !!certificateId,
  });
}

export function useCertificateByBatch(batchId: string, enabled: boolean = true) {
  return useQuery<Certificate | null>({
    queryKey: ['certificate', 'batch', batchId],
    queryFn: () => getCertificateByBatch(batchId),
    enabled: enabled && !!batchId && batchId !== 'undefined',
    retry: (failureCount, error: unknown) => {
      // Don't retry if certificate doesn't exist (404)
      if ((error as AxiosError)?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useRevokeVC() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ certificateId, request }: { certificateId: string; request: RevokeVCRequest }) =>
      revokeVC(certificateId, request),
    onSuccess: (data, variables) => {
      toast({
        title: "Certificate Revoked",
        description: `Certificate has been successfully revoked. Reason: ${data.reason}`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['certificate', variables.certificateId] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['vcStats'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Revocation Failed",
        description: err.response?.data?.message || "Failed to revoke certificate",
        variant: "destructive",
      });
    },
  });
}

export function useVCStats(enabled: boolean = true) {
  return useQuery<VCStats>({
    queryKey: ['vcStats'],
    queryFn: getVCStats,
    enabled,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook to check if a batch has a certificate
export function useBatchCertificateStatus(batchId: string) {
  const { data: certificate, isLoading, error } = useCertificateByBatch(batchId);
  
  return {
    hasCertificate: !!certificate && !error,
    certificate,
    isLoading,
    status: certificate ? (certificate.revoked ? 'revoked' : certificate.status) : 'not_issued',
    canIssue: !certificate && !isLoading,
  };
}