import { useState, useRef } from 'react';

export const useSidebar = () => {
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

  return {
    isSidebarOpen,
    isTemporarilyVisible,
    isSidebarOpenedByScroll,
    setIsSidebarOpen,
    setIsTemporarilyVisible,
    setIsSidebarOpenedByScroll,
    toggleSidebar,
    timeoutRef
  };
};
