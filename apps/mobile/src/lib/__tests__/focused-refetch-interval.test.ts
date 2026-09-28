import {
  focusedRefetchInterval,
  foregroundRefetchInterval,
  isAppStateForeground,
} from '../focused-refetch-interval';

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

describe('foregroundRefetchInterval', () => {
  it('polls whenever the app is in the foreground, without any screen focus', () => {
    expect(foregroundRefetchInterval(10_000, true)).toBe(10_000);
  });

  it('stops polling in background', () => {
    expect(foregroundRefetchInterval(10_000, false)).toBe(false);
  });
});

describe('isAppStateForeground', () => {
  it.each([
    ['active', true],
    ['unknown', true],
    [null, true],
    [undefined, true],
    ['background', false],
    ['inactive', false],
  ])('%s -> %s', (state, expected) => {
    expect(isAppStateForeground(state)).toBe(expected);
  });
});
