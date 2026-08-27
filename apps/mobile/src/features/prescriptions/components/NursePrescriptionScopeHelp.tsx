import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Info, Scale } from 'lucide-react-native';
import {
  NURSE_PRESCRIPTION_SCOPE,
  type NursePrescriptionLegalSource,
  type NursePrescriptionScopeCategory,
} from '@oneandlab/shared-utils';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { spacing, radius, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function CategoryBlock({ category }: { category: NursePrescriptionScopeCategory }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildCategoryStyles, 'NursePrescriptionScopeSheet_category');
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={styles.trigger}
      >
        <View style={styles.triggerText}>
          <AppText style={styles.catTitle}>{category.title}</AppText>
          <AppText style={styles.catSummary} numberOfLines={open ? undefined : 2}>
            {category.summary}
          </AppText>
        </View>
        {open ? (
          <ChevronUp size={iconSize.sm} color={c.textSecondary} strokeWidth={2} />
        ) : (
          <ChevronDown size={iconSize.sm} color={c.textSecondary} strokeWidth={2} />
        )}
      </Pressable>
      {open ? (
        <View style={styles.body}>
          {category.items.map((item) => (
            <View key={item.id} style={styles.bulletRow}>
              <AppText style={styles.bullet}>•</AppText>
              <AppText style={styles.itemText}>
                {item.label}
                {item.detail ? ` — ${item.detail}` : ''}
              </AppText>
            </View>
          ))}
          {category.limits?.map((lim) => (
            <View key={lim} style={styles.limitBox}>
              <AppText style={styles.limitText}>{lim}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SourceRow({ source }: { source: NursePrescriptionLegalSource }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildSourceStyles, 'NursePrescriptionScopeSheet_source');

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <AppText style={styles.label}>{source.label}</AppText>
        {source.note ? <AppText style={styles.note}>{source.note}</AppText> : null}
        <AppText style={styles.meta}>
          {source.publisher}
          {source.publishedAt ? ` · ${source.publishedAt}` : ''}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Ouvrir ${source.label}`}
        hitSlop={8}
        onPress={() => Linking.openURL(source.url)}
        style={styles.linkBtn}
      >
        <ExternalLink size={iconSize.sm} color={c.primary} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export function NursePrescriptionScopeHelp() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'NursePrescriptionScopeHelp');
  const [sheetOpen, setSheetOpen] = useState(false);
  const scope = NURSE_PRESCRIPTION_SCOPE;
  const updatedLabel = useMemo(() => formatUpdatedAt(scope.updatedAt), [scope.updatedAt]);

  return (
    <>
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Scale size={iconSize.md} color={c.primary} strokeWidth={2} />
        </View>
        <View style={styles.bannerText}>
          <AppText style={styles.bannerTitle}>Que puis-je prescrire en tant qu’infirmier ?</AppText>
          <AppText style={styles.bannerSub}>
            Liste réglementaire (L4311-1, arrêté 2026), limites et usage Cary.
          </AppText>
        </View>
        <Button
          title="Voir la liste"
          size="sm"
          variant="outline"
          leftIcon={<BookOpen size={iconSize.xs} color={c.primary} strokeWidth={2} />}
          onPress={() => setSheetOpen(true)}
          style={styles.bannerBtn}
        />
      </View>

      <SheetModal
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={scope.modalTitle}
        subtitle={scope.modalSubtitle}
        snapPoints={['92%']}
      >
        <AppText style={styles.intro}>{scope.intro}</AppText>

        <View style={styles.caryNotice}>
          <Info size={iconSize.sm} color={c.primary} strokeWidth={2} style={styles.caryIcon} />
          <AppText style={styles.caryText}>{scope.caryNotice}</AppText>
        </View>

        <AppText style={styles.sectionLabel}>Domaines autorisés</AppText>
        {scope.categories.map((cat) => (
          <CategoryBlock key={cat.id} category={cat} />
        ))}

        <AppText style={styles.sectionLabel}>Règles essentielles</AppText>
        {scope.keyRules.map((rule) => (
          <View key={rule.id} style={styles.ruleBox}>
            <AppText style={styles.ruleTitle}>{rule.title}</AppText>
            <AppText style={styles.ruleBody}>{rule.body}</AppText>
          </View>
        ))}

        <AppText style={styles.sectionLabel}>Textes officiels et références</AppText>
        {scope.legalSources.map((src) => (
          <SourceRow key={src.id} source={src} />
        ))}

        <AppText style={styles.disclaimer}>
          {scope.disclaimer}
          {'\n\n'}
          Contenu Cary · révision {scope.version} · maj. {updatedLabel}
        </AppText>
      </SheetModal>
    </>
  );
}

function buildStyles(c: AppColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.primaryMid,
      backgroundColor: c.primaryLight,
      marginBottom: spacing[3],
    },
    bannerIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.primaryMid,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerText: { flex: 1, minWidth: 160, gap: spacing[1] },
    bannerTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    bannerSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: 18,
    },
    bannerBtn: { alignSelf: 'flex-start' },
    intro: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: 22,
      marginBottom: spacing[4],
    },
    caryNotice: {
      flexDirection: 'row',
      gap: spacing[3],
      padding: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.primaryLight,
      borderWidth: 1,
      borderColor: c.primaryMid,
      marginBottom: spacing[5],
    },
    caryIcon: { marginTop: 2 },
    caryText: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textPrimary,
      lineHeight: 18,
    },
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize['2xs'],
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing[2],
      marginTop: spacing[2],
    },
    ruleBox: {
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      marginBottom: spacing[2],
    },
    ruleTitle: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    ruleBody: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      marginTop: spacing[1],
      lineHeight: 18,
    },
    disclaimer: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize['2xs'],
      color: c.textSecondary,
      lineHeight: 17,
      marginTop: spacing[4],
      paddingTop: spacing[4],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      marginBottom: spacing[6],
    },
  });
}

function buildCategoryStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: spacing[2],
      backgroundColor: c.surface,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      padding: spacing[3],
    },
    triggerText: { flex: 1, gap: spacing[0.5] },
    catTitle: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    catSummary: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: 17,
    },
    body: {
      paddingHorizontal: spacing[3],
      paddingBottom: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: spacing[1],
    },
    bulletRow: { flexDirection: 'row', gap: spacing[2], paddingRight: spacing[1] },
    bullet: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: c.primary },
    itemText: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textPrimary,
      lineHeight: 18,
    },
    limitBox: {
      marginTop: spacing[2],
      padding: spacing[2],
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    limitText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize['2xs'],
      color: c.textSecondary,
      lineHeight: 16,
    },
  });
}

function buildSourceStyles(c: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing[2],
    },
    textCol: { flex: 1, gap: spacing[0.5] },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    note: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    meta: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize['2xs'],
      color: c.textSecondary,
    },
    linkBtn: {
      padding: spacing[2],
      borderRadius: radius.md,
    },
  });
}
