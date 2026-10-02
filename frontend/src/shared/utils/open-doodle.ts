/** Ask the home page visibility owner to reveal the board. */
export function openDoodle() {
  window.history.pushState(null, '', '#doodle');
  window.dispatchEvent(new CustomEvent('portfolio:open-doodle'));
  window.dispatchEvent(new PopStateEvent('popstate'));
}
