import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Brain, Mail, Lock, User, Building2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
}

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [cseDepartment, setCseDepartment] = useState<Department | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCSEDepartment();
  }, []);

  const fetchCSEDepartment = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .eq('code', 'CSE')
      .single();
    if (data) {
      setCseDepartment(data);
      setDepartmentId(data.id);
    }
    if (error) console.error('Error fetching CSE department:', error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const result = await signup(
        email,
        password,
        name,
        'faculty',
        departmentId
      );

      if (result.success) {
        if (result.error) {
          // Email confirmation required
          setSuccessMessage(result.error);
          toast.info(result.error);
        } else {
          toast.success('Account created successfully!');
          navigate('/faculty');
        }
      } else {
        setError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex flex-1 hero-gradient items-center justify-center p-8">
        <div className="text-center text-primary-foreground">
          <Brain className="w-24 h-24 mx-auto mb-6 opacity-80" />
          <h2 className="font-display text-2xl font-bold mb-4">Join FacultyAI</h2>
          <p className="text-primary-foreground/80 max-w-sm">
            Start tracking your academic achievements and get AI-powered performance insights today.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">FacultyAI</span>
          </Link>

          <h1 className="font-display text-3xl font-bold mb-2">Create account</h1>
          <p className="text-muted-foreground mb-8">Get started with your faculty profile</p>

          {error && (
            <div className="flex items-center gap-2 p-4 mb-6 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-4 mb-6 bg-success/10 text-success rounded-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  id="department"
                  type="text"
                  value={cseDepartment?.name || 'Computer Science and Engineering'}
                  className="pl-10"
                  disabled
                />
                </div>
              </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
