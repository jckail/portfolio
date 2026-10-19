import type React from 'react';

import CommonspiritLogo from '../../../assets/icons/companylogos/commonspirit.svg?react';
import DeloitteLogo from '../../../assets/icons/companylogos/deloitte.svg?react';
import MetaLogo from '../../../assets/icons/companylogos/meta.svg?react';
import ProveLogo from '../../../assets/icons/companylogos/prove.svg?react';
import TogetherLogo from '../../../assets/icons/companylogos/together.svg?react';
import WowLogo from '../../../assets/icons/companylogos/wow.svg?react';
import R1Logo from '../../../assets/icons/companylogos/r1.svg?react';

/** Inline company logos, bundled as one lazily-loaded chunk (see skill-icon-set). */
const COMPANY_LOGO_SET: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'commonspirit.svg': CommonspiritLogo,
  'deloitte.svg': DeloitteLogo,
  'meta.svg': MetaLogo,
  'prove.svg': ProveLogo,
  'together.svg': TogetherLogo,
  'wow.svg': WowLogo,
  'r1.svg': R1Logo,
};

export default COMPANY_LOGO_SET;
