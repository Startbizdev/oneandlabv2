import type { ReactNode } from 'react';
import renderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { dictate } from '../api/assistant.service';
import { DictationSheet } from '../components/DictationSheet';

jest.mock('@/components/ui/SheetModal', () => {
  const { createElement, Fragment } = jest.requireActual<typeof import('react')>('react');
  return {
    SheetModal: ({ children, footer }: { children: ReactNode; footer?: ReactNode }) =>
      createElement(Fragment, null, children, footer),
  };
});

jest.mock('@/lib/speech/use-device-speech-recognition', () => ({
  useDeviceSpeechRecognition: () => ({
    available: false,
    recognizing: false,
    interimTranscript: '',
    error: null,
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock('../api/assistant.service', () => ({ dictate: jest.fn() }));

const dictateMock = jest.mocked(dictate);

function find(root: ReactTestInstance, predicate: (props: Record<string, unknown>) => boolean): ReactTestInstance {
  const node = root.findAll((n) => predicate(n.props))[0];
  if (!node) throw new Error('Élément absent');
  return node;
}

const press = (root: ReactTestInstance, title: string) =>
  act(async () => {
    (find(root, (p) => p.title === title && typeof p.onPress === 'function').props.onPress as () => void)();
  });

const type = (root: ReactTestInstance, label: string, text: string) =>
  act(async () => {
    (find(root, (p) => p.accessibilityLabel === label && typeof p.onChangeText === 'function').props.onChangeText as (t: string) => void)(text);
  });

describe('DictationSheet', () => {
  it('dictée mise en forme, relue, puis transmission préremplie', async () => {
    dictateMock.mockResolvedValue('Pansement refait. Plaie propre.');
    const onCreate = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <DictationSheet visible onClose={jest.fn()} patientId="p1" appointmentId="a1" onCreateTransmission={onCreate} />,
      );
    });
    const root = tree?.root;
    if (!root) throw new Error('Rendu impossible');

    await type(root, 'Texte dicté', 'pansement refait plaie propre');
    await press(root, 'Mettre en forme');
    expect(dictateMock).toHaveBeenCalledWith({ transcript: 'pansement refait plaie propre', patient_id: 'p1', appointment_id: 'a1' });

    await type(root, 'Texte de la transmission', 'Pansement refait. Plaie propre et sèche.');
    await press(root, 'Créer une transmission');
    expect(onCreate).toHaveBeenCalledWith({ body: 'Pansement refait. Plaie propre et sèche.', appointmentId: 'a1' });
    act(() => tree?.unmount());
  });

  it('échec du serveur : message lisible, la dictée reste modifiable', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    dictateMock.mockRejectedValue(new Error('boom'));
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<DictationSheet visible onClose={jest.fn()} patientId="p1" onCreateTransmission={jest.fn()} />);
    });
    const root = tree?.root;
    if (!root) throw new Error('Rendu impossible');
    await type(root, 'Texte dicté', 'observations');
    await press(root, 'Mettre en forme');
    expect(root.findAll((n) => n.props.accessibilityRole === 'alert').length).toBeGreaterThan(0);
    expect(find(root, (p) => p.accessibilityLabel === 'Texte dicté').props.value).toBe('observations');
    act(() => tree?.unmount());
    warn.mockRestore();
  });
});
