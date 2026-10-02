import {
  getSheet,
  removeSheet,
  requestSheetClose,
  sheetRemovalOutcome,
  snapPointsToDetents,
  upsertSheet,
  useSheetStore,
  type SheetEntry,
} from '../../components/ui/sheet/sheet-store';

function entry(overrides: Partial<Omit<SheetEntry, 'closeRequested'>> = {}): Omit<SheetEntry, 'closeRequested'> {
  return {
    title: 'Titre',
    content: null,
    disableScroll: false,
    dismissible: true,
    detents: 'fitToContents',
    onRemoved: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  useSheetStore.setState({ entries: {} });
});

describe('snapPointsToDetents', () => {
  it('fits to contents without snap points', () => {
    expect(snapPointsToDetents(undefined, 800)).toBe('fitToContents');
    expect(snapPointsToDetents([], 800)).toBe('fitToContents');
  });

  it('converts percentages and pixels to sorted screen fractions', () => {
    expect(snapPointsToDetents(['92%'], 800)).toEqual([0.92]);
    expect(snapPointsToDetents([400, '25%'], 800)).toEqual([0.25, 0.5]);
  });

  it('clamps values to the screen', () => {
    expect(snapPointsToDetents([1200, '-10%'], 800)).toEqual([0, 1]);
  });
});

describe('sheet store', () => {
  it('publishes an entry that is not closing', () => {
    upsertSheet('a', entry({ title: 'Choisir' }));
    expect(getSheet('a')).toMatchObject({ title: 'Choisir', closeRequested: false });
  });

  it('updates the content but keeps the detents of the presented sheet', () => {
    upsertSheet('a', entry({ detents: [0.8] }));
    upsertSheet('a', entry({ title: 'Modifier', detents: [0.9] }));
    expect(getSheet('a')).toMatchObject({ title: 'Modifier', detents: [0.8] });
  });

  it('keeps a pending close request when the parent re-renders', () => {
    upsertSheet('a', entry());
    requestSheetClose('a');
    upsertSheet('a', entry({ title: 'Re-rendu' }));
    expect(getSheet('a')?.closeRequested).toBe(true);
  });

  it('ignores a close request for an unknown sheet', () => {
    requestSheetClose('absente');
    expect(useSheetStore.getState().entries).toEqual({});
  });

  it('only touches the targeted entry', () => {
    upsertSheet('a', entry());
    upsertSheet('b', entry());
    const b = getSheet('b');
    requestSheetClose('a');
    expect(getSheet('b')).toBe(b);
  });

  it('removes an entry and allows a fresh presentation with the same id', () => {
    upsertSheet('a', entry({ detents: [0.8] }));
    requestSheetClose('a');
    removeSheet('a');
    expect(getSheet('a')).toBeUndefined();

    upsertSheet('a', entry({ detents: [0.5] }));
    expect(getSheet('a')).toMatchObject({ detents: [0.5], closeRequested: false });
  });
});

describe('sheetRemovalOutcome', () => {
  it('notifies onDismissed when the parent closed the sheet', () => {
    expect(sheetRemovalOutcome(true, false)).toBe('dismissed');
  });

  it('notifies onClose when the sheet was dismissed by gesture or back while still visible', () => {
    expect(sheetRemovalOutcome(false, true)).toBe('closed');
  });

  it('does not call onClose twice when the parent already hid the sheet', () => {
    expect(sheetRemovalOutcome(false, false)).toBe('dismissed');
  });

  it('presents the sheet again when the parent reopened it during the closing animation', () => {
    expect(sheetRemovalOutcome(true, true)).toBe('reopen');
  });
});
