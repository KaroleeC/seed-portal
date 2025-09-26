// Approval and duplicate-quote logic extracted from home.tsx

/**
 * Returns a string with the reason the approval button should be disabled,
 * or null if the button should be enabled.
 */
export function getApprovalButtonDisabledReason(
  formValues: any,
  isRequestingApproval: boolean,
  hasRequestedApproval: boolean,
): string | null {
  // Mirror original behavior: if in-flight request, don't disable by reason
  if (isRequestingApproval) return null;
  if (!formValues?.contactEmail) return "Contact email is required";
  if (!formValues?.overrideReason) return "Please select a reason for override";

  const currentMonth = new Date().getMonth() + 1;
  const overrideReason = formValues.overrideReason;
  const cleanupMonths = formValues.cleanupMonths || 0;
  const customSetupFee = formValues.customSetupFee?.trim?.();
  const customOverrideReason = formValues.customOverrideReason?.trim?.();

  if (overrideReason === "Other") {
    if (!customOverrideReason) return "Please explain the reason for override";
    // For "Other", enabled only if custom setup fee is entered OR cleanup months are decreased
    const hasCustomSetupFee = !!customSetupFee;
    const hasDecreasedMonths = cleanupMonths < currentMonth;
    if (!hasCustomSetupFee && !hasDecreasedMonths) {
      return "Enter a custom setup fee OR reduce cleanup months below the minimum";
    }
  } else if (
    overrideReason === "Brand New Business" ||
    overrideReason === "Books Confirmed Current"
  ) {
    // For these reasons, enabled only if cleanup months are decreased
    if (cleanupMonths >= currentMonth) {
      return "Reduce cleanup months below the minimum to request approval";
    }
  }

  return null;
}

export function isApprovalButtonDisabled(
  formValues: any,
  isRequestingApproval: boolean,
  hasRequestedApproval: boolean,
): boolean {
  return (
    getApprovalButtonDisabledReason(
      formValues,
      isRequestingApproval,
      hasRequestedApproval,
    ) !== null
  );
}
