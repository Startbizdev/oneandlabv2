export type BookingSubmitBatchResult = {
  success?: boolean;
  createdIds?: string[];
  creationComplete?: boolean;
  error?: string;
  warning?: string;
};

export type BookingSubmitNavigation =
  | { kind: 'detail'; id: string; warning?: string }
  | { kind: 'list'; message: string };

export const BOOKING_SUBMIT_LIST_FALLBACK =
  'Ne recréez pas : ouvrez vos rendez-vous.';

function firstCreatedId(result: BookingSubmitBatchResult): string | undefined {
  const ids = result.createdIds ?? [];
  for (const id of ids) {
    if (typeof id === 'string' && id.trim() !== '') return id.trim();
  }
  return undefined;
}

/**
 * Invariant wizard : s’il existe un id serveur, aller au détail.
 * Sinon la liste — jamais rester sur Confirmer.
 */
export function resolveBookingSubmitNavigation(
  result: BookingSubmitBatchResult,
): BookingSubmitNavigation {
  const id = firstCreatedId(result);
  if (id) {
    const warning =
      result.success === false
        ? (result.warning ?? result.error)
        : result.warning;
    return warning && warning.trim() !== ''
      ? { kind: 'detail', id, warning }
      : { kind: 'detail', id };
  }

  const extra = (result.error ?? result.warning ?? '').trim();
  return {
    kind: 'list',
    message: extra
      ? `${extra} ${BOOKING_SUBMIT_LIST_FALLBACK}`
      : BOOKING_SUBMIT_LIST_FALLBACK,
  };
}

export function toBookingClientResult(result: BookingSubmitBatchResult): {
  success: true;
  createdIds: string[];
  warning?: string;
  fallbackList?: boolean;
} {
  const nav = resolveBookingSubmitNavigation(result);
  if (nav.kind === 'detail') {
    return {
      success: true,
      createdIds: result.createdIds?.length ? result.createdIds : [nav.id],
      warning: nav.warning,
    };
  }
  return {
    success: true,
    createdIds: [],
    warning: nav.message,
    fallbackList: true,
  };
}

type BookingBatch<T> = {
  run: (
    key: string,
    payloads: T[],
    create: (payload: T, requestId: string) => Promise<string>,
    attach: (payload: T, id: string) => Promise<void>,
    options?: { waitForAttach?: boolean },
  ) => Promise<BookingSubmitBatchResult>;
};

/** Crée, retry une fois si 0 id, n’attend pas les documents. Toujours navigable (détail ou liste). */
export async function runStaffBookingBatch<T>(
  attempt: BookingBatch<T>,
  fingerprint: string,
  prepared: T[],
  create: (payload: T, requestId: string) => Promise<string>,
  attach: (payload: T, id: string) => Promise<void>,
): Promise<{
  success: true;
  createdIds: string[];
  warning?: string;
  fallbackList?: boolean;
}> {
  const runOnce = () =>
    attempt.run(fingerprint, prepared, create, attach, { waitForAttach: false });
  let result = await runOnce();
  if (!firstCreatedId(result)) {
    result = await runOnce();
  }
  return toBookingClientResult(result);
}
