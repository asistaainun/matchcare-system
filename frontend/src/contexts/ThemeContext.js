import React, { createContext, useContext, useEffect, useState } from 'react';

// Create context
const ThemeContext = createContext();

// Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Provider component
export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
          // Use saved preference
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Use system preference
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setIsDarkMode(systemPrefersDark);
        }
      } catch (error) {
        console.error('Error initializing theme:', error);
        // Fallback to light mode
        setIsDarkMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      // Only update if no saved preference
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Update CSS custom properties for toast notifications
    root.style.setProperty('--toast-bg', isDarkMode ? '#374151' : '#FFFFFF');
    root.style.setProperty('--toast-color', isDarkMode ? '#F9FAFB' : '#111827');
  }, [isDarkMode]);

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    try {
      localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Set theme explicitly
  const setTheme = (theme) => {
    const isDark = theme === 'dark';
    setIsDarkMode(isDark);
    
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Reset to system preference
  const resetToSystem = () => {
    try {
      localStorage.removeItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
    } catch (error) {
      console.error('Error resetting theme:', error);
    }
  };

  // Get current theme info
  const getThemeInfo = () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return {
      current: isDarkMode ? 'dark' : 'light',
      saved: savedTheme,
      system: systemPrefersDark ? 'dark' : 'light',
      isSystemDefault: !savedTheme
    };
  };

  const value = {
    isDarkMode,
    isLoading,
    toggleTheme,
    setTheme,
    resetToSystem,
    getThemeInfo,
    theme: isDarkMode ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};