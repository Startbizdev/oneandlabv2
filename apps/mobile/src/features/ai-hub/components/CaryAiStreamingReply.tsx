import type { AiEmergency } from '@oneandlab/shared-types';
import { View } from 'react-native';
import { AppText, spacing, useStyles } from '@/theme';
import { assistantMessageDisplayText } from '../utils/ai-message-display';
import { resolveAssistantMessageText } from '../utils/resolve-assistant-message-text';
import { CaryAiEmergencyCard } from './CaryAiEmergency';
import { CaryMarkdown } from './CaryMarkdown';

interface Props {
  text: string;
  emergency: AiEmergency | null;
  disclaimer?: string;
}

/** Réponse de Cary en cours d'écriture (flux), précédée de la carte d'urgence si le serveur l'a signalée. */
export function CaryAiStreamingReply({ text, emergency, disclaimer }: Props) {
  const styles = useStyles(buildStyles);
  const visible = text ? assistantMessageDisplayText(resolveAssistantMessageText('', text), disclaimer) : '';
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      {emergency ? <CaryAiEmergencyCard emergency={emergency} /> : null}
      {visible ? (
        <CaryMarkdown text={visible} />
      ) : emergency ? null : (
        <AppText variant="secondary">Cary réfléchit…</AppText>
      )}
    </View>
  );
}

function buildStyles() {
  return { wrap: { paddingTop: spacing[3], gap: spacing[3] } };
}
