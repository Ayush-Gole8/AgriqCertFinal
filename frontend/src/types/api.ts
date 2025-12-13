// Re-export all types for easy importing
export * from './index';

// Additional API-specific types
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface QueryConfig {
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
}

// Hook return types for better IDE support
export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface MutationResult<T, V> {
  mutate: (variables: V) => void;
  mutateAsync: (variables: V) => Promise<T>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: T | undefined;
}

// API endpoint types for better organization
export interface BatchAPI {
  list: (filters?: { status?: string; farmerId?: string; page?: number; limit?: number }) => Promise<unknown>;
  get: (id: string) => Promise<unknown>;
  create: (data: unknown) => Promise<unknown>;
  update: (id: string, data: unknown) => Promise<unknown>;
  submit: (id: string) => Promise<unknown>;
  delete: (id: string) => Promise<void>;
  stats: () => Promise<unknown>;
}

export interface InspectionAPI {
  list: (filters?: { batchId?: string; status?: string; page?: number; limit?: number }) => Promise<unknown>;
  get: (id: string) => Promise<unknown>;
  create: (batchId: string, data: unknown) => Promise<unknown>;
  update: (id: string, data: unknown) => Promise<unknown>;
  complete: (id: string, data: unknown) => Promise<unknown>;
  getByBatch: (batchId: string) => Promise<unknown>;
}