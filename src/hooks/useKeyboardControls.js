import { useEffect } from 'react';

export const useKeyboardControls = (onSpace) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if the pressed key is Space
      if (event.code === 'Space') {
        // Prevent page scrolling or slider interaction
        event.preventDefault();
        onSpace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSpace]);
};