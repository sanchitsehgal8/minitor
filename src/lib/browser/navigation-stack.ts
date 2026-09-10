/**
 * Per-tab back/forward stack.
 *
 * The spec (§6) requires owning this rather than delegating to
 * `window.history`, because a parent page cannot observe navigation inside a
 * cross-origin iframe — no load events it can trust, no readable location. So
 * the shell records intent (what it asked the frame to load) instead of trying
 * to read outcome.
 *
 * Pure data + pure transitions: every function returns a new stack, which makes
 * the whole model unit-testable with no React involved.
 */

export type NavigationStack = {
  readonly entries: readonly string[];
  readonly index: number;
};

export function createStack(initial?: string): NavigationStack {
  return initial ? { entries: [initial], index: 0 } : { entries: [], index: -1 };
}

export function current(stack: NavigationStack): string | null {
  return stack.entries[stack.index] ?? null;
}

export function canGoBack(stack: NavigationStack): boolean {
  return stack.index > 0;
}

export function canGoForward(stack: NavigationStack): boolean {
  return stack.index >= 0 && stack.index < stack.entries.length - 1;
}

/**
 * Pushes a new entry, truncating any forward history — the same behaviour a
 * real browser has when you navigate after going back.
 */
export function push(stack: NavigationStack, href: string): NavigationStack {
  if (current(stack) === href) return stack;
  const kept = stack.entries.slice(0, stack.index + 1);
  return { entries: [...kept, href], index: kept.length };
}

export function back(stack: NavigationStack): NavigationStack {
  return canGoBack(stack) ? { ...stack, index: stack.index - 1 } : stack;
}

export function forward(stack: NavigationStack): NavigationStack {
  return canGoForward(stack) ? { ...stack, index: stack.index + 1 } : stack;
}
