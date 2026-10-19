import { expect, it } from 'vitest';
import { cleanMemoryText } from '@/lib/admin-retention';
it('removes unsupported PDF NUL glyphs while preserving Hindi and valid emoji', () => {
  expect(cleanMemoryText('बल\u0000force 😀\uD800')).toBe('बलforce 😀\uFFFD');
});