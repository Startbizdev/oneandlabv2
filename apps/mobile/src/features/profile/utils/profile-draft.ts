function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]));
}

/** Refresh untouched fields while preserving edits made since the previous server response. */
export class ProfileDraft<T extends object> {
  private subject: string | null = null;
  private previous: T | null = null;

  merge(subject: string, incoming: T, current: T): T {
    const next = { ...incoming };
    if (this.subject === subject && this.previous) {
      for (const key of Object.keys(incoming) as (keyof T)[]) {
        if (!sameValue(current[key], this.previous[key])) next[key] = current[key];
      }
    }
    this.subject = subject;
    this.previous = incoming;
    return next;
  }
}
