import type { ReactNode } from 'react';
import { StackHeaderInsetProvider } from '@/components/navigation/liquid-glass-header-inset';

/** Provider insets header stack — à placer autour du `<Stack>` dans les layouts. */
export function StackSceneInsetLayout({ children }: { children: ReactNode }) {
  return <StackHeaderInsetProvider>{children}</StackHeaderInsetProvider>;
}
