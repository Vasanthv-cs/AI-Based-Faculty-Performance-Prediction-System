import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Brain,
  BarChart3,
  Users,
  Shield,
  FileText,
  Award,
  Building2,
  GraduationCap,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const Landing: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Machine learning algorithms analyze faculty activities to predict performance scores and provide actionable insights.',
    },
    {
      icon: BarChart3,
      title: 'Comprehensive Analytics',
      description: 'Visual dashboards with pie charts, bar graphs, and trend analysis for data-driven decision making.',
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Secure authentication with separate dashboards for Admin, HOD, and Faculty members.',
    },
    {
      icon: FileText,
      title: 'Document Management',
      description: 'Upload and manage certificates, research papers, and activity proofs in one centralized system.',
    },
  ];

  const activities = [
    { icon: GraduationCap, label: 'FDP Programs', count: '500+' },
    { icon: Building2, label: 'Industrial Visits', count: '200+' },
    { icon: FileText, label: 'Research Papers', count: '1000+' },
    { icon: Award, label: 'Certifications', count: '800+' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">FacultyAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-gradient pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground px-4 py-2 rounded-full text-sm mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            AI-Powered Performance Evaluation
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-6 animate-slide-up">
            Faculty Performance<br />Prediction System
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Transform academic evaluation with AI-driven insights. Track FDP programs, research publications, certifications, and more to make data-driven decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/signup">
              <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                Start Free Trial
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-6 -mt-12">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="glass-card rounded-xl p-6 text-center animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <activity.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="font-display text-2xl font-bold">{activity.count}</p>
                <p className="text-sm text-muted-foreground">{activity.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Powerful Features for<br />Academic Excellence
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to evaluate, analyze, and improve faculty performance in your institution.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="dashboard-card p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Section */}
      <section id="about" className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Tailored for Every Role
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Separate dashboards designed for specific needs and responsibilities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="dashboard-card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">Admin</h3>
              <p className="text-muted-foreground text-sm">
                Complete control over faculty management, analytics, and AI-powered promotion recommendations.
              </p>
            </div>
            <div className="dashboard-card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">HOD</h3>
              <p className="text-muted-foreground text-sm">
                Staff-specific insights, faculty performance tracking, and team analytics.
              </p>
            </div>
            <div className="dashboard-card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-success" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">Faculty</h3>
              <p className="text-muted-foreground text-sm">
                Personal dashboard to track activities, upload documents, and view performance scores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 hero-gradient">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Transform Faculty Evaluation?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join institutions worldwide using AI to make smarter academic decisions.
          </p>
          <Link to="/signup">
            <Button size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              Get Started Today
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            <span className="font-display font-bold">FacultyAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 FacultyAI. AI-Based Faculty Performance Prediction System.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
