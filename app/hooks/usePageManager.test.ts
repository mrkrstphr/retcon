// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageManager } from './usePageManager.js';

describe('usePageManager', () => {
  describe('normal resume', () => {
    it('starts at the saved page when in bounds', () => {
      const { result } = renderHook(() => usePageManager({ pageCount: 10, currentPage: 5 }));
      expect(result.current.pageNumber).toBe(5);
    });

    it('starts at page 1 when no saved page', () => {
      const { result } = renderHook(() => usePageManager({ pageCount: 10, currentPage: null }));
      expect(result.current.pageNumber).toBe(1);
    });

    it('starts at page 1 when currentPage is undefined', () => {
      const { result } = renderHook(() => usePageManager({ pageCount: 10 }));
      expect(result.current.pageNumber).toBe(1);
    });
  });

  describe('boundary clamping', () => {
    it('resets to page 1 when saved page equals pageCount (completed comic)', () => {
      // A comic finished to the last page restarts from the beginning next session.
      const { result } = renderHook(() => usePageManager({ pageCount: 10, currentPage: 10 }));
      expect(result.current.pageNumber).toBe(1);
    });

    it('resets to page 1 when saved page exceeds pageCount (pages were deleted)', () => {
      const { result } = renderHook(() => usePageManager({ pageCount: 8, currentPage: 10 }));
      expect(result.current.pageNumber).toBe(1);
    });

    it('does not reset when saved page is one before the last', () => {
      const { result } = renderHook(() => usePageManager({ pageCount: 10, currentPage: 9 }));
      expect(result.current.pageNumber).toBe(9);
    });
  });
});
