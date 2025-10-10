import { useState, useEffect } from "react";

interface UseCounterAnimationOptions {
  target: number;
  duration?: number;
  delay?: number;
  enabled?: boolean;
}

export function useCounterAnimation({
  target,
  duration = 2000,
  delay = 0,
  enabled = true,
}: UseCounterAnimationOptions) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!enabled || target === 0) {
      setCount(target);
      return;
    }

    const startAnimation = () => {
      setIsAnimating(true);
      const startTime = Date.now();
      const startValue = 0;
      const endValue = target;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);

        setCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(endValue);
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);
    return () => clearTimeout(timeoutId);
  }, [target, duration, delay, enabled]);

  return { count, isAnimating };
}
