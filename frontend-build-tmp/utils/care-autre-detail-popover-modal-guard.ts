/**
 * À passer à `UModal` via `:content` pour ne pas fermer la dialog quand l’utilisateur
 * clique sur le panneau téléporté `.care-autre-detail-popover` (suggestions « Précisez »).
 * Reka traite ce panneau comme « outside » car il est rendu sous `body`, hors du DOM de la modal.
 */
function targetInCarePopover(target: EventTarget | null): boolean {
  if (typeof document === 'undefined') return false;
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('.care-autre-detail-popover') ||
      target.closest('.care-autre-detail-popover-backdrop') ||
      target.closest('.care-autre-detail-mobile-layer'),
  );
}

export const careAutreDetailPopoverModalContentProps = {
  onPointerDownOutside(e: CustomEvent<{ originalEvent: PointerEvent }>) {
    const t = e.detail?.originalEvent?.target ?? null;
    if (targetInCarePopover(t)) e.preventDefault();
  },
  onInteractOutside(e: CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>) {
    const orig = e.detail?.originalEvent;
    if (orig && 'target' in orig && targetInCarePopover(orig.target)) e.preventDefault();
  },
};
