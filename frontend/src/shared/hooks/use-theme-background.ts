import { useMemo } from 'react';
import { Theme } from '../../types/theme';
import { WHITE, BLACK } from '../../config/constants';

export const useThemeBackground = (theme: Theme): string => {
  return useMemo(() => {
    const backgrounds: Record<Theme, string> = {
      light: WHITE,
      dark: BLACK,
      party: BLACK
    };
    return backgrounds[theme];
  }, [theme]);
};
