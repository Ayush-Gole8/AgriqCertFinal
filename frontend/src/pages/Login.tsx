import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Award,
  Leaf,
  Shield,
  Users,
  ClipboardCheck,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Ensure this component uses React.forwardRef
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

// --- Improved Validation Schema ---
const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Fields below are optional by default but validated if present
  name: z.string().min(2, 'Name is required for signup').max(100).optional().or(z.literal('')),
  organization: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

const roles: { role: UserRole; label: string; description: string; icon: React.ElementType }[] = [
  { role: 'farmer', label: 'Farmer', description: 'Submit batches for certification', icon: Leaf },
  { role: 'qa_inspector', label: 'QA Inspector', description: 'Inspect and verify quality', icon: ClipboardCheck },
  { role: 'certifier', label: 'Certifier', description: 'Issue certificates', icon: Award },
  { role: 'verifier', label: 'Verifier', description: 'Verify certificates and product history', icon: Users },
  { role: 'admin', label: 'Admin', description: 'Manage system and users', icon: Shield },
];

const roleContent: Record<string, { heroTitle: string; heroSubtitle: string; cardDescription: string }> = {
  farmer: {
    heroTitle: 'Log in to manage your farm batches',
    heroSubtitle: 'Create, track, and submit harvest batches for certification in one place.',
    cardDescription: 'Sign in to submit new batches and follow their certification progress.',
  },
  qa_inspector: {
    heroTitle: 'Log in to plan and record inspections',
    heroSubtitle: 'View assigned batches, schedule visits, and record lab results.',
    cardDescription: 'Sign in to access your inspections and update quality checks.',
  },
  certifier: {
    heroTitle: 'Log in to review and issue certificates',
    heroSubtitle: 'Review inspection results and issue digital credentials.',
    cardDescription: 'Sign in to manage certification workflows.',
  },
  admin: {
    heroTitle: 'Administer AgriQCert',
    heroSubtitle: 'Configure organizations, manage users, and oversee activity.',
    cardDescription: 'Sign in to manage system settings and roles.',
  },
  verifier: {
    heroTitle: 'Verify certificates at checkpoints',
    heroSubtitle: 'Scan QR codes and validate certificate authenticity instantly.',
    cardDescription: 'Sign in to quickly verify certificates and shipment details.',
  },
};

export default function Login() {
  const [mode, setMode] = useState<'login' | 'role-select' | 'signup'>('role-select');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ role?: string }>();
  const location = useLocation();
  const locationState = location.state as { from?: string } | null;
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const fromPath = locationState?.from || redirectParam || '/dashboard';

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      organization: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    const roleParam = params.role as UserRole;
    const validRoles = roles.map((r) => r.role);

    if (roleParam && validRoles.includes(roleParam)) {
      setSelectedRole(roleParam);
      setMode('login');
    } else {
      setSelectedRole(null);
      setMode('role-select');
    }
  }, [params.role]);

  const handleRoleSelect = (role: UserRole) => {
    navigate(`/login/${role}`);
  };

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (mode === 'signup') {
        // Manual check for name since it's "optional" in schema to allow login
        if (!data.name || data.name.length < 2) {
          form.setError('name', { message: 'Name is required for registration' });
          setIsLoading(false);
          return;
        }

        const effectiveRole: UserRole = selectedRole || 'farmer';
        await signup(
          data.email,
          data.password,
          data.name,
          effectiveRole,
          data.organization,
          data.phone,
          data.address
        );
      } else {
        await login(data.email, data.password);
      }
      navigate(fromPath, { replace: true });
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      setAuthError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeRoleContent = selectedRole ? roleContent[selectedRole] : null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/20 backdrop-blur">
              <Award className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold">AgriQCert</span>
          </div>

          <div className="max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRole || 'default'}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h1 className="text-4xl font-bold leading-tight mb-4">
                  {activeRoleContent?.heroTitle ?? 'Agricultural Quality Certification Made Simple'}
                </h1>
                <p className="text-lg opacity-90">
                  {activeRoleContent?.heroSubtitle ?? 'From farm to table, ensure every product meets the highest standards.'}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Batches Certified', value: '12,847' },
                { label: 'Active Farmers', value: '3,291' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-background/10 backdrop-blur">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm opacity-80">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm opacity-70">Trusted by agricultural boards across 12 regions</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          {mode === 'role-select' ? (
            <Card className="border-none shadow-xl lg:shadow-none">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Select your role to continue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roles.map((item) => (
                  <button
                    key={item.role}
                    onClick={() => handleRoleSelect(item.role)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-xl lg:shadow-none">
              <CardHeader>
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </button>
                <CardTitle className="text-2xl">
                  {mode === 'signup' ? 'Create account' : `Sign in as ${roles.find(r => r.role === selectedRole)?.label || 'User'}`}
                </CardTitle>
                <CardDescription>
                  {mode === 'signup' ? 'Join the AgriQCert network' : activeRoleContent?.cardDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {mode === 'signup' && (
                    <Input
                      label="Full Name"
                      placeholder="John Doe"
                      {...form.register('name')}
                      error={form.formState.errors.name?.message}
                    />
                  )}

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="name@company.com"
                    {...form.register('email')}
                    error={form.formState.errors.email?.message}
                  />

                  {mode === 'signup' && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Phone" {...form.register('phone')} />
                      <Input label="Organization" {...form.register('organization')} />
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...form.register('password')}
                      error={form.formState.errors.password?.message}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[38px] text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
                    {isLoading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </Button>

                  {authError && <p className="text-sm text-destructive text-center">{authError}</p>}

                  <div className="text-center pt-2">
                    {selectedRole !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                      </button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
