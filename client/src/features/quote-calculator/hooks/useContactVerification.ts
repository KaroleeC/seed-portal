/**
 * useContactVerification Hook
 * 
 * Manages HubSpot contact verification with debouncing and state management.
 * Extracted from QuoteCalculator.tsx for DRY and testability.
 * 
 * Features:
 * - Debounced email verification
 * - Automatic timeout after 10 seconds
 * - Existing quotes check
 * - State management for verification status
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { verifyContact as verifyHubspotContact } from "@/services/hubspot";
import { checkExistingQuotes } from "@/services/quotes";
import type { Quote } from "@shared/schema";

export type VerificationStatus = "idle" | "verifying" | "verified" | "not-found";

export interface ContactVerificationResult {
  verified: boolean;
  contact: any | null;
  existingQuotes: Quote[];
}

export interface UseContactVerificationOptions {
  debounceMs?: number;
  timeoutMs?: number;
  onVerified?: (contact: any) => void;
  onNotFound?: () => void;
}

/**
 * Hook for managing contact verification
 * 
 * DRY: Single hook for all contact verification logic
 * 
 * @param options - Configuration options
 * @returns Verification state and handlers
 */
export function useContactVerification(options: UseContactVerificationOptions = {}) {
  const {
    debounceMs = 1000,
    timeoutMs = 10000,
    onVerified,
    onNotFound,
  } = options;

  // State
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [contact, setContact] = useState<any>(null);
  const [existingQuotes, setExistingQuotes] = useState<Quote[]>([]);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState("");

  // Refs for cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Verify email immediately (internal)
   */
  const verifyEmailImmediate = useCallback(async (email: string) => {
    // Skip if already verified
    if (email === lastVerifiedEmail && status === "verified") {
      return;
    }

    cleanup();
    setStatus("verifying");
    setLastVerifiedEmail(email);

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set timeout
    const timeoutTimer = setTimeout(() => {
      if (status === "verifying") {
        setStatus("idle");
        abortController.abort();
      }
    }, timeoutMs);
    timeoutTimerRef.current = timeoutTimer;

    try {
      // Parallel verification + quotes check
      const [hubspotResult, quotesResult] = await Promise.all([
        verifyHubspotContact(email),
        checkExistingQuotes(email),
      ]);

      // Check if aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (hubspotResult.verified && hubspotResult.contact) {
        setStatus("verified");
        setContact(hubspotResult.contact);
        setExistingQuotes(quotesResult || []);
        onVerified?.(hubspotResult.contact);
      } else {
        setStatus("not-found");
        setContact(null);
        setExistingQuotes([]);
        onNotFound?.();
      }
    } catch (error) {
      // Check if aborted
      if (abortController.signal.aborted) {
        return;
      }

      console.error("Contact verification error:", error);
      setStatus("idle");
      setContact(null);
      setExistingQuotes([]);
    } finally {
      clearTimeout(timeoutTimer);
      timeoutTimerRef.current = null;
    }
  }, [lastVerifiedEmail, status, cleanup, timeoutMs, onVerified, onNotFound]);

  /**
   * Verify email with debouncing
   * 
   * DRY: Single debounced verification function
   */
  const verifyEmail = useCallback((email: string) => {
    if (!email || email.trim().length === 0) {
      cleanup();
      setStatus("idle");
      setContact(null);
      setExistingQuotes([]);
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      verifyEmailImmediate(email);
    }, debounceMs);
  }, [debounceMs, verifyEmailImmediate, cleanup]);

  /**
   * Reset verification state
   * 
   * DRY: Single reset function
   */
  const reset = useCallback(() => {
    cleanup();
    setStatus("idle");
    setContact(null);
    setExistingQuotes([]);
    setLastVerifiedEmail("");
  }, [cleanup]);

  /**
   * Check if email needs verification
   * 
   * DRY: Single check function
   */
  const needsVerification = useCallback((email: string): boolean => {
    return email !== lastVerifiedEmail || status === "idle";
  }, [lastVerifiedEmail, status]);

  return {
    // State
    status,
    contact,
    existingQuotes,
    lastVerifiedEmail,
    
    // Computed
    isVerifying: status === "verifying",
    isVerified: status === "verified",
    isNotFound: status === "not-found",
    
    // Actions
    verifyEmail,
    reset,
    needsVerification,
  };
}
