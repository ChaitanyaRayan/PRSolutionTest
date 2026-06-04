/**
 * useDropdowns — Fetches /dropdowns once and caches in the global store.
 *
 * Returns { lenses, llms, loaded, error }
 * Each lens: { id, label, description }
 * Each llm:  { id, label, description }
 *
 * The hook is idempotent — calling it multiple times only fires one request.
 */

import { useEffect, useState } from 'react';
import { useMediaStore } from '../store/mediaStore';
import { dropdownsApi } from '../api/client';

export function useDropdowns() {
  const lenses           = useMediaStore((s) => s.lenses);
  const llms             = useMediaStore((s) => s.llms);
  const dropdownsLoaded  = useMediaStore((s) => s.dropdownsLoaded);
  const setDropdowns     = useMediaStore((s) => s.setDropdowns);

  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch once; don't re-fetch if already loaded
    if (dropdownsLoaded) return;

    let cancelled = false;

    dropdownsApi.get()
      .then((data) => {
        if (!cancelled) setDropdowns(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[useDropdowns] Failed to fetch /dropdowns:', err.message);
          setError(err.message);
          // Mark as loaded anyway so we fall back to static IDs gracefully
          setDropdowns({ lens: [], llm: [] });
        }
      });

    return () => { cancelled = true; };
  }, [dropdownsLoaded]);

  return { lenses, llms, loaded: dropdownsLoaded, error };
}
