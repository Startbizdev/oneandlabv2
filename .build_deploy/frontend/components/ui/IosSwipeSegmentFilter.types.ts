export type IosSwipeFilterTab = {
  value: string;
  label: string;
  /** Sous-libellé discret sous le titre (ex. « Tous les soins » sous « Tous »). */
  subLabel?: string;
  /** Illustration (PNG public) — prioritaire sur `icon` Lucide. */
  iconSrc?: string;
  icon?: string;
  cardIdle?: string;
  cardActive?: string;
  iconIdle?: string;
  iconActive?: string;
};
