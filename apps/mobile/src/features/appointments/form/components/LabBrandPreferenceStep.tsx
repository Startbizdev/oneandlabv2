import { useQuery } from '@tanstack/react-query';
import { Image, Pressable, View } from 'react-native';
import type { LabPreferenceMode } from '@oneandlab/shared-types';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { fetchPublicLabBrands } from '@/features/appointments/api/lab-brands.service';
import { queryKeys } from '@/lib/query-keys';
import { radius, spacing, AppText, font, useStyles, type Theme } from '@/theme';

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
  const styles = useStyles(buildStyles);
  const selectedMode = mode || 'platform_match';

  const brandsQ = useQuery({
    queryKey: queryKeys.labBrands.public(),
    queryFn: fetchPublicLabBrands,
  });

  return (
    <View style={styles.root}>
      <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Choix du laboratoire">
        <ChoiceCard
          title="Cary me met en relation"
          description="Votre demande est proposée aux laboratoires disponibles près de chez vous."
          selected={selectedMode === 'platform_match'}
          onPress={() => onModeChange('platform_match')}
        />
        <ChoiceCard
          title="Je choisis mon laboratoire"
          description="Biogroup, Cerballiance… Notre équipe vous contactera."
          selected={selectedMode === 'brand_choice'}
          onPress={() => onModeChange('brand_choice')}
        />
      </View>

      {selectedMode === 'brand_choice' ? (
        brandsQ.isLoading ? (
          <SkeletonList count={2} />
        ) : brandsQ.isError ? (
          <ErrorState
            error={brandsQ.error}
            title="Laboratoires indisponibles"
            onRetry={() => void brandsQ.refetch()}
          />
        ) : (
          <View style={styles.brandGrid} accessibilityRole="radiogroup" accessibilityLabel="Réseaux de laboratoires">
            {(brandsQ.data ?? []).map((brand) => {
              const selected = brandId === brand.id;
              return (
                <Pressable
                  key={brand.id}
                  style={({ pressed }) => [
                    styles.brandCard,
                    selected && styles.brandCardSelected,
                    pressed && styles.brandCardPressed,
                  ]}
                  onPress={() => onBrandChange(brand.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={brand.name}
                >
                  {brand.logo_url ? (
                    <Image source={{ uri: brand.logo_url }} style={styles.logo} resizeMode="contain" />
                  ) : (
                    <View style={styles.logoFallback}>
                      <AppText style={styles.logoFallbackText}>{brand.name.slice(0, 2).toUpperCase()}</AppText>
                    </View>
                  )}
                  <AppText variant="caption" style={styles.brandName}>
                    {brand.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )
      ) : null}

      {validationError ? (
        <AppText variant="body" accessibilityRole="alert" style={styles.error}>
          {validationError}
        </AppText>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: { gap: spacing[4], paddingBottom: spacing[6] },
    choices: { gap: spacing[3] },
    brandGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },
    brandCard: {
      width: '30%' as const,
      minWidth: 96,
      minHeight: 96,
      flexGrow: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1.5],
      padding: spacing[3],
      borderWidth: 1.5,
      borderColor: c.cardBorder,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
    },
    brandCardSelected: { borderColor: c.primary, backgroundColor: c.primaryLight },
    brandCardPressed: { opacity: 0.85 },
    logo: { width: 56, height: 40, borderRadius: radius.md },
    logoFallback: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.surfaceAlt,
    },
    logoFallbackText: { ...font.semiBold, fontSize: fontSize.xs, color: c.textSecondary },
    brandName: {
      ...font.semiBold,
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    error: { color: c.error },
  };
}
