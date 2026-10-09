import type React from 'react';

import GithubLogo from '../../../assets/icons/projects/github-logo.svg?react';
import JobbrIcon from '../../../assets/icons/projects/jobbr-icon.svg?react';
import PlaygroundIcon from '../../../assets/icons/projects/playground-icon.svg?react';

// One lazy chunk keeps the catalogue glyphs out of the initial application.
const modules = import.meta.glob<React.FC<React.SVGProps<SVGSVGElement>>>(
  '../../../assets/icons/project-glyphs/*.svg',
  { eager: true, query: '?react', import: 'default' }
);
const PROJECT_ICON_SET: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = Object.create(null);
for (const [path, Svg] of Object.entries(modules)) {
  PROJECT_ICON_SET[path.slice(path.lastIndexOf('/') + 1)] = Svg;
}
PROJECT_ICON_SET['github-logo.svg'] = GithubLogo;
PROJECT_ICON_SET['jobbr-icon.svg'] = JobbrIcon;
PROJECT_ICON_SET['playground-icon.svg'] = PlaygroundIcon;
export default PROJECT_ICON_SET;
