import React from 'react';
import { Loader2, Heart, Sparkles } from 'lucide-react';

// Main LoadingSpinner component
const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  color = 'blue',
  showText = true,
  className = '',
  centered = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const containerClass = centered 
    ? 'flex flex-col items-center justify-center'
    : 'flex items-center space-x-2';

  return (
    <div className={`${containerClass} ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}
      />
      {showText && (
        <span className={`${colorClasses[color]} ${textSizeClasses[size]} ${centered ? 'mt-2' : ''}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Page loading spinner for full page loading
export const PageLoadingSpinner = ({ 
  text = 'Loading page...', 
  icon = null,
  className = ''
}) => {
  const IconComponent = icon || Sparkles;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="text-center">
        {/* Animated icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <IconComponent className="w-8 h-8 text-white" />
        </div>

        {/* Loading spinner */}
        <LoadingSpinner 
          size="lg" 
          text={text}
          color="blue"
          centered={true}
          className="mb-4"
        />

        {/* Additional loading dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

// Button loading spinner
export const ButtonLoadingSpinner = ({ 
  size = 'sm',
  className = ''
}) => {
  return (
    <Loader2 className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} animate-spin ${className}`} />
  );
};

// Card loading skeleton
export const CardLoadingSkeleton = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse ${className}`}>
      {/* Image skeleton */}
      <div className="w-full h-48 bg-gray-200 dark:bg-gray-700"></div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Brand */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        
        {/* Product name */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
        </div>
        
        {/* Category */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        
        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
        
        {/* Key ingredients */}
        <div className="flex space-x-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12"></div>
        </div>
        
        {/* Price */}
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    </div>
  );
};

// List loading skeleton
export const ListLoadingSkeleton = ({ count = 5, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
          <div className="flex items-start space-x-4">
            {/* Image */}
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0"></div>
            
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
            
            {/* Price */}
            <div className="text-right space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Table loading skeleton
export const TableLoadingSkeleton = ({ 
  rows = 5, 
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg ${className}`}>
      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
        {/* Header skeleton */}
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Body skeleton */}
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Inline loading spinner
export const InlineLoadingSpinner = ({ 
  text = 'Loading...', 
  size = 'sm',
  className = ''
}) => {
  return (
    <div className={`inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 ${className}`}>
      <Loader2 className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
      <span className="text-sm">{text}</span>
    </div>
  );
};

// Progress loading bar
export const ProgressLoadingBar = ({ 
  progress = 0, 
  text = '',
  showPercentage = true,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      {text && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        ></div>
      </div>
    </div>
  );
};

// Dots loading animation
export const DotsLoadingSpinner = ({ 
  color = 'blue',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

// Pulse loading animation
export const PulseLoadingSpinner = ({ 
  color = 'blue',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse opacity-75 ${className}`}></div>
  );
};

export default LoadingSpinner;