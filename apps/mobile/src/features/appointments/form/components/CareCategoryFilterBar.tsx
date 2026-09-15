import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/theme';
import type { CareFilterTab } from '../utils/booking-care-catalog';

interface Props {
  tabs: CareFilterTab[];
  value: string;
  onChange: (value: string) => void;
}

/** Compact filters; keep the selected category visible when the selection resets. */
export function CareCategoryFilterBar({ tabs, value, onChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  useEffect(() => {
    const x = positions.current[value];
    if (x != null) scrollRef.current?.scrollTo({ x: Math.max(0, x - spacing[4]), animated: false });
  }, [value]);

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator accessibilityLabel="Catégories de soins">
      <Row gap={spacing[2]}>
        {tabs.map(tab => (
          <View key={tab.value} onLayout={event => {
            positions.current[tab.value] = event.nativeEvent.layout.x;
          }}>
            <Button
              title={tab.label}
              size="sm"
              variant={value === tab.value ? 'primary' : 'outline'}
              accessibilityLabel={`Filtrer par ${tab.label}`}
              accessibilityState={{ selected: value === tab.value }}
              onPress={() => onChange(value === tab.value ? 'all' : tab.value)}
            />
          </View>
        ))}
      </Row>
    </ScrollView>
  );
}
