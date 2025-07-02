import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { GuestProvider } from './contexts/GuestContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import LoadingSpinner, { PageLoadingSpinner } from './components/common/LoadingSpinner';
import ErrorBoundary from './components/Common/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import IngredientsPage from './pages/IngredientsPage';
import IngredientDetailPage from './pages/IngredientDetailPage';
import SkinQuizPage from './pages/SkinQuizPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Styles
import './index.css';

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Main App Component
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState(null);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Simulate app initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // You can add other initialization logic here
        // e.g., checking app version, loading critical data, etc.
        
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization error:', error);
        setAppError('Failed to initialize application');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Show loading screen during app initialization
  if (isLoading) {
    return <PageLoadingSpinner text="Initializing MatchCare..." />;
  }

  // Show error screen if app failed to initialize
  if (appError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Failed to Load MatchCare
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{appError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <GuestProvider>
                <Router>
                  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
                    {/* Navigation */}
                    <Navbar />

                    {/* Main Content */}
                    <main className="flex-grow">
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/products/:id" element={<ProductDetailPage />} />
                        <Route path="/ingredients" element={<IngredientsPage />} />
                        <Route path="/ingredients/:id" element={<IngredientDetailPage />} />
                        <Route path="/skin-quiz" element={<SkinQuizPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/contact" element={<ContactPage />} />

                        {/* Auth Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Protected Routes */}
                        <Route
                          path="/profile"
                          element={
                            <ProtectedRoute>
                              <ProfilePage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/favorites"
                          element={
                            <ProtectedRoute>
                              <FavoritesPage />
                            </ProtectedRoute>
                          }
                        />

                        {/* Redirects */}
                        <Route path="/quiz" element={<Navigate to="/skin-quiz" replace />} />
                        <Route path="/product/:id" element={<Navigate to="/products/:id" replace />} />
                        <Route path="/ingredient/:id" element={<Navigate to="/ingredients/:id" replace />} />

                        {/* 404 */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </main>

                    {/* Footer */}
                    <Footer />

                    {/* Toast Notifications */}
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: 'var(--toast-bg)',
                          color: 'var(--toast-color)',
                        },
                        success: {
                          iconTheme: {
                            primary: '#10B981',
                            secondary: '#FFFFFF',
                          },
                        },
                        error: {
                          iconTheme: {
                            primary: '#EF4444',
                            secondary: '#FFFFFF',
                          },
                        },
                      }}
                    />
                  </div>
                </Router>
              </GuestProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </HelmetProvider>

      {/* React Query Devtools (only in development) */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;