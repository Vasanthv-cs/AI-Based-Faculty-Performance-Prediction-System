import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  Award,
  Building2,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Brain,
  BookOpen,
  Menu,
  X,
  Briefcase,
  Library,
  Presentation,
  UserCircle,
  Lightbulb,
  BookMarked,
  BookText,
  DollarSign,
  ShieldCheck,
  Compass,
  Landmark,
  CalendarClock,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';
import ProfileEditPopover from '@/components/profile/ProfileEditPopover';
import UserAvatar from '@/components/common/UserAvatar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard',        path: '/admin' },
        { icon: Users,           label: 'Faculty Management',path: '/admin/faculty' },
        { icon: BarChart3,       label: 'Analytics',         path: '/admin/analytics' },
        { icon: CalendarClock,   label: 'Appraisal Cycles',  path: '/admin/cycles' },
        { icon: Megaphone,       label: 'Announcements',     path: '/admin/announcements' },
        { icon: Settings,        label: 'Settings',          path: '/admin/settings' },
      ];
    }

    if (user?.role === 'hod') {
      return [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/hod' },
        { icon: Users, label: 'Department Faculty', path: '/hod/faculty' },
        { icon: BarChart3, label: 'Analytics', path: '/hod/analytics' },
        { icon: Brain, label: 'AI Insights', path: '/hod/insights' },
      ];
    }

    return [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/faculty' },
      { icon: UserCircle, label: 'Profile', path: '/faculty/profile' },
      { icon: GraduationCap, label: 'Teaching & Learning', path: '/faculty/teaching' },
      { icon: BookOpen, label: 'Journals & Conferences', path: '/faculty/journals-conferences' },
      { icon: BookText, label: 'Books & Chapters', path: '/faculty/books-chapters' },
      { icon: DollarSign, label: 'Projects & Consultancy', path: '/faculty/projects-consultancy' },
      { icon: ShieldCheck, label: 'Patents & Guidance', path: '/faculty/patents-guidance' },
      { icon: Users, label: 'Memberships & FDP', path: '/faculty/memberships-fdp' },
      { icon: Award, label: 'Events & Activities', path: '/faculty/events-contributions' },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-sidebar-foreground text-sm">FacultyAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'w-64 bg-sidebar fixed h-full flex flex-col z-50 transition-all duration-500 shadow-2xl lg:shadow-none',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-8 border-b border-sidebar-border hidden lg:block">
          <Link to="/" className="group flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Brain className="w-7 h-7 text-primary-foreground animate-pulse-subtle" />
            </div>
            <div>
              <h1 className="font-display font-black text-sidebar-foreground text-lg leading-tight tracking-tight">Faculty<span className="text-primary brightness-125">AI</span></h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">Portal v2.0</p>
            </div>
          </Link>
        </div>

        <div className="p-6 border-b border-sidebar-border lg:hidden">
          <ProfileEditPopover>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <UserAvatar
                userId={user?.id}
                name={user?.name}
                className="w-10 h-10"
                fallbackClassName="bg-sidebar-accent text-sidebar-foreground"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
              </div>
            </div>
          </ProfileEditPopover>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'sidebar-item group',
                  isActive && 'sidebar-item-active'
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isActive
                    ? "text-primary brightness-125 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                    : "text-sidebar-foreground/90 group-hover:text-sidebar-foreground group-hover:brightness-110"
                )} />
                <span className={cn("transition-colors", isActive ? "font-semibold" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <ProfileEditPopover>
            <div className="hidden lg:flex items-center gap-3 px-4 py-3 mb-2 cursor-pointer hover:bg-sidebar-accent/40 rounded-2xl transition-all duration-300">
              <UserAvatar
                userId={user?.id}
                name={user?.name}
                className="w-10 h-10 ring-2 ring-primary/20"
                fallbackClassName="bg-sidebar-accent text-sidebar-foreground font-black"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-[10px] uppercase font-bold text-sidebar-foreground/40 leading-none mt-1">{user?.role}</p>
              </div>
              <ThemeToggle />
            </div>
          </ProfileEditPopover>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all duration-300 group"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
