import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';
type ThemeName = 'default' | 'blue' | 'red' | 'pink' | string;

interface ThemePalette {
  name: string;
  displayName: string;
  light: {
    primary: string;
    primaryGlow: string;
    accent: string;
    accentForeground: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
}

interface ThemeContextType {
  mode: ThemeMode;
  themeName: ThemeName;
  toggleMode: () => void;
  setThemeName: (name: ThemeName) => void;
  themes: ThemePalette[];
  addCustomTheme: (theme: ThemePalette) => void;
  removeCustomTheme: (name: string) => void;
}

const defaultThemes: ThemePalette[] = [
  {
    name: 'default',
    displayName: 'Default',
    light: {
      primary: '219 70% 52%',
      primaryGlow: '219 70% 60%',
      accent: '34 100% 62%',
      accentForeground: '0 0% 100%',
    },
    dark: {
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
    }
  },
  {
    name: 'blue',
    displayName: 'Ocean Blue',
    light: {
      primary: '200 98% 39%',
      primaryGlow: '200 98% 50%',
      accent: '191 97% 77%',
      accentForeground: '200 98% 20%',
    },
    dark: {
      primary: '191 97% 77%',
      primaryForeground: '200 20% 10%',
      accent: '200 30% 25%',
      accentForeground: '191 97% 77%',
    }
  },
  {
    name: 'red',
    displayName: 'Crimson Red',
    light: {
      primary: '0 84% 60%',
      primaryGlow: '0 84% 70%',
      accent: '14 100% 57%',
      accentForeground: '0 0% 100%',
    },
    dark: {
      primary: '0 72% 70%',
      primaryForeground: '0 20% 10%',
      accent: '0 40% 25%',
      accentForeground: '0 72% 70%',
    }
  },
  {
    name: 'pink',
    displayName: 'Rose Pink',
    light: {
      primary: '330 81% 60%',
      primaryGlow: '330 81% 70%',
      accent: '340 75% 55%',
      accentForeground: '0 0% 100%',
    },
    dark: {
      primary: '330 81% 75%',
      primaryForeground: '330 20% 10%',
      accent: '330 40% 30%',
      accentForeground: '330 81% 75%',
    }
  }
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [themeName, setThemeName] = useState<ThemeName>('default');
  const [customThemes, setCustomThemes] = useState<ThemePalette[]>([]);

  useEffect(() => {
    // Load saved preferences
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    const savedTheme = localStorage.getItem('themeName');
    const savedCustomThemes = localStorage.getItem('customThemes');

    if (savedMode) {
      setMode(savedMode);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }

    if (savedTheme) {
      setThemeName(savedTheme);
    }

    if (savedCustomThemes) {
      try {
        setCustomThemes(JSON.parse(savedCustomThemes));
      } catch (e) {
        console.error('Failed to load custom themes:', e);
      }
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply mode class
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    localStorage.setItem('themeMode', mode);

    // Apply theme palette
    const allThemes = [...defaultThemes, ...customThemes];
    const currentTheme = allThemes.find(t => t.name === themeName) || defaultThemes[0];
    const palette = mode === 'light' ? currentTheme.light : currentTheme.dark;

    root.style.setProperty('--primary', palette.primary);
    if (mode === 'light' && 'primaryGlow' in palette) {
      root.style.setProperty('--primary-glow', palette.primaryGlow);
    }
    if (mode === 'dark' && 'primaryForeground' in palette) {
      root.style.setProperty('--primary-foreground', palette.primaryForeground);
    }
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--accent-foreground', palette.accentForeground);
    
    localStorage.setItem('themeName', themeName);
  }, [mode, themeName, customThemes]);

  const toggleMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  const addCustomTheme = (theme: ThemePalette) => {
    const updated = [...customThemes, theme];
    setCustomThemes(updated);
    localStorage.setItem('customThemes', JSON.stringify(updated));
  };

  const removeCustomTheme = (name: string) => {
    const updated = customThemes.filter(t => t.name !== name);
    setCustomThemes(updated);
    localStorage.setItem('customThemes', JSON.stringify(updated));
    if (themeName === name) {
      setThemeName('default');
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      themeName, 
      toggleMode, 
      setThemeName, 
      themes: [...defaultThemes, ...customThemes],
      addCustomTheme,
      removeCustomTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};