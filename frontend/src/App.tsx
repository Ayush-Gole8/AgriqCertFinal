import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { UserRole } from "@/types";

import Login from "./pages/Login";
import Index from "./pages/Index";
import Dashboard from "./pages/admin/Dashboard";
import Profile from "./pages/admin/Profile";
import Users from "./pages/admin/Users";
import Settings from "./pages/admin/Settings";
import BatchList from "./pages/farmer/BatchList";
import BatchNew from "./pages/farmer/BatchNew";
import BatchDetail from "./pages/farmer/BatchDetail";
import Inspections from "./pages/qa/Inspections";
import InspectionDetail from "./pages/qa/InspectionDetail";
import Certificates from "./pages/certifier/Certificates";
import CertificateDetail from "./pages/certifier/CertificateDetail";
import Verify from "./pages/verifier/Verify";
import Developers from "./pages/Developers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  }

  return <>{children}</>;
}

function RoleRoute({ children, allowed }: { children: React.ReactNode; allowed: UserRole[] }) {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/login/:role" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Index />} />
      {/* Generic routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/batches" element={<ProtectedRoute><BatchList /></ProtectedRoute>} />
      <Route path="/batches/new" element={<ProtectedRoute><BatchNew /></ProtectedRoute>} />
      <Route path="/batches/:id" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
      <Route path="/inspections" element={<ProtectedRoute><Inspections /></ProtectedRoute>} />
      <Route path="/inspect/:id" element={<ProtectedRoute><InspectionDetail /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
      <Route path="/certificates/:id" element={<ProtectedRoute><CertificateDetail /></ProtectedRoute>} />
      <Route path="/verify" element={<ProtectedRoute><Verify /></ProtectedRoute>} />
      <Route path="/developers" element={<ProtectedRoute><Developers /></ProtectedRoute>} />

      {/* Farmer routes */}
      <Route
        path="/farmer/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["farmer"]}>
              <Dashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/batches"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["farmer"]}>
              <BatchList />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/certificates"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["farmer"]}>
              <Certificates />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/batches/new"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["farmer"]}>
              <BatchNew />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmer/batches/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["farmer", "qa_inspector", "certifier", "admin"]}>
              <BatchDetail />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* QA inspector routes */}
      <Route
        path="/qa/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["qa_inspector"]}>
              <Dashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/qa/inspections"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["qa_inspector"]}>
              <Inspections />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/qa/inspections/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["qa_inspector"]}>
              <InspectionDetail />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Certifier routes */}
      <Route
        path="/certifier/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["certifier"]}>
              <Dashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/certifier/certificates"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["certifier"]}>
              <Certificates />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/certifier/certificates/:id"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["certifier"]}>
              <CertificateDetail />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <Dashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <Profile />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <Users />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <Settings />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/batches"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <BatchList />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/inspections"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <Inspections />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/certificates"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["admin"]}>
              <Certificates />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Verifier routes */}
      <Route
        path="/verifier/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["verifier"]}>
              <Dashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verifier/verify"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={["verifier"]}>
              <Verify />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
