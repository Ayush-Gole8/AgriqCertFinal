import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const roles: { role: UserRole; label: string; description: string; icon: React.ElementType }[] = [
  { role: 'farmer', label: 'Farmer', description: 'Submit batches for certification', icon: Leaf },
  { role: 'qa_inspector', label: 'QA Inspector', description: 'Inspect and verify quality', icon: ClipboardCheck },
  { role: 'certifier', label: 'Certifier', description: 'Issue certificates', icon: Award },
  { role: 'admin', label: 'Admin', description: 'Manage system', icon: Shield },
  { role: 'verifier', label: 'Verifier', description: 'Verify certificates', icon: Users },
];

export default function Login() {
  const [mode, setMode] = useState<'login' | 'role-select' | 'signup'>('role-select');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setMode('login');
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        await signup(data.email, data.password, 'New User', 'farmer');
      } else {
        await login(data.email, data.password);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/20 backdrop-blur">
              <Award className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold">AgriQCert</span>
          </div>
          
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Agricultural Quality Certification Made Simple
            </h1>
            <p className="text-lg opacity-90">
              From farm to table, ensure every product meets the highest quality standards with verifiable digital certificates.
            </p>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { label: 'Batches Certified', value: '12,847' },
                { label: 'Active Farmers', value: '3,291' },
                { label: 'Inspections', value: '45,692' },
                { label: 'Verifications', value: '128K+' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-background/10 backdrop-blur">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm opacity-80">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm opacity-70">
            Trusted by agricultural boards across 12 regions
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Award className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">AgriQCert</span>
          </div>

          {mode === 'role-select' ? (
            <Card variant="elevated">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Select your role to continue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roles.map((roleItem) => (
                  <motion.button
                    key={roleItem.role}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleRoleSelect(roleItem.role)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200 text-left disabled:opacity-50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <roleItem.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{roleItem.label}</p>
                      <p className="text-sm text-muted-foreground">{roleItem.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </motion.button>
                ))}

                <div className="pt-4 text-center">
                  <button
                    onClick={() => setMode('login')}
                    className="text-sm text-primary hover:underline"
                  >
                    Sign in with email instead
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card variant="elevated">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {mode === 'signup' ? 'Create account' : 'Sign in'}
                </CardTitle>
                <CardDescription>
                  {mode === 'signup' 
                    ? 'Enter your details to get started' 
                    : selectedRole 
                      ? `Sign in as ${roles.find(r => r.role === selectedRole)?.label}` 
                      : 'Enter your credentials to continue'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    error={form.formState.errors.email?.message}
                    {...form.register('email')}
                  />

                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      error={form.formState.errors.password?.message}
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    variant="gradient" 
                    className="w-full" 
                    loading={isLoading}
                  >
                    {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </Button>
                </form>

                <div className="mt-6 text-center space-y-2">
                  <button
                    onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {mode === 'signup' 
                      ? 'Already have an account? Sign in' 
                      : "Don't have an account? Sign up"}
                  </button>
                  <div className="block">
                    <button
                      onClick={() => {
                        setSelectedRole(null);
                        setMode('role-select');
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Back to role selection
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
