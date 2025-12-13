import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { issueVC, getJobStatus } from '../api/vcApi';
import type { IssueVCRequest, IssueVCResponse, JobStatus } from '../api/vcApi';
import { useToast } from './use-toast';
import { useState, useEffect } from 'react';

export function useIssueVC() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: issueVC,
    onSuccess: (data: IssueVCResponse) => {
      toast({
        title: "Certificate Issuance Queued",
        description: `Your certificate issuance has been queued. Job ID: ${data.jobId}`,
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Issuance Failed",
        description: err.response?.data?.message || "Failed to queue certificate issuance",
        variant: "destructive",
      });
    },
  });
}

export function useIssueStatus(jobId: string, enabled: boolean = true) {
  const [pollingEnabled, setPollingEnabled] = useState(enabled);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: ['issueStatus', jobId],
    queryFn: () => getJobStatus(jobId),
    enabled: pollingEnabled && !!jobId,
    refetchInterval: (data?: JobStatus | null) => {
      // Stop polling if job is completed or failed
      if (data?.status === 'success' || data?.status === 'failed') {
        setPollingEnabled(false);
        return false;
      }
      return 3000; // Poll every 3 seconds
    },
    refetchOnWindowFocus: false,
  });

  // Handle job completion
  useEffect(() => {
    if (result.data?.status === 'success') {
      toast({
        title: "Certificate Issued!",
        description: "Your certificate has been successfully issued.",
      });
      
      // Invalidate certificates to show the new one
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    } else if (result.data?.status === 'failed') {
      const errorMessage = result.data.lastError || "Certificate issuance failed";
      toast({
        title: "Certificate Issuance Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [result.data?.status, result.data?.lastError, toast, queryClient]);

  return {
    ...result,
    isPolling: pollingEnabled && (result.data?.status === 'pending' || result.data?.status === 'processing'),
  };
}