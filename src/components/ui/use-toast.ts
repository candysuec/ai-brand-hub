import { useCallback } from 'react';

export function useToast() {
  const toast = useCallback(({ description }: { description: string }) => {
    // In a real app, this could trigger a toast notification library.
    // For now, it just logs to the console.
    console.log('Toast:', description);
  }, []);

  return { toast };
}
