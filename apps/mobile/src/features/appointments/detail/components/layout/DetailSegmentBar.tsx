import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ClipboardList,
  FileText,
  MessageCircle,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const SEGMENT_ICONS: Record<string, LucideIcon> = {
  infos: ClipboardList,
  documents: FileText,
  photos: MessageCircle,
  avis: Star,
};

export type DetailSegment = {
  id: string;
  label: string;
  badge?: number;
  Icon?: LucideIcon;
};

interface Props {
  segments: DetailSegment[];
  active: string;
  onChange: (id: string) => void;
}

/** Onglets type segmented control (pleine largeur, style liste RDV). */
export function DetailSegmentBar({ segments, active, onChange }: Props) {
  if (segments.length <= 1) return null;

  return (
    <View style={styles.track}>
      {segments.map((s) => {
        const on = s.id === active;
        const Icon = s.Icon ?? SEGMENT_ICONS[s.id];
        const iconColor = on ? colors.primary : colors.textTertiary;

        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={[styles.btn, on && styles.btnOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={s.label}
          >
            {Icon ? <Icon size={16} color={iconColor} strokeWidth={2.25} /> : null}
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {s.label}
            </Text>
            {s.badge != null && s.badge > 0 ? (
              <View style={[styles.badge, on && styles.badgeOn]}>
                <Text style={[styles.badgeText, on && styles.badgeTextOn]}>
                  {s.badge > 99 ? '99+' : s.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  track: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    padding: 3,
    gap: 3,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    minHeight: 44,
    paddingVertical: spacing[2.5],
    paddingHorizontal: spacing[1.5],
    borderRadius: radius.md,
  },
  btnOn: {
    backgroundColor: c.surface,
    ...elevation.xs,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  labelOn: {
    color: c.primaryDark,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: c.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOn: {
    backgroundColor: c.primaryLight,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  badgeTextOn: {
    color: c.primary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_layout_DetailSegmentBar_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
