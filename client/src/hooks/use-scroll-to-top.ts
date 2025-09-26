import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Hook to scroll to top of page when route changes
 */
export function useScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
}
