(() => {
  const key = 'portfolio-theme-preference';
  const query = new URLSearchParams(location.search).get('theme');
  let stored;
  try { stored = localStorage.getItem(key); } catch { /* Storage is optional. */ }
  let theme = query || stored || 'dark';
  if (theme !== 'light') theme = 'dark';
  const button = document.getElementById('theme-toggle');
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    button.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  };
  apply();
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    apply();
    try { localStorage.setItem(key, theme); } catch { /* Storage is optional. */ }
    const url = new URL(location.href);
    url.searchParams.set('theme', theme);
    history.replaceState({}, '', url);
  });
})();
