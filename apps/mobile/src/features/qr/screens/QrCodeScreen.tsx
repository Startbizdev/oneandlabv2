import { layoutRow } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Link2, QrCode, Share2 } from 'lucide-react-native';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProfileSection } from '@/features/profile/components/ProfileSection';
import { downloadQrPngToCache, fetchQrMe, updateQrTagline } from '@/features/qr/api/qr.service';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { useAuthStore } from '@/store/auth-store';
import { elevation, radius, spacing, iconSize, useLayoutMetrics, AppText } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fontFamily, fontSize } from '@/theme/typography';

export function QrCodeScreen() {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles, 'features_qr_screens_QrCodeScreen_styles');
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: queryKeys.qr.me(userId),
    queryFn: fetchQrMe,
    enabled: Boolean(userId),
  });

  const [tagline, setTagline] = useState('');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [loadingPoster, setLoadingPoster] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data?.qr.marketing_tagline != null) {
      setTagline(q.data.qr.marketing_tagline ?? '');
    }
  }, [q.data?.qr.marketing_tagline]);

  const loadPoster = useCallback(async () => {
    setLoadingPoster(true);
    try {
      const uri = await downloadQrPngToCache(false);
      setPosterUri(uri);
    } catch {
      Alert.alert('Erreur', "Impossible de charger l'affiche QR.");
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
      await loadPoster();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const sharePoster = async () => {
    try {
      const uri = posterUri ?? (await downloadQrPngToCache(false));
      await Share.share({ url: uri, message: q.data?.qr.scan_url ?? '' });
    } catch {
      Alert.alert('Partage impossible');
    }
  };

  const downloadRaw = async () => {
    try {
      const uri = await downloadQrPngToCache(true);
      await Share.share({ url: uri });
    } catch {
      Alert.alert('Téléchargement impossible');
    }
  };

  const copyLink = async () => {
    const link = q.data?.qr.scan_url;
    if (!link) return;
    try {
      await Share.share({ message: link });
    } catch {
      Alert.alert('Copie impossible');
    }
  };

  const stats = q.data?.analytics.days_30;
  const scrollConfig = useStackScrollConfig(styles.scroll);

  return (
    <StackChromeScreen>
      <ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.posterCard, elevation.sm]}>
          {loadingPoster || q.isLoading ? (
            <View style={[styles.posterPlaceholder, { maxWidth: layout.contentMaxWidth }]}>
              <AppText style={styles.muted}>Génération de l'affiche…</AppText>
            </View>
          ) : posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={[styles.poster, { maxWidth: layout.contentMaxWidth }]}
              resizeMode="contain"
              accessibilityLabel="Affiche QR Cary"
            />
          ) : null}
        </View>

        {stats ? (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, elevation.xs]}>
              <AppText style={styles.statValue}>{stats.scans}</AppText>
              <AppText style={styles.statLabel}>Flashes</AppText>
              <AppText style={styles.statSub}>30 jours</AppText>
            </View>
            <View style={[styles.statCard, elevation.xs]}>
              <AppText style={styles.statValue}>{stats.visits}</AppText>
              <AppText style={styles.statLabel}>Visites</AppText>
              <AppText style={styles.statSub}>30 jours</AppText>
            </View>
            <View style={[styles.statCard, elevation.xs]}>
              <AppText style={styles.statValue}>{stats.conversions}</AppText>
              <AppText style={styles.statLabel}>RDV</AppText>
              <AppText style={styles.statSub}>30 jours</AppText>
            </View>
          </View>
        ) : null}

        <ProfileSection
          title="Votre message"
          description="Personnalisez l'accroche affichée sur votre affiche."
          Icon={QrCode}
        >
          <Input
            value={tagline}
            onChangeText={setTagline}
            placeholder="Ex. : Scannez pour réserver un rendez-vous avec moi"
            multiline
            numberOfLines={4}
            maxLength={120}
          />
          <AppText style={styles.counter}>{tagline.length}/120</AppText>
          <Button title="Enregistrer" onPress={() => void saveTagline()} loading={saving} fullWidth />
        </ProfileSection>

        <ProfileSection title="Partager" description="Téléchargez ou diffusez votre QR code.">
          <View style={styles.actions}>
            <Button
              title="Partager l'affiche"
              variant="primary"
              fullWidth
              leftIcon={<Share2 size={iconSize.mdSm} color={c.textInverse} strokeWidth={2} />}
              onPress={() => void sharePoster()}
            />
            <Button
              title="QR seul"
              variant="outline"
              fullWidth
              leftIcon={<Download size={iconSize.mdSm} color={c.primary} strokeWidth={2} />}
              onPress={() => void downloadRaw()}
            />
            <Button
              title="Copier le lien"
              variant="ghost"
              fullWidth
              leftIcon={<Link2 size={iconSize.mdSm} color={c.primary} strokeWidth={2} />}
              onPress={() => void copyLink()}
            />
          </View>
          {q.data?.qr.short_url ? (
            <AppText style={styles.shortUrl}>{q.data.qr.short_url}</AppText>
          ) : null}
        </ProfileSection>
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    scroll: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[12],
      gap: spacing[4],
    },
    posterCard: {
      borderRadius: radius.xl,
      backgroundColor: c.bookingCanvas,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
      alignItems: 'center' as const,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[2],
    },
    poster: {
      width: '100%' as const,
      aspectRatio: 1240 / 1754,
      backgroundColor: c.bookingCanvas,
    },
    posterPlaceholder: {
      width: '100%' as const,
      aspectRatio: 1240 / 1754,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.bookingCanvas,
    },
    statsRow: {
      ...layoutRow(spacing[2]),
    },
    statCard: {
      minWidth: 0,
      flex: 1,
      alignItems: 'center' as const,
      paddingVertical: spacing[4],
      paddingHorizontal: spacing[2],
      borderRadius: radius.xl,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
    },
    statValue: {
      fontSize: fontSize.xl,
      fontFamily: fontFamily.bold,
      color: c.primary,
    },
    statLabel: {
      marginTop: spacing[1],
      fontSize: fontSize.sm,
      fontFamily: fontFamily.semiBold,
      color: c.textPrimary,
    },
    statSub: {
      marginTop: 2,
      fontSize: fontSize.xs,
      fontFamily: fontFamily.regular,
      color: c.textSecondary,
    },
    counter: {
      fontSize: fontSize.xs,
      fontFamily: fontFamily.regular,
      color: c.textSecondary,
      textAlign: 'right' as const,
    },
    actions: {
      gap: spacing[2],
    },
    shortUrl: {
      marginTop: spacing[2],
      textAlign: 'center' as const,
      fontSize: fontSize.sm,
      fontFamily: fontFamily.regular,
      color: c.textSecondary,
    },
    muted: {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.regular,
      color: c.textSecondary,
    },
  };
}
