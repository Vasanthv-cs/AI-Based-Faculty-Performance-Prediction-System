import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, Mail, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Login successful!');
        // Navigation will be handled by auth state change
      } else {
        setError(result.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px] animate-float delay-500" />

      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 z-10 animate-reveal">
        <div className="w-full max-w-md">
          <Link to="/" className="group flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Brain className="w-7 h-7 text-primary-foreground animate-pulse-subtle" />
            </div>
            <div>
              <h1 className="font-display font-black text-foreground text-2xl leading-none tracking-tight">Faculty<span className="text-primary brightness-125">AI</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Performance Nexus</p>
            </div>
          </Link>

          <div className="mb-10">
            <h1 className="font-display text-4xl font-black mb-3 tracking-tight">Welcome <span className="gradient-text">Back</span></h1>
            <p className="text-muted-foreground text-lg">Sign in to access your administrative suite.</p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 mb-8 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl animate-reveal">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-14 bg-white/50 dark:bg-slate-900/50 border-border/50 rounded-2xl focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 h-14 bg-white/50 dark:bg-slate-900/50 border-border/50 rounded-2xl focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-accent hover:brightness-110 shadow-lg transition-all duration-300" disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Secure Login'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            New to the platform?{' '}
            <Link to="/signup" className="text-primary hover:text-accent font-bold transition-colors">
              Request Access
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Visual Branding */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 -ml-20 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-accent/90 rounded-l-[80px] shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute inset-x-0 h-px bg-white/20 top-[10%]" />
             <div className="absolute inset-x-0 h-px bg-white/20 top-[30%]" />
             <div className="absolute inset-x-0 h-px bg-white/20 top-[50%]" />
             <div className="absolute inset-x-0 h-px bg-white/20 top-[70%]" />
             <div className="absolute inset-x-0 h-px bg-white/20 top-[90%]" />
          </div>
        </div>
        <div className="text-center text-primary-foreground relative z-10 animate-reveal delay-300">
          <div className="w-32 h-32 mx-auto mb-10 bg-white/10 rounded-[40px] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl animate-float">
            <Brain className="w-16 h-16 text-white" />
          </div>
          <h2 className="font-display text-4xl font-black mb-6 tracking-tight leading-tight">Advanced academic<br/>intelligence system.</h2>
          <p className="text-white/70 text-lg max-w-sm mx-auto leading-relaxed">
            Harnessing AI to streamline faculty performance, research metrics, and career progression.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
