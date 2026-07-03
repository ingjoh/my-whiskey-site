'use client';

import { useState, useEffect } from 'react';
import type { ResolvedContextPackage } from '@/lib/services/contextResolutionEngine';

export interface UseWorkspaceContextResult {
  data: ResolvedContextPackage | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorkspaceContext(
  workspaceId: string,
  actorId: string,
  impersonatorId?: string
): UseWorkspaceContextResult {
  const [data, setData] = useState<ResolvedContextPackage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!workspaceId || !actorId) {
      setData(null);
      setLoading(false);
      setError('Missing workspaceId or actorId');
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/workspaces/${workspaceId}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actorId,
        channel: 'web',
        impersonatorId,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then(resData => {
        if (isMounted) {
          setData(resData);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch workspace context');
          setData(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, actorId, impersonatorId, refetchTrigger]);

  return { data, loading, error, refetch };
}
