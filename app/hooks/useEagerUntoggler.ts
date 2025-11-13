import { useEffect, useRef, useState } from 'react';

export const useEagerUntoggler = (
  defaultValue: boolean,
  delay: number = 1000,
) => {
  const [isToggled, setIsToggled] = useState(defaultValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isToggled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setIsToggled(false);
      }, delay);
    } else if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isToggled, delay]);

  return [isToggled, setIsToggled] as const;
};
