import { useQuery } from '@tanstack/react-query';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { LabPreferenceMode } from '@oneandlab/shared-types';
import { fetchPublicLabBrands } from '@/features/appointments/api/lab-brands.service';
import { queryKeys } from '@/lib/query-keys';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  mode: LabPreferenceMode | '';
  brandId: string | null;
  onModeChange: (mode: LabPreferenceMode) => void;
  onBrandChange: (brandId: string | null) => void;
  validationError?: string;
};

export function LabBrandPreferenceStep({
  mode,
  brandId,
  onModeChange,
  onBrandChange,
  validationError,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'LabBrandPreferenceStep');
  const selectedMode = mode || 'platform_match';

  const brandsQ = useQuery({
    queryKey: queryKeys.labBrands.public(),
    queryFn: fetchPublicLabBrands,
  });

  return (
    <View style={styles.root}>
      <AppText style={styles.lead}>
        Indiquez comment vous souhaitez être pris en charge pour votre prélèvement.
      </AppText>

      <Pressable
        style={[styles.option, selectedMode === 'platform_match' && styles.optionSelected]}
        onPress={() => onModeChange('platform_match')}
      >
        <AppText style={styles.optionTitle}>Cary me met en relation</AppText>
        <AppText style={styles.optionHint}>
          Nous proposons votre demande aux laboratoires Cary disponibles près de chez vous.
        </AppText>
      </Pressable>

      <Pressable
        style={[styles.option, selectedMode === 'brand_choice' && styles.optionSelected]}
        onPress={() => onModeChange('brand_choice')}
      >
        <AppText style={styles.optionTitle}>Choisir une marque</AppText>
        <AppText style={styles.optionHint}>
          Sélectionnez un réseau (Biogroup, Cerballiance, etc.). Notre équipe vous contactera.
        </AppText>
      </Pressable>

      {selectedMode === 'brand_choice' ? (
        <View style={styles.gridWrap}>
          {brandsQ.isLoading ? (
            <AppText style={styles.muted}>Chargement des marques…</AppText>
          ) : brandsQ.isError ? (
            <AppText style={[styles.muted, { color: c.error }]}>Impossible de charger les marques.</AppText>
          ) : (
            <View style={styles.grid}>
              {(brandsQ.data ?? []).map((brand) => {
                const selected = brandId === brand.id;
                return (
                  <Pressable
                    key={brand.id}
                    style={[styles.brandCard, selected && styles.brandCardSelected]}
                    onPress={() => onBrandChange(brand.id)}
                  >
                    {brand.logo_url ? (
                      <Image
                        source={{ uri: brand.logo_url }}
                        style={styles.logo}
                        resizeMode="contain"
                        accessibilityLabel={brand.name}
                      />
                    ) : (
                      <View style={styles.logoFallback}>
                        <AppText style={styles.logoFallbackText}>{brand.name.slice(0, 2).toUpperCase()}</AppText>
                      </View>
                    )}
                    <AppText style={styles.brandName} numberOfLines={2}>
                      {brand.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {validationError ? <AppText style={[styles.error, { color: c.error }]}>{validationError}</AppText> : null}
    </View>
  );
}

function buildStyles(c: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    root: { gap: spacing[3], paddingBottom: spacing[6] },
    lead: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: c.textSecondary, lineHeight: 20 },
    option: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing[3],
      backgroundColor: c.surface,
      gap: spacing[1],
    },
    optionSelected: {
      borderColor: c.primary,
      backgroundColor: c.primaryLight,
    },
    optionTitle: { fontFamily: fontFamily.medium, fontSize: fontSize.base, color: c.textPrimary },
    optionHint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: c.textSecondary, lineHeight: 20 },
    gridWrap: { marginTop: spacing[2] },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    brandCard: {
      width: '30%',
      minWidth: 96,
      flexGrow: 1,
      alignItems: 'center',
      gap: spacing[1],
      padding: spacing[2],
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
    },
    brandCardSelected: { borderColor: c.primary, backgroundColor: c.primaryLight },
    logo: { width: 56, height: 40, borderRadius: radius.md },
    logoFallback: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    logoFallbackText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: c.textSecondary },
    brandName: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textPrimary,
      textAlign: 'center',
      lineHeight: 16,
    },
    muted: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: c.textSecondary },
    error: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, marginTop: spacing[2] },
  });
}
