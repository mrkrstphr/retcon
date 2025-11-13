import { useEffect, useState } from 'react';

export function useFullScreenManager(ref: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    console.log('Toggling fullscreen');
    if (!ref.current) return;

    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      ref.current.requestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === ref.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [ref]);

  return { isFullscreen, toggleFullscreen };
}
