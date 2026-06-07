import { useEffect } from 'react';

export function useOutsideClickDetector({
  onClickOutside,
  ref,
}: {
  onClickOutside: () => void;
  ref: React.RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside?.();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return null;
}
