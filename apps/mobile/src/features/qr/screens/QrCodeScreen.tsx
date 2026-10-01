import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Share, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, QrCode, Share2 } from 'lucide-react-native';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { downloadQrPngToCache, fetchQrMe, updateQrTagline } from '@/features/qr/api/qr.service';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import {
  H_PADDING,
  ICON_STROKE_WIDTH,
  radius,
  spacing,
  iconSize,
  useLayoutMetrics,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

const TAGLINE_MAX = 120;
const POSTER_RATIO = 1240 / 1754;

/** QR code du soignant : affiche à partager, accroche personnalisable, statistiques 30 jours. */
export function QrCodeScreen() {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const qc = useQueryClient();
  const { show: toast } = useToast();

  const q = useQuery({
    queryKey: queryKeys.qr.me(userId),
    queryFn: fetchQrMe,
    enabled: Boolean(userId),
  });

  const [tagline, setTagline] = useState('');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [posterError, setPosterError] = useState<unknown>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState<'poster' | 'raw' | null>(null);

  useEffect(() => {
    if (q.data?.qr.marketing_tagline != null) {
      setTagline(q.data.qr.marketing_tagline ?? '');
    }
  }, [q.data?.qr.marketing_tagline]);

  const loadPoster = useCallback(async () => {
    setLoadingPoster(true);
    setPosterError(null);
    try {
      setPosterUri(await downloadQrPngToCache(false));
    } catch (error) {
      setPosterError(error);
    } finally {
      setLoadingPoster(false);
    }
  }, []);

  useEffect(() => {
    if (q.data) void loadPoster();
  }, [q.data, loadPoster]);

  const saveTagline = async () => {
    setSaving(true);
    try {
      await updateQrTagline(tagline.trim() || null);
      await qc.invalidateQueries({ queryKey: queryKeys.qr.me(userId) });
      toast('Accroche enregistrée', { type: 'success' });
    } catch (error) {
      toast(getErrorMessage(error, 'Enregistrement impossible'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const shareImage = async (kind: 'poster' | 'raw') => {
    setSharing(kind);
    try {
      const uri = kind === 'poster' && posterUri ? posterUri : await downloadQrPngToCache(kind === 'raw');
      const res = await exportLocalFile(uri, kind === 'raw' ? 'cary-qr-code.png' : 'cary-affiche-qr.png');
      if (!res.ok) toast(res.error ?? 'Partage impossible', { type: 'error' });
    } catch (error) {
      toast(getErrorMessage(error, 'Partage impossible'), { type: 'error' });
    } finally {
      setSharing(null);
    }
  };

  const shareLink = async () => {
    const link = q.data?.qr.scan_url;
    if (!link) return;
    try {
      await Share.share({ message: link });
    } catch (error) {
      toast(getErrorMessage(error, 'Partage impossible'), { type: 'error' });
    }
  };

  if (q.isError && !q.data) {
    return (
      <StackChromeScreen>
        <View style={styles.errorWrap}>
          <ErrorState title="QR code indisponible" error={q.error} onRetry={() => void q.refetch()} />
        </View>
      </StackChromeScreen>
    );
  }

  const stats = q.data?.analytics.days_30;
  const savedTagline = (q.data?.qr.marketing_tagline ?? '').trim();
  const taglineChanged = tagline.trim() !== savedTagline;
  const posterMaxWidth = { maxWidth: layout.contentMaxWidth };
  const statItems = stats
    ? [
        { label: 'Scans', value: stats.scans },
        { label: 'Visites', value: stats.visits },
        { label: 'Rendez-vous', value: stats.conversions },
      ]
    : [];

  return (
    <StackChromeScreen>
      <SceneScrollView
        contentContainerStyle={styles.scroll}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
      >
        <View style={styles.posterCard}>
          {loadingPoster || q.isLoading ? (
            <View style={[styles.posterPlaceholder, posterMaxWidth]}>
              <ActivityIndicator color={c.primary} accessibilityLabel="Génération de l'affiche" />
            </View>
          ) : posterError ? (
            <View style={[styles.posterPlaceholder, posterMaxWidth]}>
              <ErrorState title="Affiche indisponible" error={posterError} onRetry={() => void loadPoster()} />
            </View>
          ) : posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={[styles.poster, posterMaxWidth]}
              resizeMode="contain"
              accessibilityLabel="Affiche QR Cary"
            />
          ) : null}
        </View>

        <View style={styles.shareActions}>
          <Button
            title="Partager l'affiche"
            fullWidth
            loading={sharing === 'poster'}
            disabled={sharing != null || !q.data}
            leftIcon={<Share2 size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
            onPress={() => void shareImage('poster')}
          />
          <View style={styles.secondaryRow}>
            <View style={styles.flexCell}>
              <Button
                title="QR code seul"
                variant="secondary"
                size="sm"
                fullWidth
                loading={sharing === 'raw'}
                disabled={sharing != null || !q.data}
                leftIcon={<QrCode size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
                onPress={() => void shareImage('raw')}
              />
            </View>
            <View style={styles.flexCell}>
              <Button
                title="Lien"
                variant="secondary"
                size="sm"
                fullWidth
                disabled={!q.data?.qr.scan_url}
                leftIcon={<Link2 size={iconSize.sm} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
                onPress={() => void shareLink()}
              />
            </View>
          </View>
          {q.data?.qr.short_url ? (
            <AppText variant="caption" style={styles.centered} selectable>
              {q.data.qr.short_url}
            </AppText>
          ) : null}
        </View>

        {statItems.length > 0 ? (
          <ProfileSection title="30 derniers jours">
            <View style={styles.statsRow}>
              {statItems.map((item) => (
                <View key={item.label} style={styles.statCell}>
                  <AppText style={styles.statValue}>{item.value}</AppText>
                  <AppText variant="caption" style={styles.centered}>
                    {item.label}
                  </AppText>
                </View>
              ))}
            </View>
          </ProfileSection>
        ) : null}

        <ProfileSection
          title="Votre accroche"
          description="Affichée sur votre affiche. Laissez vide pour garder l’accroche Cary."
        >
          <Input
            value={tagline}
            onChangeText={setTagline}
            placeholder={savedTagline ? undefined : q.data?.qr.effective_tagline}
            multiline
            numberOfLines={3}
            maxLength={TAGLINE_MAX}
            accessibilityLabel="Votre accroche"
          />
          <AppText variant="caption" style={styles.counter}>
            {tagline.length}/{TAGLINE_MAX}
          </AppText>
          <Button
            title="Enregistrer"
            variant="secondary"
            onPress={() => void saveTagline()}
            loading={saving}
            disabled={!taglineChanged}
            fullWidth
          />
        </ProfileSection>
      </SceneScrollView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    scroll: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[3],
      paddingBottom: spacing[12],
      gap: spacing[6],
    },
    errorWrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[3],
    },
    posterCard: {
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
      alignItems: 'center' as const,
      padding: spacing[3],
    },
    poster: {
      width: '100%' as const,
      aspectRatio: POSTER_RATIO,
    },
    posterPlaceholder: {
      width: '100%' as const,
      aspectRatio: POSTER_RATIO,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    shareActions: { gap: spacing[3] },
    secondaryRow: { flexDirection: 'row' as const, gap: spacing[2] },
    flexCell: { flex: 1, minWidth: 0 },
    centered: { textAlign: 'center' as const },
    statsRow: { flexDirection: 'row' as const, gap: spacing[2] },
    statCell: { flex: 1, minWidth: 0, alignItems: 'center' as const, gap: spacing[0.5] },
    statValue: {
      ...font.headingSemiBold,
      fontSize: fontSize.xl,
      color: c.textPrimary,
    },
    counter: { textAlign: 'right' as const },
  };
}
