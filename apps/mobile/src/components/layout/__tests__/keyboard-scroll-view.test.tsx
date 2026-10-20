import { createElement, createRef } from 'react';
import { Platform, ScrollView } from 'react-native';
import renderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { KeyboardScrollView } from '../KeyboardScrollView';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

const mockScrollTo = jest.fn();

jest.mock('react-native-keyboard-controller', () => {
  const { createElement: h, forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    KeyboardAwareScrollView: forwardRef((props: object, ref) => {
      useImperativeHandle(ref, () => ({ scrollTo: (...args: unknown[]) => mockScrollTo(...args) }));
      return h(RN.ScrollView, props);
    }),
  };
});

function mount(): ReactTestInstance {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(createElement(KeyboardScrollView, { ref: createRef<ScrollView>() }));
  });
  return tree.root.findByType(ScrollView);
}

/** Formulaire défilé de 300 dans une zone de 400 : le contenu passe de 700 à 500 (une option retirée). */
function shrinkWhileScrolled(scroll: ReactTestInstance) {
  act(() => {
    scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    scroll.props.onContentSizeChange(390, 700);
    scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 300 } } });
    scroll.props.onContentSizeChange(390, 500);
  });
}

afterEach(() => {
  mockScrollTo.mockClear();
  Platform.OS = 'ios';
});

describe('KeyboardScrollView', () => {
  it('iOS : ramène le scroll en bas du contenu quand celui-ci raccourcit (plus de vide ni de haut caché)', () => {
    Platform.OS = 'ios';
    shrinkWhileScrolled(mount());

    expect(mockScrollTo).toHaveBeenCalledWith({ y: 100, animated: false });
  });

  it('ne bouge pas un scroll déjà dans les limites', () => {
    Platform.OS = 'ios';
    const scroll = mount();
    act(() => {
      scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
      scroll.props.onScroll({ nativeEvent: { contentOffset: { y: 50 } } });
      scroll.props.onContentSizeChange(390, 500);
    });

    expect(mockScrollTo).not.toHaveBeenCalled();
  });

  it('Android : laisse faire la plateforme, qui ramène elle-même la position', () => {
    Platform.OS = 'android';
    shrinkWhileScrolled(mount());

    expect(mockScrollTo).not.toHaveBeenCalled();
  });
});
