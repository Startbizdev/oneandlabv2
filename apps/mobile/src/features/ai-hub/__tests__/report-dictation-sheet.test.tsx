import type { ReactNode } from 'react';
import type { AiReport } from '@oneandlab/shared-types';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { dictateAiReport, updateAiReport, validateAiReport } from '../api/ai-reports.service';
import { CaryAiReportDictationSheet } from '../components/CaryAiReportDictationSheet';

jest.mock('@/components/ui/SheetModal', () => {
  const { createElement, Fragment } = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SheetModal: ({ subtitle, children, footer }: { subtitle?: string; children: ReactNode; footer?: ReactNode }) =>
      createElement(Fragment, null, createElement(Text, null, subtitle), children, footer),
  };
});

jest.mock('../hooks/use-device-speech-recognition', () => ({
  useDeviceSpeechRecognition: () => ({
    available: false,
    recognizing: false,
    interimTranscript: '',
    error: null,
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

jest.mock('../api/ai-reports.service', () => ({
  dictateAiReport: jest.fn(),
  updateAiReport: jest.fn(),
  validateAiReport: jest.fn(),
}));

const dictate = jest.mocked(dictateAiReport);
const update = jest.mocked(updateAiReport);
const validate = jest.mocked(validateAiReport);

function report(patch: Partial<AiReport> = {}): AiReport {
  return {
    id: 'r1',
    patient_id: 'p1',
    appointment_id: 'apt-1',
    report_type: 'nursing_note',
    status: 'draft',
    content_text: 'Prélèvement réalisé sans incident.',
    ...patch,
  };
}

function textOf(node: ReactTestInstance | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

function hasText(root: ReactTestInstance, text: string): boolean {
  return root.findAll((node) => typeof node.type === 'string' && textOf(node) === text).length > 0;
}

function button(root: ReactTestInstance, title: string): ReactTestInstance | undefined {
  return root.findAll((node) => node.props.title === title && typeof node.props.onPress === 'function')[0];
}

async function press(root: ReactTestInstance, title: string) {
  const target = button(root, title);
  if (!target) throw new Error(`Bouton « ${title} » absent`);
  await act(async () => {
    target.props.onPress();
  });
}

function field(root: ReactTestInstance, label: string): ReactTestInstance {
  const input = root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0];
  if (!input) throw new Error(`Champ « ${label} » absent`);
  return input;
}

async function type(root: ReactTestInstance, label: string, text: string) {
  await act(async () => {
    field(root, label).props.onChangeText(text);
  });
}

let tree: ReactTestRenderer | null = null;

async function renderSheet(onCreateTransmission?: (r: AiReport) => void): Promise<ReactTestInstance> {
  await act(async () => {
    tree = renderer.create(
      <CaryAiReportDictationSheet visible onClose={jest.fn()} patientId="p1" onCreateTransmission={onCreateTransmission} />,
    );
  });
  if (!tree) throw new Error('Rendu impossible');
  return tree.root;
}

async function generate(root: ReactTestInstance) {
  await type(root, 'Texte du compte rendu', 'prise de sang ok rien a signaler');
  await press(root, 'Générer le compte rendu');
}

beforeEach(() => {
  jest.clearAllMocks();
  dictate.mockResolvedValue(report());
});

afterEach(() => {
  act(() => tree?.unmount());
  tree = null;
});

describe('CaryAiReportDictationSheet', () => {
  it('saves the correction (PATCH) before validating, then offers a transmission with the validated text', async () => {
    update.mockResolvedValue(report({ content_text: 'Prélèvement réalisé, patient à jeun.' }));
    validate.mockResolvedValue(report({ status: 'validated', content_text: 'Prélèvement réalisé, patient à jeun.' }));
    const onCreateTransmission = jest.fn();
    const root = await renderSheet(onCreateTransmission);

    await generate(root);
    expect(field(root, 'Compte rendu à relire').props.value).toBe('Prélèvement réalisé sans incident.');
    await type(root, 'Compte rendu à relire', '  Prélèvement réalisé, patient à jeun.  ');
    await press(root, 'Valider le compte rendu');

    expect(update).toHaveBeenCalledWith('r1', 'Prélèvement réalisé, patient à jeun.');
    expect(validate).toHaveBeenCalledWith('r1');
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(validate.mock.invocationCallOrder[0] ?? 0);
    expect(hasText(root, 'Compte rendu validé.')).toBe(true);

    await press(root, 'Créer une transmission avec ce texte');
    expect(onCreateTransmission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1', status: 'validated', content_text: 'Prélèvement réalisé, patient à jeun.' }),
    );
  });

  it('validates without PATCH when the text was not changed', async () => {
    validate.mockResolvedValue(report({ status: 'validated' }));
    const root = await renderSheet(jest.fn());
    await generate(root);
    await press(root, 'Valider le compte rendu');
    expect(update).not.toHaveBeenCalled();
    expect(validate).toHaveBeenCalledWith('r1');
  });

  it('explains a 409 and stops offering correction or validation', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    validate.mockRejectedValue(new ApiRequestError('Déjà validé', 409, 'AI_REPORT_ALREADY_VALIDATED'));
    const root = await renderSheet(jest.fn());
    await generate(root);
    await press(root, 'Valider le compte rendu');

    expect(hasText(root, 'Ce compte rendu est déjà validé : il ne peut plus être modifié.')).toBe(true);
    expect(button(root, 'Valider le compte rendu')).toBeUndefined();
    expect(button(root, 'Terminer')).toBeDefined();
    warn.mockRestore();
  });

  it('offers no transmission when the screen does not allow it', async () => {
    validate.mockResolvedValue(report({ status: 'validated' }));
    const root = await renderSheet();
    await generate(root);
    await press(root, 'Valider le compte rendu');
    expect(button(root, 'Créer une transmission avec ce texte')).toBeUndefined();
    expect(button(root, 'Terminer')).toBeDefined();
  });
});
