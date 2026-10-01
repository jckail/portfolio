import React from 'react';

import { LoadingSpinner } from '../../../shared/components/loading-spinner';

/** What a below-fold section renders while the shared resume data loads. */
export const SectionPlaceholder: React.FC<{ id: string }> = ({ id }) => (
  <section id={id} className="section-container">
    <div className="section-content">
      <LoadingSpinner />
    </div>
  </section>
);

export default SectionPlaceholder;
