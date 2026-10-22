import { memo, useMemo } from 'react';
import { View, type TextStyle } from 'react-native';
import { AppText, font, lh, spacing, useStyles, type Theme } from '@/theme';
import { parseInline, parseMarkdown } from '../utils/markdown';

type Styles = ReturnType<typeof buildStyles>;

function Inline({ text, style, styles }: { text: string; style: TextStyle; styles: Styles }) {
  return (
    <AppText variant="body" style={style} selectable>
      {parseInline(text).map((segment, index) =>
        segment.bold ? (
          <AppText key={index} variant="body" style={[style, styles.bold]}>
            {segment.text}
          </AppText>
        ) : (
          segment.text
        ),
      )}
    </AppText>
  );
}

/** Texte de Cary sans bulle : paragraphes, titres courts, listes, gras. Analyse refaite seulement si le texte change. */
export const AssistantMarkdown = memo(function AssistantMarkdown({ text }: { text: string }) {
  const styles = useStyles(buildStyles);
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') return <Inline key={index} text={block.text} style={styles.heading} styles={styles} />;
        if (block.type === 'paragraph') return <Inline key={index} text={block.text} style={styles.text} styles={styles} />;
        return (
          <View key={index} style={styles.list}>
            {block.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.item}>
                <AppText variant="body" style={[styles.text, styles.bullet]}>
                  •
                </AppText>
                <Inline text={item} style={styles.itemText} styles={styles} />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
});

function buildStyles({ colors: c, fontSize }: Theme) {
  const text = { fontSize: fontSize.base, lineHeight: lh(fontSize.base, 1.55), color: c.textPrimary };
  return {
    root: { gap: spacing[3] },
    text,
    heading: { ...text, ...font.semiBold },
    bold: { ...font.semiBold },
    list: { gap: spacing[1.5] },
    item: { flexDirection: 'row' as const, gap: spacing[2] },
    bullet: { color: c.textSecondary, flexShrink: 0 },
    itemText: { ...text, flex: 1, minWidth: 0 },
  };
}
