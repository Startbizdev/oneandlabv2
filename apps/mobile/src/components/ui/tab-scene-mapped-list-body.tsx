import React, { Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { FlatListProps, ListRenderItemInfo } from 'react-native';

function renderListHeader(
  ListHeaderComponent?: React.ComponentType<unknown> | ReactElement | null,
): ReactNode {
  if (!ListHeaderComponent) return null;
  if (isValidElement(ListHeaderComponent)) return ListHeaderComponent;
  const Header = ListHeaderComponent as React.ComponentType<unknown>;
  return <Header />;
}

function renderListPart<T>(part: FlatListProps<T>['ListEmptyComponent']): ReactNode {
  if (!part) return null;
  if (isValidElement(part)) return part;
  if (typeof part === 'function') {
    const Part = part as React.ComponentType<unknown>;
    return <Part />;
  }
  return part as ReactNode;
}

function renderSeparator<T>(Sep: FlatListProps<T>['ItemSeparatorComponent']): ReactNode {
  if (!Sep) return null;
  if (isValidElement(Sep)) return Sep;
  if (typeof Sep === 'function') {
    const Component = Sep as React.ComponentType<unknown>;
    return <Component />;
  }
  return null;
}

const SCROLL_SEPARATORS = {
  highlight: () => {},
  unhighlight: () => {},
  updateProps: () => {},
};

/** Corps de liste mappé — remplace FlashList / FlatList sur Android (NativeTabs). */
export function TabSceneMappedListBody<T>({
  items,
  renderItem,
  keyExtractor,
  ItemSeparatorComponent,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
}: {
  items: T[];
  renderItem?: FlatListProps<T>['renderItem'];
  keyExtractor?: FlatListProps<T>['keyExtractor'];
  ItemSeparatorComponent?: FlatListProps<T>['ItemSeparatorComponent'];
  ListHeaderComponent?: React.ComponentType<unknown> | ReactElement | null;
  ListEmptyComponent?: FlatListProps<T>['ListEmptyComponent'];
  ListFooterComponent?: FlatListProps<T>['ListFooterComponent'];
}) {
  const header = renderListHeader(ListHeaderComponent);
  const footer = renderListPart(ListFooterComponent);

  if (!renderItem) {
    return (
      <>
        {header}
        {footer}
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        {header}
        {renderListPart(ListEmptyComponent)}
        {footer}
      </>
    );
  }

  return (
    <>
      {header}
      {items.map((item, index) => {
        const key = keyExtractor?.(item, index) ?? String(index);
        const info: ListRenderItemInfo<T> = {
          item,
          index,
          separators: SCROLL_SEPARATORS,
          target: 'ScrollView',
        };
        return (
          <Fragment key={key}>
            {index > 0 ? renderSeparator(ItemSeparatorComponent) : null}
            {renderItem(info)}
          </Fragment>
        );
      })}
      {footer}
    </>
  );
}
