import { useState, useEffect, useRef } from 'react';

import { ResolvedContextPackage, ContextType } from '@/contracts/index';

export interface ResolveContextArgs {
  type: ContextType;
  id: string;
}

export type ResolutionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; context: ResolvedContextPackage }
  | { status: 'denied'; message?: string }
  | { status: 'error'; error: string };

// Temporary mock/ref to Firebase Auth for client compilation
// In a full implementation, this imports from service firebase
const mockAuth = {
  currentUser: {
    uid: 'uid-mock',
    getIdToken: async () => 'mock-token'
  }
};

export function useResolvedContext(contextArgs: ResolveContextArgs | null) {
  const [state, setState] = useState<ResolutionState>({ status: 'idle' });
  const activeRequestId = useRef<string | null>(null);

  useEffect(() => {
    if (!contextArgs) {
      setState({ status: 'idle' });
      return;
    }

    const { type, id } = contextArgs;
    const reqId = `${type}-${id}-${Date.now()}`;
    activeRequestId.current = reqId;

    // Reset state/loading when selection changes
    setState({ status: 'loading' });

    const controller = new AbortController();

    async function fetchContext() {
      // 1. Refuse to call without authenticated user
      const currentUser = mockAuth.currentUser; 
      if (!currentUser) {
        if (activeRequestId.current === reqId) {
          setState({ status: 'error', error: 'Authentication required' });
        }
        return;
      }
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/context/resolve`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: {
              type,
              id,
            },
            clientType: 'native_mobile',
            surface: 'supply_app',
            channel: 'interactive',
          }),
        });

        // Prevent race condition overwriting newer selections
        if (activeRequestId.current !== reqId) return;

        if (!response.ok) {
          const errPayload = await response.json().catch(() => ({}));
          const errCode = errPayload?.error?.code;
          const errMsg = errPayload?.error?.message || 'Resolution failed';

          if (response.status === 403 || errCode === 'FORBIDDEN') {
            setState({ status: 'denied', message: errMsg });
          } else {
            setState({ status: 'error', error: errMsg });
          }
          return;
        }

        const data = await response.json();
        if (activeRequestId.current !== reqId) return;
        setState({ status: 'resolved', context: data });
      } catch (err: any) {
        if (activeRequestId.current !== reqId) return;
        
        // 2. Ignore AbortError rather than showing it as a network failure
        if (err.name === 'AbortError') {
          // Silent cancel
          return;
        }
        
        setState({ status: 'error', error: err.message || 'Network connection failed' });
      }
    }

    fetchContext();

    // 3. Abort controller during effect cleanup
    return () => {
      controller.abort();
    };
  }, [contextArgs?.type, contextArgs?.id]);

  return state;
}
