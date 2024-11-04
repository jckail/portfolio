import React from 'react';
import { MainLayout } from '../features/layouts/components/main-layout';
import AppRoutes from './routes';

const App = () => {
  return (
    <MainLayout>
      <AppRoutes />
    </MainLayout>
  );
};

export default App;
