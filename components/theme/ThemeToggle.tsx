"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      title={isDark ? "浅色模式" : "深色模式"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            fill="currentColor"
            d="M12 4.5a1 1 0 0 1 1 1V7a1 1 0 1 1-2 0V5.5a1 1 0 0 1 1-1Zm0 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.5-2.5a1 1 0 1 1 0-2H21a1 1 0 1 1 0 2h-1.5ZM3 12a1 1 0 0 1 1-1h1.5a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm13.95 5.36a1 1 0 0 1 1.41 0l1.06 1.06a1 1 0 1 1-1.41 1.41l-1.06-1.06a1 1 0 0 1 0-1.41ZM4.58 4.58a1 1 0 0 1 1.41 0L7.05 5.64A1 1 0 1 1 5.64 7.05L4.58 5.99a1 1 0 0 1 0-1.41Zm0 14.84 1.06-1.06A1 1 0 0 1 7.05 19.77l-1.06 1.06a1 1 0 1 1-1.41-1.41Zm14.84-14.84a1 1 0 0 1 0 1.41L18.36 7.05A1 1 0 1 1 16.95 5.64l1.06-1.06a1 1 0 0 1 1.41 0ZM12 17a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
          <path
            fill="currentColor"
            d="M14.6 3.2a1 1 0 0 1 1.15 1.32A7.5 7.5 0 1 0 19.48 14a1 1 0 0 1 1.32 1.15A9.5 9.5 0 1 1 13.28 2.88a1 1 0 0 1 1.32.32Z"
          />
        </svg>
      )}
      <span className="hidden sm:inline">{isDark ? "浅色" : "深色"}</span>
    </button>
  );
}
