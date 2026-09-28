import { focusedRefetchInterval } from '../focused-refetch-interval';

describe('focusedRefetchInterval', () => {
  it('returns interval when screen is focused and app is active', () => {
    expect(focusedRefetchInterval(5000, true, true)).toBe(5000);
  });

  it('returns false when screen is not focused', () => {
    expect(focusedRefetchInterval(5000, false, true)).toBe(false);
  });

  it('returns false when app is in background', () => {
    expect(focusedRefetchInterval(5000, true, false)).toBe(false);
  });
});
