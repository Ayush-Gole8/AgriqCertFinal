import { useMutation } from '@tanstack/react-query';
import { verifyVC } from '../api/vcApi';
import type { VerifyVCRequest, VerifyVCResult } from '../api/vcApi';
import { useToast } from './use-toast';

export function useVerify() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (request: VerifyVCRequest) => verifyVC(request),
    onSuccess: (data: VerifyVCResult) => {
      if (data.valid) {
        toast({
          title: "Verification Successful",
          description: "The certificate is valid and authentic.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.details || "The certificate is not valid.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Verification Error",
        description: error.response?.data?.message || "Failed to verify certificate",
        variant: "destructive",
      });
    },
  });
}

// Hook for batch verification without showing toasts
export function useVerifyQuiet() {
  return useMutation({
    mutationFn: (request: VerifyVCRequest) => verifyVC(request),
  });
}