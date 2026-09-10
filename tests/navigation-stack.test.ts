import { describe, expect, it } from 'vitest';

import {
  back,
  canGoBack,
  canGoForward,
  createStack,
  current,
  forward,
  push,
} from '@/lib/browser/navigation-stack';

describe('navigation stack', () => {
  it('starts empty with no history in either direction', () => {
    const stack = createStack();
    expect(current(stack)).toBeNull();
    expect(canGoBack(stack)).toBe(false);
    expect(canGoForward(stack)).toBe(false);
  });

  it('moves back and forward across pushed entries', () => {
    let stack = push(push(createStack(), 'https://a.test/'), 'https://b.test/');
    expect(current(stack)).toBe('https://b.test/');

    stack = back(stack);
    expect(current(stack)).toBe('https://a.test/');
    expect(canGoForward(stack)).toBe(true);

    stack = forward(stack);
    expect(current(stack)).toBe('https://b.test/');
  });

  it('truncates forward history when navigating after going back', () => {
    let stack = push(push(push(createStack(), 'a'), 'b'), 'c');
    stack = back(back(stack));
    expect(current(stack)).toBe('a');

    stack = push(stack, 'd');
    expect(stack.entries).toEqual(['a', 'd']);
    expect(canGoForward(stack)).toBe(false);
  });

  it('ignores a push of the page already showing', () => {
    const stack = push(createStack('a'), 'a');
    expect(stack.entries).toEqual(['a']);
  });

  it('is a no-op at either end', () => {
    const stack = createStack('only');
    expect(back(stack)).toBe(stack);
    expect(forward(stack)).toBe(stack);
  });
});
