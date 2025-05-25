import { useCallback, useRef, useState } from "react";

type EventType = React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>;

interface Options {
  shouldPreventDefault?: boolean;
  delay?: number;
}

type UseLongPressResult = {
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  onTouchStart: (e: React.TouchEvent<HTMLElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => void;
  onTouchEnd: (e: React.TouchEvent<HTMLElement>) => void;
};

const isTouchEvent = (event: EventType): event is React.TouchEvent<HTMLElement> =>
  "touches" in event;

const preventDefault = (event: EventType): void => {
  if (isTouchEvent(event) && event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};

const useLongPress = (
  onLongPress: (e: EventType) => void,
  onClick: () => void,
  { shouldPreventDefault = true, delay = 300 }: Options = {}
): UseLongPressResult => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = useRef<EventTarget | null>(null);

  const addPreventDefault = (el: EventTarget | null) => {
    if (shouldPreventDefault && el) {
      (el as HTMLElement).addEventListener("touchend", preventDefault as any, { passive: false });
      target.current = el;
    }
  };

  const removePreventDefault = () => {
    if (shouldPreventDefault && target.current) {
      (target.current as HTMLElement).removeEventListener("touchend", preventDefault as any);
    }
    target.current = null;
  };

  const start = useCallback(
    (event: EventType) => {
      addPreventDefault(event.target);
      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay]
  );

  const clear = useCallback(
    (_event: EventType, shouldTriggerClick = true) => {
      if (timeout.current) clearTimeout(timeout.current);
      if (shouldTriggerClick && !longPressTriggered) onClick();
      setLongPressTriggered(false);
      removePreventDefault();
    },
    [onClick, longPressTriggered]
  );

  const bindEvent = (handler: (e: EventType) => void) => handler;

  return {
    onMouseDown: bindEvent(start),
    onTouchStart: bindEvent(start),
    onMouseUp: bindEvent(clear),
    onMouseLeave: (e) => clear(e, false),
    onTouchEnd: bindEvent(clear),
  };
};

export default useLongPress;
