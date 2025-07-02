import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  CheckCircle, 
  Sparkles, 
  Users, 
  Clock,
  Shield,
  Heart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGuest } from '../contexts/GuestContext';
import SkinQuiz from '../components/Quiz/SkinQuiz';

const SkinQuizPage = () => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { profile: guestProfile, convertToUser } = useGuest();

  // Check if user already has a profile
  const hasProfile = isAuthenticated ? 
    user?.profile?.skinType : 
    guestProfile?.skinType;

  const handleQuizComplete = (result) => {
    setQuizResult(result);
    setQuizCompleted(true);
    
    // Show save prompt for guests
    if (!isAuthenticated) {
      setShowSavePrompt(true);
    }
  };

  const handleSaveResults = async (userData) => {
    try {
      const result = await convertToUser(userData);
      if (result.success) {
        setShowSavePrompt(false);
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error saving results:', error);
    }
  };

  const handleSkipSave = () => {
    setShowSavePrompt(false);
    navigate('/products');
  };

  // Quiz introduction content
  const quizFeatures = [
    {
      icon: Clock,
      title: "Quick & Easy",
      description: "Takes just 3-5 minutes to complete"
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your data is secure and used only for recommendations"
    },
    {
      icon: Sparkles,
      title: "Personalized Results",
      description: "Get recommendations tailored to your unique skin"
    },
    {
      icon: Users,
      title: "Expert Backed",
      description: "Based on dermatological research and expertise"
    }
  ];

  // If quiz is completed, show results
  if (quizCompleted && !showSavePrompt) {
    return (
      <>
        <Helmet>
          <title>Quiz Completed - MatchCare</title>
          <meta name="description" content="Your skin analysis is complete! View your personalized skincare recommendations." />
        </Helmet>

        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full text-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Quiz Completed!
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Your skin analysis is complete. We've identified your skin type as{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {quizResult?.profile?.skinType || 'Unknown'}
                </span>
                {quizResult?.profile?.skinConcerns?.length > 0 && (
                  <>
                    {' '}with concerns for{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {quizResult.profile.skinConcerns.slice(0, 2).join(', ')}
                      {quizResult.profile.skinConcerns.length > 2 && ` and ${quizResult.profile.skinConcerns.length - 2} more`}
                    </span>
                  </>
                )}
                .
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-8">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Profile Completeness: {quizResult?.profile?.profileCompleteness || 0}%
                </p>
                <div className="w-full bg-blue-200 dark:bg-blue-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${quizResult?.profile?.profileCompleteness || 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  to="/products"
                  className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Heart className="w-5 h-5" />
                  <span>View Your Recommendations</span>
                </Link>

                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Save results prompt for guests
  if (showSavePrompt) {
    return (
      <>
        <Helmet>
          <title>Save Your Results - MatchCare</title>
        </Helmet>

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                Save Your Results?
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
                Create an account to save your skin profile and get personalized recommendations.
              </p>

              <SaveResultsForm 
                onSave={handleSaveResults}
                onSkip={handleSkipSave}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Skin Quiz - MatchCare</title>
        <meta 
          name="description" 
          content="Take our comprehensive skin quiz to get personalized skincare recommendations based on your skin type and concerns." 
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {!showQuiz ? (
          // Quiz Introduction
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back Button */}
            <Link
              to="/"
              className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Discover Your Skin Type
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Take our comprehensive skin analysis quiz to get personalized product recommendations 
                tailored specifically for your skin's unique needs.
              </p>
            </div>

            {/* Quiz Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {quizFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Existing Profile Notice */}
            {hasProfile && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      You already have a skin profile
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      Taking the quiz again will update your current profile and recommendations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Start Quiz Button */}
            <div className="text-center">
              <button
                onClick={() => setShowQuiz(true)}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold text-lg"
              >
                <Sparkles className="w-6 h-6" />
                <span>Start Skin Analysis</span>
              </button>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                {isAuthenticated ? 'Results will be saved to your account' : 'Option to save results after completion'}
              </p>
            </div>
          </div>
        ) : (
          // Quiz Component
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <SkinQuiz
              onComplete={handleQuizComplete}
              onCancel={() => setShowQuiz(false)}
            />
          </div>
        )}
      </div>
    </>
  );
};

// Save Results Form Component
const SaveResultsForm = ({ onSave, onSkip }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="First Name"
          value={formData.firstName}
          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          required
        />
        <input
          type="text"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        required
        minLength={6}
      />

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Creating Account...' : 'Save Results'}
        </button>
        
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Continue Without Saving
        </button>
      </div>
    </form>
  );
};

export default SkinQuizPage;