'use client';

import { useEffect } from 'react';

/** Marks the page as interactive (used by the automated browser tests). */
export function Hydrated() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = '1';
  }, []);
  return null;
}
