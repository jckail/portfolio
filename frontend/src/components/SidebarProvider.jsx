import React, { createContext, useContext, useState, useRef } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export function SidebarProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTemporarilyVisible, setIsTemporarilyVisible] = useState(false);
  const [isSidebarOpenedByScroll, setIsSidebarOpenedByScroll] = useState(false);
  const timeoutRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(prevState => !prevState);
    if (isSidebarOpen && !isSidebarOpenedByScroll) {
      setIsTemporarilyVisible(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    setIsSidebarOpenedByScroll(false);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = {
    isSidebarOpen,
    isTemporarilyVisible,
    isSidebarOpenedByScroll,
    setIsSidebarOpen,
    setIsTemporarilyVisible,
    setIsSidebarOpenedByScroll,
    toggleSidebar,
    timeoutRef
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}
