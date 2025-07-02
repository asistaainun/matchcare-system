import React from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ArrowLeft, 
  Wifi, 
  Server,
  AlertCircle,
  Info
} from 'lucide-react';

// Main ErrorMessage component
const ErrorMessage = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  description = '',
  type = 'error',
  showIcon = true,
  onRetry = null,
  onBack = null,
  retryText = 'Try Again',
  backText = 'Go Back',
  className = '',
  fullHeight = false
}) => {
  const typeConfig = {
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/10',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-200',
      textColor: 'text-red-700 dark:text-red-300'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/10',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-800 dark:text-yellow-200',
      textColor: 'text-yellow-700 dark:text-yellow-300'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/10',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    network: {
      icon: Wifi,
      bgColor: 'bg-purple-50 dark:bg-purple-900/10',
      borderColor: 'border-purple-200 dark:border-purple-800',
      iconColor: 'text-purple-600 dark:text-purple-400',
      titleColor: 'text-purple-800 dark:text-purple-200',
      textColor: 'text-purple-700 dark:text-purple-300'
    },
    server: {
      icon: Server,
      bgColor: 'bg-orange-50 dark:bg-orange-900/10',
      borderColor: 'border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400',
      titleColor: 'text-orange-800 dark:text-orange-200',
      textColor: 'text-orange-700 dark:text-orange-300'
    }
  };

  const config = typeConfig[type] || typeConfig.error;
  const Icon = config.icon;

  const containerClass = fullHeight 
    ? 'min-h-screen flex items-center justify-center px-4'
    : 'flex justify-center py-8 px-4';

  return (
    <div className={`${containerClass} ${className}`}>
      <div className={`max-w-md w-full ${config.bgColor} ${config.borderColor} border rounded-lg p-6 text-center`}>
        {showIcon && (
          <div className="flex justify-center mb-4">
            <div className={`w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
          </div>
        )}

        <h3 className={`text-lg font-semibold ${config.titleColor} mb-2`}>
          {title}
        </h3>

        <p className={`${config.textColor} mb-1`}>
          {message}
        </p>

        {description && (
          <p className={`text-sm ${config.textColor} opacity-80 mb-4`}>
            {description}
          </p>
        )}

        {(onRetry || onBack) && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{retryText}</span>
              </button>
            )}

            {onBack && (
              <button
                onClick={onBack}
                className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{backText}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Network error component
export const NetworkError = ({ onRetry, className = '' }) => {
  return (
    <ErrorMessage
      title="Network Error"
      message="Unable to connect to the server"
      description="Please check your internet connection and try again."
      type="network"
      onRetry={onRetry}
      retryText="Retry Connection"
      className={className}
    />
  );
};

// Server error component
export const ServerError = ({ onRetry, className = '' }) => {
  return (
    <ErrorMessage
      title="Server Error"
      message="The server is temporarily unavailable"
      description="We're working to fix this issue. Please try again later."
      type="server"
      onRetry={onRetry}
      retryText="Try Again"
      className={className}
    />
  );
};

// Not found error component
export const NotFoundError = ({ 
  title = "Page Not Found",
  message = "The page you're looking for doesn't exist.",
  onBack,
  className = ''
}) => {
  return (
    <ErrorMessage
      title={title}
      message={message}
      description="You may have mistyped the address or the page may have moved."
      type="warning"
      onBack={onBack || (() => window.history.back())}
      backText="Go Back"
      className={className}
      fullHeight={true}
    />
  );
};

// Authorization error component
export const AuthorizationError = ({ 
  onBack,
  onLogin,
  className = ''
}) => {
  return (
    <ErrorMessage
      title="Access Denied"
      message="You don't have permission to view this page"
      description="Please log in or contact support if you believe this is an error."
      type="warning"
      onRetry={onLogin}
      onBack={onBack}
      retryText="Log In"
      backText="Go Back"
      className={className}
    />
  );
};

// Validation error component
export const ValidationError = ({ 
  errors = [],
  title = "Validation Error",
  className = ''
}) => {
  return (
    <div className={`bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            {title}
          </h3>
          {errors.length > 0 && (
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{error.message || error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline error message
export const InlineErrorMessage = ({ 
  message,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

// Success message component
export const SuccessMessage = ({
  title = "Success!",
  message,
  description = '',
  onClose = null,
  autoClose = false,
  autoCloseDelay = 5000,
  className = ''
}) => {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, autoCloseDelay]);

  return (
    <div className={`bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
            {title}
          </h3>
          {message && (
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              {message}
            </p>
          )}
          {description && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {description}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 text-green-400 hover:text-green-600 dark:text-green-500 dark:hover:text-green-300"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// Empty state component
export const EmptyState = ({
  icon: Icon = AlertCircle,
  title = "No data found",
  message = "There's nothing to show here yet.",
  action = null,
  actionText = "Get Started",
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {message}
      </p>

      {action && (
        <button
          onClick={action}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;