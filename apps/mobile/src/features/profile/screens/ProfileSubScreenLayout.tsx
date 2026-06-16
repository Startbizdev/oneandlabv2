import type { AppColors } from '@/theme/colors';

import { useThemedStyles } from '@/theme/use-themed-styles';

import type { ReactNode } from 'react';

import { StyleSheet, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';

import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';

import {

  buildTabSceneScrollConfig,

  spreadTabSceneScrollProps,

  useTabSceneInsets,

} from '@/components/navigation/liquid-glass-header-inset';

import { StackChromeScreen } from '@/navigation/StackChromeScreen';

import { spacing } from '@/theme';



interface Props {

  children: ReactNode;

  saveTitle?: string;

  onSave?: () => void;

  saving?: boolean;

  hideSave?: boolean;

}



/** Écran secondaire profil : header glass flottant + formulaire scrollable. */

export function ProfileSubScreenLayout({

  children,

  saveTitle = 'Enregistrer',

  onSave,

  saving,

  hideSave,

}: Props) {

  const styles = useThemedStyles(buildStyles, 'features_profile_screens_ProfileSubScreenLayout_tsx_ProfileSubScreenLayout_styles');



  const { bottom } = useSafeAreaInsets();

  const sceneInsets = useTabSceneInsets();

  const bottomInset = Math.max(bottom, spacing[2]);

  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.content, {

    extraBottom: bottomInset + spacing[4],

  });

  const showSave = !hideSave && !!onSave;



  return (

    <StackChromeScreen>

      <KeyboardScrollView

        style={styles.scroll}

        {...spreadTabSceneScrollProps(scrollConfig)}

        contentContainerStyle={scrollConfig.contentContainerStyle}

        bottomOffset={bottomInset}

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={false}

      >

        {children}

        {showSave ? (

          <View style={styles.saveBlock}>

            <Button title={saveTitle} loading={saving} onPress={onSave} fullWidth size="lg" />

          </View>

        ) : null}

      </KeyboardScrollView>

    </StackChromeScreen>

  );

}



function buildStyles(c: AppColors) {

  return {

  scroll: {

    minWidth: 0,

    flex: 1,

  },

  content: {

    minWidth: 0,

    padding: spacing[4],

    gap: spacing[4],

    flexGrow: 1,

  },

  saveBlock: {

    marginTop: spacing[2],

    paddingTop: spacing[3],

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: c.borderLight,

  },

};

}

