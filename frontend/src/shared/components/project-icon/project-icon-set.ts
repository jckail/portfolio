import type React from 'react';

import GithubLogo from '../../../assets/icons/projects/github-logo.svg?react';
import JobbrIcon from '../../../assets/icons/projects/jobbr-icon.svg?react';
import PlaygroundIcon from '../../../assets/icons/projects/playground-icon.svg?react';
import PointupIcon from '../../../assets/icons/projects/pointup.svg?react';

/**
 * The project icons that paint with `var(--text-color)` / `currentColor`, so
 * they have to be inline SVG to follow the theme (an <img> cannot see the
 * page's CSS variables and would draw them black on the dark theme). Bundled
 * as ONE lazily-loaded chunk. Every other project icon is an <img> URL; see
 * ProjectIcon.tsx. Keep THEMED_PROJECT_ICONS there in sync (checked by
 * ProjectIcon.test.tsx).
 */
const PROJECT_ICON_SET: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'github-logo.svg': GithubLogo,
  'jobbr-icon.svg': JobbrIcon,
  'playground-icon.svg': PlaygroundIcon,
  'pointup.svg': PointupIcon,
};

export default PROJECT_ICON_SET;
