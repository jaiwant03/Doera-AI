import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import ErrorBoundary from './components/UI/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import ChatPage from './pages/ChatPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import ApprovalCenterPage from './pages/ApprovalCenterPage';
import MissionControlPage from './pages/MissionControlPage';
import CheckoutPage from './pages/CheckoutPage';
import NotFound from './pages/NotFound';
import LoadingIndicator from './components/UI/LoadingIndicator';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#08050B]">
        <LoadingIndicator message="Initializing DOERA AI workspace..." size="lg" />
      </div>
    );
  }

  if (!token && !user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ChatProvider>
            <Routes>
              {/* Public Landing Page at Root / */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Authenticated Chat Workspace at /chat */}
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/research"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute>
                    <ApprovalCenterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/missions"
                element={
                  <ProtectedRoute>
                    <MissionControlPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ChatProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
