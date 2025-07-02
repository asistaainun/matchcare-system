// ===== components/Quiz/SkinQuiz.js =====
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGuest } from '../../contexts/GuestContext';
import { useQuery } from 'react-query';
import { apiMethods } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';

const SkinQuiz = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isAuthenticated, submitQuiz: submitAuthQuiz } = useAuth();
  const { submitQuiz: submitGuestQuiz } = useGuest();

  // Fetch quiz questions
  const { data: questions, isLoading, error } = useQuery(
    'quiz-questions',
    () => apiMethods.quiz.getQuestions(),
    {
      select: (response) => response.data.data
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
  const totalSteps = visibleQuestions.length;
  const currentQuestion = visibleQuestions[currentStep];

  const handleAnswer = (questionId, answer) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      let result;
      if (isAuthenticated) {
        result = await submitAuthQuiz(responses);
      } else {
        result = await submitGuestQuiz(responses);
      }

      if (result.success) {
        onComplete(result);
      }
    } catch (error) {
      console.error('Quiz submission error:', error);
      toast.error('Failed to submit quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    const answer = responses[currentQuestion.id];
    
    if (currentQuestion.type === 'multiple_choice') {
      return answer && answer.length > 0;
    }
    
    return answer !== undefined && answer !== '';
  };

  const getProgress = () => {
    return ((currentStep + 1) / totalSteps) * 100;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" text="Loading quiz..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <AlertCircle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Failed to load quiz
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          There was an error loading the quiz questions.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Skin Analysis Quiz
          </h1>
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Question {currentStep + 1} of {totalSteps}</span>
            <span>{Math.round(getProgress())}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentQuestion.type === 'multiple_choice'
              ? responses[currentQuestion.id]?.includes(option.value)
              : responses[currentQuestion.id] === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  if (currentQuestion.type === 'multiple_choice') {
                    const currentAnswers = responses[currentQuestion.id] || [];
                    const newAnswers = currentAnswers.includes(option.value)
                      ? currentAnswers.filter(answer => answer !== option.value)
                      : [...currentAnswers, option.value];
                    handleAnswer(currentQuestion.id, newAnswers);
                  } else {
                    handleAnswer(currentQuestion.id, option.value);
                  }
                }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium mb-1">{option.label}</div>
                    {option.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {currentQuestion.type === 'multiple_choice' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            You can select multiple options
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {isCurrentQuestionAnswered() 
              ? currentStep === totalSteps - 1 
                ? 'Ready to submit' 
                : 'Ready for next question'
              : 'Please select an answer'
            }
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!isCurrentQuestionAnswered() || isSubmitting}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <span>{currentStep === totalSteps - 1 ? 'Complete Quiz' : 'Next'}</span>
              {currentStep === totalSteps - 1 ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </>
          )}
        </button>
      </div>

      {/* Quiz Info */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>This quiz helps us understand your skin type and concerns to provide better recommendations.</p>
      </div>
    </div>
  );
};

export default SkinQuiz;