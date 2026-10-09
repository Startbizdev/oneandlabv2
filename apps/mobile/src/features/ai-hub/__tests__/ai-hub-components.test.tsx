import type { ReactElement } from 'react';
import { ActionSheetIOS, Alert, Linking } from 'react-native';
import renderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { CaryAiEmergencyBanner, CaryAiEmergencyCard } from '../components/CaryAiEmergency';
import { CaryAiMessageBubble } from '../components/CaryAiMessageBubble';
import { PatientAiConversationRow } from '../components/PatientAiConversationRow';
import type { PatientAiConversation } from '../types/patient-ai-conversation';

function textOf(node: ReactTestInstance | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(textOf).join('');
}

/** Élément pressable dont le libellé (accessibilité, titre de bouton ou texte) correspond. */
function pressable(root: ReactTestInstance, label: string): ReactTestInstance {
  const match = root.findAll(
    (node) =>
      typeof node.props.onPress === 'function' &&
      (node.props.accessibilityLabel === label || node.props.title === label || textOf(node) === label),
  )[0];
  if (!match) throw new Error(`Aucun élément pressable « ${label} »`);
  return match;
}

function hasText(root: ReactTestInstance, text: string): boolean {
  return root.findAll((node) => typeof node.type === 'string' && textOf(node) === text).length > 0;
}

function render(element: ReactElement): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(element);
  });
  if (!tree) throw new Error('Rendu impossible');
  return tree;
}

async function press(root: ReactTestInstance, label: string) {
  await act(async () => {
    pressable(root, label).props.onPress();
  });
}

describe('emergency card and banner', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => openURL.mockRestore());

  it('shows the server instructions and dials each number with tel:', async () => {
    const tree = render(
      <CaryAiEmergencyCard
        emergency={{
          kind: 'emergency',
          title: 'Appelez les secours',
          body: 'Ne restez pas seul.',
          actions: [
            { label: 'Appeler le 15', phone: '15' },
            { label: 'Appeler le 3114', phone: '3114' },
          ],
        }}
      />,
    );
    expect(hasText(tree.root, 'Appelez les secours')).toBe(true);
    expect(hasText(tree.root, 'Ne restez pas seul.')).toBe(true);
    await press(tree.root, 'Appeler le 15');
    await press(tree.root, 'Appeler le 3114');
    expect(openURL.mock.calls).toEqual([['tel:15'], ['tel:3114']]);
  });

  it('shows an emergency answer once, in its card, without repeating it as text', () => {
    const emergency = {
      kind: 'emergency',
      title: 'Douleur thoracique : appelez le 15',
      body: 'Appelez immédiatement le 15.',
      actions: [{ label: 'Appeler le 15', phone: '15' }],
    };
    const tree = render(
      <CaryAiMessageBubble
        message={{ id: 'a1', role: 'assistant', text: `${emergency.title}\n\n${emergency.body}`, metadata: { emergency } }}
      />,
    );
    const titles = tree.root.findAll((node) => typeof node.type === 'string' && textOf(node) === emergency.title);
    expect(titles).toHaveLength(1);
  });

  it('keeps 15, 112 and 3114 one tap away, with 44 pt targets', async () => {
    const tree = render(<CaryAiEmergencyBanner />);
    for (const phone of ['15', '112', '3114']) {
      const pill = pressable(tree.root, `Appeler le ${phone}`);
      expect(pill.props.hitSlop).toBeGreaterThanOrEqual(6);
      await press(tree.root, `Appeler le ${phone}`);
    }
    expect(openURL.mock.calls).toEqual([['tel:15'], ['tel:112'], ['tel:3114']]);
  });
});

describe('PatientAiConversationRow (menu sur Android)', () => {
  const conversation: PatientAiConversation = {
    id: 'c1',
    title: 'Bilan sanguin',
    messages: [],
    createdAt: 0,
    updatedAt: 0,
  };
  let actionSheet: jest.SpyInstance;
  let alert: jest.SpyInstance;

  beforeEach(() => {
    actionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    expect(actionSheet).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    actionSheet.mockRestore();
    alert.mockRestore();
  });

  function renderRow(onAction: jest.Mock, onToggleMenu = jest.fn(), expanded = true) {
    const tree = render(
      <PatientAiConversationRow
        conversation={conversation}
        active={false}
        archived={false}
        expanded={expanded}
        onPress={jest.fn()}
        onToggleMenu={onToggleMenu}
        onAction={onAction}
      />,
    );
    return { tree, onToggleMenu };
  }

  it('opens the menu from the « … » button, without any iOS-only sheet or alert', async () => {
    const { tree, onToggleMenu } = renderRow(jest.fn(), jest.fn(), false);
    await press(tree.root, 'Actions pour Bilan sanguin');
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('lists rename, pin, archive, export and delete inline', () => {
    const { tree } = renderRow(jest.fn());
    for (const label of ['Renommer', 'Épingler', 'Archiver', 'Exporter', 'Supprimer']) {
      expect(pressable(tree.root, label)).toBeTruthy();
    }
  });

  it('asks for confirmation, then deletes and closes the menu', async () => {
    const onAction = jest.fn().mockResolvedValue(null);
    const { tree, onToggleMenu } = renderRow(onAction);
    await press(tree.root, 'Supprimer');
    expect(hasText(tree.root, 'Supprimer définitivement cette conversation ?')).toBe(true);
    expect(onAction).not.toHaveBeenCalled();
    await press(tree.root, 'Supprimer');
    expect(onAction).toHaveBeenCalledWith('delete', undefined);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('renames with the typed title', async () => {
    const onAction = jest.fn().mockResolvedValue(null);
    const { tree } = renderRow(onAction);
    await press(tree.root, 'Renommer');
    const input = tree.root.findAll((node) => node.props.accessibilityLabel === 'Nouveau titre' && node.props.onChangeText)[0];
    await act(async () => input?.props.onChangeText('Prise de sang mars'));
    await press(tree.root, 'Enregistrer');
    expect(onAction).toHaveBeenCalledWith('rename', 'Prise de sang mars');
  });

  it('shows the failure under the row and keeps the menu open', async () => {
    const onAction = jest.fn().mockResolvedValue('Export impossible. Réessayez.');
    const { tree, onToggleMenu } = renderRow(onAction);
    await press(tree.root, 'Exporter');
    expect(onAction).toHaveBeenCalledWith('export', undefined);
    expect(hasText(tree.root, 'Export impossible. Réessayez.')).toBe(true);
    expect(onToggleMenu).not.toHaveBeenCalled();
  });
});
