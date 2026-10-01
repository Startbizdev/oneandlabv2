import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText, useStyles } from '@/theme';
import { buildBaseStyles } from './tutorial-illustration-base-styles';

export type PillTone = 'primary' | 'success' | 'warning';

export function IllustrationCanvas({ children }: { children: ReactNode }) {
  const styles = useStyles(buildBaseStyles);
  return (
    <View style={styles.canvas}>
      <View style={styles.canvasHaloWrap}>
        <View style={styles.canvasHalo} />
      </View>
      <View style={styles.canvasOrbLeft} />
      <View style={styles.canvasOrbRight} />
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function StatusPill({ label, tone = 'primary' }: { label: string; tone?: PillTone }) {
  const styles = useStyles(buildBaseStyles);
  const containerStyle =
    tone === 'success' ? styles.pillSuccess : tone === 'warning' ? styles.pillWarning : styles.pillPrimary;
  const textStyle =
    tone === 'success'
      ? styles.pillTextSuccess
      : tone === 'warning'
        ? styles.pillTextWarning
        : styles.pillTextPrimary;

  return (
    <View style={[styles.pill, containerStyle]}>
      <AppText style={[styles.pillText, textStyle]}>{label}</AppText>
    </View>
  );
}

function Avatar({ label, accent }: { label: string; accent?: boolean }) {
  const styles = useStyles(buildBaseStyles);
  return (
    <View style={[styles.avatar, accent && styles.avatarAccent]}>
      <AppText style={[styles.avatarText, accent && styles.textInverse]}>{label}</AppText>
    </View>
  );
}

export function FeatureRow({
  avatar,
  title,
  subtitle,
  pill,
  accent,
}: {
  avatar: string;
  title: string;
  subtitle: string;
  pill?: { label: string; tone?: PillTone };
  accent?: boolean;
}) {
  const styles = useStyles(buildBaseStyles);
  return (
    <View style={[styles.featureRow, accent && styles.featureRowAccent]}>
      <Avatar label={avatar} accent={accent} />
      <View style={styles.featureRowBody}>
        <AppText style={styles.titleSm} numberOfLines={1}>
          {title}
        </AppText>
        <AppText style={styles.subtitleXs} numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {pill ? <StatusPill label={pill.label} tone={pill.tone} /> : null}
    </View>
  );
}

export function ChatBubble({
  text,
  side,
  ai,
}: {
  text: string;
  side: 'left' | 'right';
  ai?: boolean;
}) {
  const styles = useStyles(buildBaseStyles);
  const isRight = side === 'right';
  return (
    <View style={[styles.bubbleWrap, isRight ? styles.alignEnd : styles.alignStart]}>
      {ai ? (
        <View style={styles.bubbleAiHeader}>
          <View style={styles.bubbleAiBadge}>
            <AppText style={styles.bubbleAiBadgeText}>C</AppText>
          </View>
          <AppText style={styles.captionPrimary}>Cary</AppText>
        </View>
      ) : null}
      <View style={[styles.bubble, isRight ? styles.bubbleRight : styles.bubbleLeft]}>
        <AppText style={[styles.bubbleText, isRight && styles.textInverse]}>{text}</AppText>
      </View>
    </View>
  );
}
