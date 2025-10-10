/**
 * useJobPolling Hook
 *
 * Polls a job status endpoint until completion or timeout.
 * Used for async operations like HubSpot sync.
 *
 * Features:
 * - Automatic polling with configurable interval
 * - Timeout handling
 * - Cleanup on unmount
 * - TypeScript support
 *
 * @example
 * ```typescript
 * const { startPolling, status, result, error } = useJobPolling({
 *   endpoint: '/api/hubspot/sync-jobs',
 *   interval: 1000,
 *   timeout: 30000,
 *   onSuccess: (result) => console.log('Done!', result),
 *   onError: (error) => console.error('Failed:', error),
 * });
 *
 * // Start polling
 * startPolling('job-id-123');
 * ```
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export type JobStatus = "idle" | "pending" | "processing" | "succeeded" | "failed" | "timeout";

export interface JobResult<T = any> {
  jobId: string;
  status: JobStatus;
  quoteId?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  result?: T;
  error?: string;
  progress?: number;
}

export interface UseJobPollingOptions<T = any> {
  /** Base endpoint (e.g., '/api/hubspot/sync-jobs') */
  endpoint: string;

  /** Polling interval in milliseconds (default: 1000) */
  interval?: number;

  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Called when job succeeds */
  onSuccess?: (result: T) => void;

  /** Called when job fails */
  onError?: (error: string) => void;

  /** Called when polling times out */
  onTimeout?: () => void;

  /** Called on each poll (for progress updates) */
  onProgress?: (job: JobResult<T>) => void;
}

export interface UseJobPollingReturn<T = any> {
  /** Start polling for a job */
  startPolling: (jobId: string) => void;

  /** Stop polling */
  stopPolling: () => void;

  /** Current job status */
  status: JobStatus;

  /** Job result (if succeeded) */
  result: T | null;

  /** Error message (if failed) */
  error: string | null;

  /** Current job data */
  job: JobResult<T> | null;

  /** Whether currently polling */
  isPolling: boolean;
}

export function useJobPolling<T = any>(options: UseJobPollingOptions<T>): UseJobPollingReturn<T> {
  const {
    endpoint,
    interval = 1000,
    timeout = 30000,
    onSuccess,
    onError,
    onTimeout,
    onProgress,
  } = options;

  const [status, setStatus] = useState<JobStatus>("idle");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobResult<T> | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const jobIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const stopPolling = useCallback(() => {
    cleanup();
    jobIdRef.current = null;
  }, [cleanup]);

  const pollJob = useCallback(
    async (jobId: string) => {
      try {
        const response = (await apiRequest(`${endpoint}/${jobId}`, {
          method: "GET",
        })) as JobResult<T>;

        setJob(response);
        setStatus(response.status);

        // Call progress callback
        if (onProgress) {
          onProgress(response);
        }

        // Check if job is complete
        if (response.status === "succeeded") {
          cleanup();
          setResult(response.result || null);
          if (onSuccess && response.result) {
            onSuccess(response.result);
          }
        } else if (response.status === "failed") {
          cleanup();
          const errorMsg = response.error || "Job failed";
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
        }
        // If pending or processing, keep polling
      } catch (err: any) {
        console.error("[useJobPolling] Poll error:", err);
        // Don't stop polling on network errors, just log
        // The timeout will eventually stop it
      }
    },
    [endpoint, onSuccess, onError, onProgress, cleanup]
  );

  const startPolling = useCallback(
    (jobId: string) => {
      // Clean up any existing polling
      cleanup();

      // Reset state
      setStatus("pending");
      setResult(null);
      setError(null);
      setJob(null);
      setIsPolling(true);
      jobIdRef.current = jobId;
      startTimeRef.current = Date.now();

      // Start polling immediately
      pollJob(jobId);

      // Set up interval
      pollTimerRef.current = setInterval(() => {
        if (jobIdRef.current) {
          pollJob(jobIdRef.current);
        }
      }, interval);

      // Set up timeout
      timeoutTimerRef.current = setTimeout(() => {
        if (jobIdRef.current) {
          cleanup();
          setStatus("timeout");
          setError("Job polling timed out");
          if (onTimeout) {
            onTimeout();
          }
        }
      }, timeout);
    },
    [interval, timeout, pollJob, cleanup, onTimeout]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startPolling,
    stopPolling,
    status,
    result,
    error,
    job,
    isPolling,
  };
}
