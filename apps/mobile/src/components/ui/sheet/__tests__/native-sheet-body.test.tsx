import { createElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import renderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { sheetScreenOptions } from '@/navigation/screen-options';
import { buildTheme } from '@/theme/theme';
import { removeSheet, upsertSheet, type SheetEntry } from '../sheet-store';
import { NativeSheetBody } from '../NativeSheetBody';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-native-keyboard-controller', () => {
  const { createElement: h, forwardRef } = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    KeyboardAwareScrollView: forwardRef((props: object, ref) => h(RN.ScrollView, { ...props, ref })),
    KeyboardStickyView: (props: object) => h(RN.View, { ...props, testID: 'keyboard-sticky' }),
  };
});

function entry(patch: Partial<SheetEntry>): SheetEntry {
  return {
    title: 'Nouveau patient',
    content: createElement(Text, null, 'Formulaire'),
    footer: createElement(Text, { testID: 'footer-action' }, 'Créer'),
    disableScroll: false,
    dismissible: true,
    detents: [0.92],
    closeRequested: false,
    onRemoved: () => {},
    ...patch,
  };
}

function render(e: SheetEntry): ReactTestInstance {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(createElement(NativeSheetBody, { entry: e }));
  });
  return tree.root;
}

function footer(root: ReactTestInstance): ReactTestInstance {
  return root.find((n) => n.props.testID === 'footer-action' && typeof n.type === 'string');
}

function isInside(node: ReactTestInstance, ancestorType: unknown): boolean {
  for (let p = node.parent; p; p = p.parent) if (p.type === ancestorType) return true;
  return false;
}

describe('NativeSheetBody', () => {
  it('palier fixe : colonne non aplatie qui remplit la sheet, pied hors du scroll', () => {
    const root = render(entry({ detents: [0.92] }));

    // Un seul enfant direct : iOS ne voit pas le ScrollView et ne force pas sa hauteur (qui poussait le pied hors écran).
    expect(root.children).toHaveLength(1);
    const column = root.children[0] as ReactTestInstance;
    expect(column.type).toBe(View);
    expect(column.props.collapsable).toBe(false);
    expect(StyleSheet.flatten(column.props.style)).toMatchObject({ flex: 1 });
    expect(isInside(footer(root), ScrollView)).toBe(false);
  });

  it('palier fixe sur iOS : le pied suit le clavier', () => {
    const root = render(entry({ detents: [0.92] }));

    expect(root.findAll((n) => n.props.testID === 'keyboard-sticky' && typeof n.type === 'string')).toHaveLength(1);
  });

  it('ajustée au contenu : pied toujours visible hors du scroll, scroll borné', () => {
    const root = render(entry({ detents: 'fitToContents' }));
    const scroll = root.findByType(ScrollView);

    expect(root.children).toHaveLength(1);
    expect(isInside(footer(root), ScrollView)).toBe(false);
    expect(StyleSheet.flatten(scroll.props.style).maxHeight).toBeGreaterThan(0);
    expect(root.findAll((n) => n.props.testID === 'keyboard-sticky' && typeof n.type === 'string')).toHaveLength(0);
  });

  it('sans pied, rien n’est rendu sous le contenu', () => {
    const root = render(entry({ footer: undefined }));

    expect(root.findAll((n) => n.props.testID === 'footer-action')).toHaveLength(0);
  });
});

describe('sheetScreenOptions', () => {
  const theme = buildTheme('off', 'normal');

  afterEach(() => removeSheet('s1'));

  it('palier fixe : conteneur ancré en bas pour que la colonne ait la hauteur de la sheet', () => {
    upsertSheet('s1', entry({ detents: [0.92] }));

    expect(sheetScreenOptions(theme, { id: 's1' }).contentStyle).toMatchObject({ flex: 1, bottom: 0 });
  });

  it('ajustée au contenu : pas de flex (la hauteur vient du contenu)', () => {
    upsertSheet('s1', entry({ detents: 'fitToContents' }));
    const style = sheetScreenOptions(theme, { id: 's1' }).contentStyle as object;

    expect(style).not.toHaveProperty('flex');
    expect(style).not.toHaveProperty('bottom');
  });
});
