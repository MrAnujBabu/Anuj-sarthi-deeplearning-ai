import { describe, expect, it } from 'vitest';
import { readableMemoryText, retainedFilePath } from '@/lib/admin-retention';

describe('admin text-only document retention', () => {
  it('does not retain the original by default', () => {
    expect(retainedFilePath('content-pdf', false)).toBeNull();
  });
  it('retains the original only when explicitly selected', () => {
    expect(retainedFilePath('content-pdf', true)).toBe('content-pdf');
  });
  it('refuses empty extraction rather than saving unread memory', () => {
    expect(() => readableMemoryText(' \n ')).toThrow('Document read nahi hua');
    expect(() => readableMemoryText(null)).toThrow();
    expect(readableMemoryText(' Question: What is inertia? ')).toBe('Question: What is inertia?');
  });
});