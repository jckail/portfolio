import React from 'react';

import BrandShowcase from '../../shared/components/brand/BrandShowcase';
import { DataProvider, useData } from '../providers/data-provider';
import { CaseStudy } from '../components/sections/projects/CaseStudy';

function ShowcaseWithCase() {
  const { projectsData } = useData();
  const study = projectsData?.portfolio?.case_study;
  return <BrandShowcase caseStudyExample={study ? <CaseStudy study={study} /> : undefined} />;
}

export default function BrandPage() {
  return <DataProvider><ShowcaseWithCase /></DataProvider>;
}
