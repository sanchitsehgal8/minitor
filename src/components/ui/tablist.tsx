'use client';

import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';

/**
 * Keyboard behaviour for an ARIA tablist.
 *
 * `role="tab"` is a promise to assistive technology: arrow keys move between
 * tabs, Home/End jump to the ends, and only the selected tab is a tab stop so
 * Tab moves past the group rather than through every tab in it. The app
 * previously declared the role without any of that, which announces a pattern
 * to a screen-reader user that then does not respond — worse than plain
 * buttons. This supplies the missing half.
 *
 * Usage: spread `tabProps(index)` onto each tab button and put `tablistProps`
 * on their container.
 */
export function useRovingTablist(count: number, activeIndex: number, onSelect: (index: number) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusAt = useCallback((index: number) => {
    const next = ((index % count) + count) % count;
    refs.current[next]?.focus();
    onSelect(next);
  }, [count, onSelect]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusAt(index + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusAt(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusAt(0);
          break;
        case 'End':
          event.preventDefault();
          focusAt(count - 1);
          break;
        default:
          break;
      }
    },
    [count, focusAt],
  );

  const tabProps = useCallback(
    (index: number, id: string, panelId: string) => ({
      role: 'tab' as const,
      id,
      'aria-selected': index === activeIndex,
      'aria-controls': panelId,
      // Roving tabindex: one stop for the whole group.
      tabIndex: index === activeIndex ? 0 : -1,
      ref: (node: HTMLButtonElement | null) => {
        refs.current[index] = node;
      },
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => onKeyDown(event, index),
    }),
    [activeIndex, onKeyDown],
  );

  return { tabProps };
}

/** The panel half of the pattern, so a tab's `aria-controls` resolves. */
export function TabPanel({
  id,
  labelledBy,
  className,
  children,
}: {
  readonly id: string;
  readonly labelledBy: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div id={id} role="tabpanel" aria-labelledby={labelledBy} tabIndex={0} className={className}>
      {children}
    </div>
  );
}
