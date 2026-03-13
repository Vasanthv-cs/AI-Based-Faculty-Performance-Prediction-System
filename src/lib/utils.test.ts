import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (utils)', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'block')).toBe('base block');
  });
});
