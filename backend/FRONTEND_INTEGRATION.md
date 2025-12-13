# Frontend-Backend Integration Guide

Complete guide to connect your AgriQCert frontend with the new backend.

## 🔌 Quick Connection

### 1. Update Frontend API Client

Replace the mocked API in `frontend/src/api/apiClient.ts`:

```typescript
import axios from 'axios';

// Create axios instance pointing to backend
export const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('http://localhost:5000/api/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### 2. Update Auth Context

In `frontend/src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await apiClient.get('/auth/profile');
          setUser(response.data.data.user);
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { user, tokens } = response.data.data;
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setUser(user);
  };

  const register = async (data: RegisterData) => {
    const response = await apiClient.post('/auth/register', data);
    const { user, tokens } = response.data.data;
    
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    setUser(user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 3. Update API Hooks

Create `frontend/src/hooks/useApi.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/apiClient';
import type { Batch, Inspection, Certificate } from '@/types';

// Batches
export function useBatches(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ['batches', params],
    queryFn: async () => {
      const response = await apiClient.get('/batches', { params });
      return response.data.data;
    },
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: ['batch', id],
    queryFn: async () => {
      const response = await apiClient.get(`/batches/${id}`);
      return response.data.data.batch;
    },
    enabled: !!id,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Batch>) => {
      const response = await apiClient.post('/batches', data);
      return response.data.data.batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useUpdateBatch(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Batch>) => {
      const response = await apiClient.put(`/batches/${id}`, data);
      return response.data.data.batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
  });
}

export function useSubmitBatch(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/batches/${id}/submit`);
      return response.data.data.batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
  });
}

// Add more hooks for inspections, certificates, etc.
```

## 🚀 Getting Started

### Step 1: Start Backend
```powershell
cd E:\Agriqcert\backend
npm run dev
```

Backend will run at: `http://localhost:5000`

### Step 2: Start Frontend
```powershell
cd E:\Agriqcert\frontend
npm run dev
```

Frontend will run at: `http://localhost:5173`

### Step 3: Test Connection

Open browser console and test:

```javascript
// Test health endpoint
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(console.log);

// Should log:
// { success: true, message: "AgriQCert API is running", timestamp: "..." }
```

## 🔐 Authentication Flow

### Registration
```typescript
// In your Register component
const handleRegister = async (formData) => {
  try {
    await register({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: formData.role,
      organization: formData.organization,
    });
    
    // User is now logged in, redirect to dashboard
    navigate('/dashboard');
  } catch (error) {
    // Handle error
    console.error('Registration failed:', error);
  }
};
```

### Login
```typescript
// In your Login component
const handleLogin = async (formData) => {
  try {
    await login(formData.email, formData.password);
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### Logout
```typescript
// In your NavBar or UserMenu
const handleLogout = async () => {
  await logout();
  navigate('/');
};
```

## 📊 Data Fetching Examples

### Batch List Page
```typescript
import { useBatches } from '@/hooks/useApi';

function BatchList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useBatches({ page, limit: 10 });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data.data.map(batch => (
        <BatchCard key={batch.id} batch={batch} />
      ))}
      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### Create Batch Form
```typescript
import { useCreateBatch } from '@/hooks/useApi';

function NewBatchForm() {
  const { mutate: createBatch, isLoading } = useCreateBatch();

  const handleSubmit = (data) => {
    createBatch(data, {
      onSuccess: (batch) => {
        toast.success('Batch created successfully!');
        navigate(`/batches/${batch.id}`);
      },
      onError: (error) => {
        toast.error('Failed to create batch');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## 🔄 Type Alignment

Your frontend types are already well-structured! Just ensure:

1. **Date Fields**: Backend returns ISO strings, parse them:
```typescript
const batch = {
  ...response.data,
  harvestDate: new Date(response.data.harvestDate),
  createdAt: new Date(response.data.createdAt),
};
```

2. **ID Fields**: Backend uses `_id` but transforms to `id` in responses (already handled)

3. **Status Enums**: Already matching between frontend and backend ✅

## 🐛 Common Issues & Solutions

### CORS Error
```
Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:5173' has been blocked by CORS
```

**Solution:** Already configured in backend! Ensure frontend is running on port 5173.

### 401 Unauthorized
**Cause:** Token expired or missing

**Solution:** Interceptor will auto-refresh token. If refresh fails, user is redirected to login.

### 404 Not Found
**Cause:** Wrong endpoint or ID

**Solution:** Check backend logs and ensure endpoint exists in routes.

## 📱 Mobile/Offline Support (Future)

For offline-first functionality:

1. **Service Worker**: Cache API responses
2. **IndexedDB**: Store drafts locally
3. **Sync**: Background sync when online
4. **Conflict Resolution**: Merge strategies for concurrent edits

## 🧪 Testing Integration

### Test Login Flow
```powershell
# Register test user
$body = @{
    email = "test@example.com"
    password = "Test@123"
    name = "Test User"
    role = "farmer"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

Then login via frontend at `http://localhost:5173/login`

### Test Batch Creation
1. Login to frontend
2. Navigate to "New Batch"
3. Fill form and submit
4. Check MongoDB Compass to verify data

## 📚 Next Steps

1. ✅ Update `apiClient.ts` with real endpoints
2. ✅ Update `AuthContext.tsx` with backend integration
3. ✅ Create custom hooks in `useApi.ts`
4. ✅ Test authentication flow
5. ✅ Test batch CRUD operations
6. ⏳ Add error handling & loading states
7. ⏳ Implement file upload for attachments
8. ⏳ Add QR code scanning for verification
9. ⏳ Implement notifications

## 🔧 Environment Variables

Add to `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_API_TIMEOUT=10000
```

Update apiClient:
```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
});
```

## 🎉 Success Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Token stored in localStorage
- [ ] Can create batch
- [ ] Can view batches list
- [ ] Can view batch details
- [ ] Auto-refresh on token expiry
- [ ] Logout clears tokens

---

**You're all set! Start building your frontend against the real backend. 🚀**

For questions, check:
- Backend logs: Console output from `npm run dev`
- Network tab: Browser DevTools → Network
- MongoDB: Use Compass to view data
- API Testing: Use [API_TESTING.md](./API_TESTING.md)
