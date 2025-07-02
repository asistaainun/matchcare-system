import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Circle,
  AlertCircle,
  Sparkles,
  User,
  Heart,
  Shield
} from 'lucide-react';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useGuest } from '../../contexts/GuestContext';
import { apiMethods } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const SkinQuiz = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skinTypeAssessment, setSkinTypeAssessment] = useState({});
  
  const { isAuthenticated, submitQuiz: submitAuthQuiz } = useAuth();
  const { submitQuiz: submitGuestQuiz } = useGuest();

  // Fetch quiz questions
  const { data: questions, isLoading, error } = useQuery(
    'quiz-questions',
    () => apiMethods.quiz.getQuestions(),
    {
      select: (response) => response.data.data,
      staleTime: 10 * 60 * 1000 // 10 minutes
    }
  );

  // Filter questions based on conditions
  const getVisibleQuestions = () => {
    if (!questions) return [];
    
    return questions.filter(question => {
      if (!question.condition) return true;
      
      // Check if condition is met
      const [conditionKey, conditionValue] = Object.entries(question.condition)[0];
      return responses[conditionKey] === conditionValue;
    });
  };

  const visibleQuestions = getVisibleQuestions();
  const currentQuestion = visibleQuestions[currentStep];
  const isLastStep = currentStep === visibleQuestions.length - 1;

  // Handle answer selection
  const handleAnswerSelect = (questionId, value) => {
    setResponses(prev => {
      const newResponses = { ...prev };
      
      if (currentQuestion.type === 'multiple_choice') {
        // For multiple choice, toggle selection
        const currentValues = newResponses[questionId] || [];
        if (currentValues.includes(value)) {
          newResponses[questionId] = currentValues.filter(v => v !== value);
        } else {
          newResponses[questionId] = [...currentValues, value];
        }
      } else {
        // For single choice, replace value
        newResponses[questionId] = value;
      }
      
      return newResponses;
    });
  };

  // Handle next step
  const handleNext = () => {
    if (currentStep < visibleQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    
    const answer = responses[currentQuestion.id];
    if (currentQuestion.type === 'multiple_choice') {
      return answer && answer.length > 0;
    }
    return answer !== undefined && answer !== '';
  };

  // Calculate skin type from assessment responses
  const calculateSkinType = (assessmentResponses) => {
    const scores = { dry: 0, oily: 0, normal: 0, combination: 0 };
    
    // Morning feeling
    const morning = assessmentResponses.skin_assessment;
    if (morning === 'tight_dry') scores.dry += 3;
    else if (morning === 'normal_balanced') scores.normal += 3;
    else if (morning === 'oily_shiny') scores.oily += 3;
    else if (morning === 'combination') scores.combination += 3;

    // Oil shine frequency
    const shine = assessmentResponses.oily_shine;
    if (shine === 'rarely_dry') scores.dry += 2;
    else if (shine === 'rarely_balanced') scores.normal += 2;
    else if (shine === 'often_shiny') scores.oily += 2;
    else if (shine === 'tzone_only') scores.combination += 2;

    // Flaky patches
    const flaky = assessmentResponses.flaky_patches;
    if (flaky === 'yes_frequently') scores.dry += 2;
    else if (flaky === 'rarely') scores.normal += 1;
    else if (flaky === 'almost_never') scores.oily += 1;
    else if (flaky === 'sometimes_cheeks') scores.combination += 1;

    // Find highest score
    const maxScore = Math.max(...Object.values(scores));
    const skinType = Object.keys(scores).find(type => scores[type] === maxScore);
    
    return skinType || 'normal';
  };

  // Submit quiz
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Process skin type if unsure
      let finalResponses = { ...responses };
      if (responses.skin_type === 'unsure') {
        const calculatedSkinType = calculateSkinType(responses);
        finalResponses.skin_type = calculatedSkinType;
        setSkinTypeAssessment({
          original: 'unsure',
          calculated: calculatedSkinType,
          confidence: 'high'
        });
      }

      // Submit based on authentication status
      const result = isAuthenticated 
        ? await submitAuthQuiz(finalResponses)
        : await submitGuestQuiz(finalResponses);

      if (result.success) {
        onComplete({
          responses: finalResponses,
          profile: result.profile,
          skinTypeAssessment: skinTypeAssessment.calculated ? skinTypeAssessment : null
        });
      }
    } catch (error) {
      console.error('Quiz submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Progress calculation
  const progress = ((currentStep + 1) / visibleQuestions.length) * 100;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading quiz questions..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message="Failed to load quiz questions"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <ErrorMessage 
        message="No quiz questions available"
        onBack={onCancel}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Skin Analysis Quiz
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Step {currentStep + 1} of {visibleQuestions.length}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
        {/* Question Icon */}
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mr-4">
            {currentQuestion.id.includes('skin_type') && <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            {currentQuestion.id.includes('concerns') && <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            {currentQuestion.id.includes('sensitivities') && <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            {!currentQuestion.id.includes('skin_type') && !currentQuestion.id.includes('concerns') && !currentQuestion.id.includes('sensitivities') && 
              <Circle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            }
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {currentQuestion.question}
            </h2>
            {currentQuestion.type === 'multiple_choice' && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select all that apply
              </p>
            )}
          </div>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentQuestion.type === 'multiple_choice'
              ? (responses[currentQuestion.id] || []).includes(option.value)
              : responses[currentQuestion.id] === option.value;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQuestion.id, option.value)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      isSelected 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {option.label}
                    </div>
                    {option.description && (
                      <div className={`text-sm mt-1 ${
                        isSelected 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Question Note */}
        {currentQuestion.id === 'skin_type' && responses.skin_type === 'unsure' && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Don't worry! We'll ask a few quick questions to help determine your skin type.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={currentStep === 0 ? onCancel : handlePrevious}
          className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{currentStep === 0 ? 'Cancel' : 'Previous'}</span>
        </button>

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={!isCurrentQuestionAnswered() || isSubmitting}
            className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" showText={false} color="white" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Complete Analysis</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!isCurrentQuestionAnswered()}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Question Counter */}
      <div className="flex justify-center mt-6 space-x-2">
        {visibleQuestions.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index <= currentStep
                ? 'bg-blue-600 dark:bg-blue-400'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default SkinQuiz;