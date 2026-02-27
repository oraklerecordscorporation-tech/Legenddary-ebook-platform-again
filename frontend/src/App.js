import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import BookEditor from "./pages/BookEditor";
import CoverDesigner from "./pages/CoverDesigner";
import SignatureStudio from "./pages/SignatureStudio";
import ImageFinder from "./pages/ImageFinder";
import ExportCenter from "./pages/ExportCenter";
import PublishingGuide from "./pages/PublishingGuide";
import MarketingTips from "./pages/MarketingTips";
import RoyaltyCalculator from "./pages/RoyaltyCalculator";
import BookTemplates from "./pages/BookTemplates";
import ImportCenter from "./pages/ImportCenter";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full gold-shimmer"></div>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 rounded-full gold-shimmer"></div>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/editor/:bookId" element={<ProtectedRoute><BookEditor /></ProtectedRoute>} />
      <Route path="/cover/:bookId" element={<ProtectedRoute><CoverDesigner /></ProtectedRoute>} />
      <Route path="/signature" element={<ProtectedRoute><SignatureStudio /></ProtectedRoute>} />
      <Route path="/images" element={<ProtectedRoute><ImageFinder /></ProtectedRoute>} />
      <Route path="/export/:bookId" element={<ProtectedRoute><ExportCenter /></ProtectedRoute>} />
      <Route path="/publishing" element={<ProtectedRoute><PublishingGuide /></ProtectedRoute>} />
      <Route path="/marketing" element={<ProtectedRoute><MarketingTips /></ProtectedRoute>} />
      <Route path="/calculator" element={<ProtectedRoute><RoyaltyCalculator /></ProtectedRoute>} />
      <Route path="/templates" element={<ProtectedRoute><BookTemplates /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportCenter /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <div className="dark">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
