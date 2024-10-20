import { useState, useEffect, useCallback } from 'react';
import { particleConfig } from '../configs';
import getParticlesConfig from '../particlesConfig';

export const useTheme = () => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.body.className = theme === 'dark' ? 'dark-theme' : '';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const updateParticlesConfig = useCallback(() => {
    const config = particleConfig[theme];
    return getParticlesConfig(
      config.background_color,
      config.particle_color,
      config.line_color
    );
  }, [theme]);

  return { theme, toggleTheme, updateParticlesConfig };
};
