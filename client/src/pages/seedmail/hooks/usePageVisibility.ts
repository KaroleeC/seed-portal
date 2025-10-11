import { useState, useEffect } from "react";

/**
 * Hook to track page visibility and focus state
 *
 * Returns:
 * - isVisible: Page is visible (not hidden/minimized)
 * - isFocused: Page has focus (user is actively interacting)
 * - isActive: Page is both visible AND focused
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [isFocused, setIsFocused] = useState(document.hasFocus());

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    // Page Visibility API
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Focus events
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return {
    isVisible,
    isFocused,
    isActive: isVisible && isFocused,
  };
}
