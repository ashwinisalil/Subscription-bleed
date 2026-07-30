// Bleed — shared theme utility (dark/light).
// Loaded in <head> (not deferred) so the correct theme applies before
// first paint — avoids a flash of the wrong theme on page load.

(function () {
  const PREF_KEY = 'bleed_theme';

  function getTheme() {
    return localStorage.getItem(PREF_KEY) || 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function setTheme(theme) {
    localStorage.setItem(PREF_KEY, theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(next);
    return next;
  }

  // Apply immediately (script runs synchronously in <head>).
  applyTheme(getTheme());

  window.BleedTheme = { getTheme, setTheme, toggleTheme };

  // Wire up any button on the page with [data-theme-toggle] once the DOM
  // is ready — keeps every page's markup simple (just add the attribute).
  document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('[data-theme-toggle]');
    function paint() {
      const isLight = getTheme() === 'light';
      buttons.forEach((btn) => {
        btn.textContent = isLight ? '☀️' : '🌙';
        btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      });
    }
    paint();
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleTheme();
        paint();
      });
    });
  });
})();
