export function getErrorMessage(err: unknown, fallback = 'Une erreur est survenue'): string {
  if (err instanceof Error) {
    if (err.message === 'FILE_TOO_LARGE') {
      return 'Fichier trop volumineux (maximum 25 Mo).';
    }
    if (err.message) return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

type ToastFn = (title: string, opts?: { message?: string; type?: 'success' | 'error' | 'info' }) => void;

export function handleApiError(err: unknown, toast: ToastFn, context: string, fallback?: string): void {
  const message = getErrorMessage(err, fallback);
  if (__DEV__) {
    console.warn(`[API] ${context}`, message);
  }
  toast(message, { type: 'error' });
}
