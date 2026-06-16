import { useState, useEffect, createContext, useContext, createElement } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────
export const ThemeContext = createContext(null);

// ── Helper: resolve the initial theme ─────────────────────────────────────────
function resolveInitialTheme() {
  try {
    const persisted = localStorage.getItem('dentflow-theme');
    if (persisted === 'dark' || persisted === 'light') return persisted;
  } catch {
    // localStorage unavailable (e.g. SSR / private-browsing restriction)
  }

  // Fall back to OS preference
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

// ── Helper: apply theme class to <html> and persist ───────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem('dentflow-theme', theme);
  } catch {
    // ignore write errors
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * useTheme
 *
 * Returns `{ theme, toggleTheme }`.
 *
 * - `theme`       — current theme: `'light'` | `'dark'`
 * - `toggleTheme` — flips the theme, updates the `dark` class on `<html>`,
 *                   and persists the choice to `localStorage`.
 *
 * Read the initial theme from `localStorage` key `dentflow-theme`.
 * Falls back to the OS `prefers-color-scheme` media query, then `'light'`.
 */
export function useTheme() {
  const [theme, setTheme] = useState(resolveInitialTheme);

  // Sync the <html> class on mount and whenever theme changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  return { theme, toggleTheme };
}

// ── Provider ──────────────────────────────────────────────────────────────────
/**
 * ThemeProvider
 *
 * Wrap your component tree with this to make the theme context available via
 * `useContext(ThemeContext)` or the convenience `useTheme()` hook (when called
 * inside the tree).
 *
 * Usage:
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 */
export function ThemeProvider({ children }) {
  const themeValue = useTheme();
  return createElement(ThemeContext.Provider, { value: themeValue }, children);
}
