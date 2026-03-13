import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Public Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Faculty Pages
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import ProfilePage from "./pages/faculty/ProfilePage";
import TeachingLearningActivities from "./pages/faculty/TeachingLearningActivities";
import BooksChapters from "./pages/faculty/BooksChapters";
import JournalsConferences from "./pages/faculty/JournalsConferences";
import ProjectsConsultancy from "./pages/faculty/ProjectsConsultancy";
import PatentsGuidance from "./pages/faculty/PatentsGuidance";
import MembershipsFDP from "./pages/faculty/MembershipsFDP";
import EventsContributions from "./pages/faculty/EventsContributions";
import NetworkingContributions from "./pages/faculty/NetworkingContributions";
import Journals from "./pages/faculty/Journals";
import Books from "./pages/faculty/Books";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import FacultyManagement from "./pages/admin/FacultyManagement";
import SettingsPage from "./pages/admin/SettingsPage";
import AppraisalCyclesPage from "./pages/admin/AppraisalCyclesPage";
import AnnouncementsPage from "./pages/admin/AnnouncementsPage";

// HOD Pages
import HODDashboard from "./pages/hod/HODDashboard";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'hod') return <Navigate to="/hod" replace />;
    return <Navigate to="/faculty" replace />;
  }

  return <>{children}</>;
};

// Public route that redirects if authenticated
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'hod') return <Navigate to="/hod" replace />;
    return <Navigate to="/faculty" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

      {/* Faculty Routes */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/profile"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Generic Faculty Modules */}
      <Route
        path="/faculty/teaching"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <TeachingLearningActivities />
          </ProtectedRoute>
        }
      />

      {/* Specific Faculty Activity Modules */}
      <Route
        path="/faculty/journals-conferences"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <JournalsConferences />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/books-chapters"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <BooksChapters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/projects-consultancy"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <ProjectsConsultancy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/patents-guidance"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <PatentsGuidance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/memberships-fdp"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <MembershipsFDP />
          </ProtectedRoute>
        }
      />
      <Route
        path="/faculty/events-contributions"
        element={
          <ProtectedRoute allowedRoles={['faculty']}>
            <EventsContributions />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/faculty"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <FacultyManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cycles"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AppraisalCyclesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AnnouncementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* HOD Routes */}
      <Route
        path="/hod"
        element={
          <ProtectedRoute allowedRoles={['hod']}>
            <HODDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod/analytics"
        element={
          <ProtectedRoute allowedRoles={['hod']}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod/*"
        element={
          <ProtectedRoute allowedRoles={['hod']}>
            <HODDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
