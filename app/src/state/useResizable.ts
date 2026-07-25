
import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizableOptions {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  direction?: 1 | -1;
}

interface Resizable {
  width: number;
  isResizing: boolean;
  handleProps: {
    onPointerDown: (event: React.PointerEvent) => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    onDoubleClick: () => void;
  };
  reset: () => void;
}

function readStored(key: string, fallback: number, min: number, max: number): number {
  const raw = localStorage.getItem(key);
  if (raw) {
    const value = Number(raw);
    if (Number.isFinite(value)) return Math.min(max, Math.max(min, value));
  }
  return fallback;
}

export function useResizable({ storageKey, defaultWidth, min, max, direction = 1 }: ResizableOptions): Resizable {
  const [width, setWidth] = useState(() => readStored(storageKey, defaultWidth, min, max));
  const [isResizing, setIsResizing] = useState(false);

  const dragState = useRef({ startX: 0, startWidth: 0 });

  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max]);

  const persist = useCallback(
    (value: number) => {
      localStorage.setItem(storageKey, String(Math.round(value)));
    },
    [storageKey],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      (event.target as Element).setPointerCapture(event.pointerId);
      dragState.current = { startX: event.clientX, startWidth: width };
      setIsResizing(true);
    },
    [width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: PointerEvent) => {
      const delta = (event.clientX - dragState.current.startX) * direction;
      setWidth(clamp(dragState.current.startWidth + delta));
    };
    const onUp = () => {
      setIsResizing(false);
      setWidth((current) => {
        persist(current);
        return current;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isResizing, clamp, direction, persist]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const step = event.shiftKey ? 32 : 12;
      let next: number | null = null;
      if (event.key === 'ArrowLeft') next = clamp(width - step * direction);
      else if (event.key === 'ArrowRight') next = clamp(width + step * direction);
      else if (event.key === 'Home') next = min;
      else if (event.key === 'End') next = max;
      if (next !== null) {
        event.preventDefault();
        setWidth(next);
        persist(next);
      }
    },
    [width, clamp, direction, min, max, persist],
  );

  const reset = useCallback(() => {
    setWidth(defaultWidth);
    persist(defaultWidth);
  }, [defaultWidth, persist]);

  return {
    width,
    isResizing,
    handleProps: { onPointerDown, onKeyDown, onDoubleClick: reset },
    reset,
  };
}
