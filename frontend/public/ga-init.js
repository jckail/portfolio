// Google Analytics is not loaded. This file remains so a cached page that
// still requests /ga-init.js cannot turn tracking back on, and so the
// unhashed script keeps its no-cache header. loadGoogleAnalytics is a no-op.
(function () {
  window.loadGoogleAnalytics = function () {};

  try {
    var parts = String(document.cookie || '').split(';');
    var expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    for (var i = 0; i < parts.length; i += 1) {
      var name = parts[i].split('=')[0].replace(/^\s+/, '');
      if (/^(_ga|_gid|_gat)/.test(name)) {
        document.cookie = name + '=; ' + expired;
      }
    }
  } catch (e) {
    // Cookie access can throw when storage is blocked.
  }
})();
