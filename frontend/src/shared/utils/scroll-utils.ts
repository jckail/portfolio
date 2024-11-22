export const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    // Get the header height from CSS variable
    const headerHeight = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim()
      .replace('px', ''));

    // First scroll to bring the element into view
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    
    // Then adjust for header height
    setTimeout(() => {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = window.scrollY + elementPosition - headerHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }, 100); // Small delay to ensure scrollIntoView has completed
  }
};
