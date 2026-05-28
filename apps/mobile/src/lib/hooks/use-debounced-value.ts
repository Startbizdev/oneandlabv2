import { useEffect, useState } from 'react';

/** Valeur debouncée pour la recherche hub patient. */
export function useDebouncedValue<T>(value: T, delayMs = 320): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
