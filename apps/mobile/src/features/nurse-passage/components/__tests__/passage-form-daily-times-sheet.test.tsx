import { createElement, type ReactNode } from 'react';
import renderer, { act, type ReactTestInstance } from 'react-test-renderer';
import type { PassageDailyTimeSlot } from '@oneandlab/shared-types';
import { PassageFormDailyTimesSheet } from '../PassageFormDailyTimesSheet';

jest.mock('@/components/ui/SheetModal', () => {
  const { createElement: h, Fragment } = jest.requireActual<typeof import('react')>('react');
  return {
    SheetModal: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) => h(Fragment, null, children, footer),
  };
});

/** Sélecteur d'heure qui garde l'heure reçue à son montage, comme l'état interne du vrai sélecteur. */
jest.mock('../PassageTimePicker', () => {
  const { createElement: h, useState } = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PassageTimePicker: ({ value }: { value: string }) => {
      const [mountedWith] = useState(value);
      return h(Text, { testID: 'time-picker' }, mountedWith);
    },
  };
});

const SLOTS: PassageDailyTimeSlot[] = [
  { time_slot: 'custom', custom_time: '08:00' },
  { time_slot: 'custom', custom_time: '14:00' },
  { time_slot: 'custom', custom_time: '18:00' },
];

function pickerTimes(root: ReactTestInstance): string[] {
  return root.findAll((n) => n.props.testID === 'time-picker' && typeof n.type !== 'string').map((n) => {
    const text = n.findByType(jest.requireActual('react-native').Text);
    return String(text.props.children);
  });
}

function removeButtons(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll(
    (n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Retirer') && typeof n.props.onPress === 'function',
  );
}

describe('PassageFormDailyTimesSheet', () => {
  it('retirer un créneau au milieu garde les bonnes heures sur les créneaux suivants', () => {
    const onConfirm = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        createElement(PassageFormDailyTimesSheet, { visible: true, slots: SLOTS, onClose: jest.fn(), onConfirm }),
      );
    });
    expect(pickerTimes(tree.root)).toEqual(['08:00', '14:00', '18:00']);

    const middle = removeButtons(tree.root)[1];
    act(() => middle.props.onPress());

    expect(pickerTimes(tree.root)).toEqual(['08:00', '18:00']);
  });

  it('valide des créneaux sans clé locale', () => {
    const onConfirm = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        createElement(PassageFormDailyTimesSheet, { visible: true, slots: SLOTS, onClose: jest.fn(), onConfirm }),
      );
    });

    const validate = tree.root.findAll((n) => n.props.title === 'Valider' && typeof n.props.onPress === 'function')[0];
    act(() => validate.props.onPress());

    const confirmed = onConfirm.mock.calls[0][0] as Record<string, unknown>[];
    expect(confirmed.map((slot) => slot.custom_time)).toEqual(['08:00', '14:00', '18:00']);
    for (const slot of confirmed) expect(Object.keys(slot).sort()).toEqual(['custom_time', 'time_slot']);
  });
});
