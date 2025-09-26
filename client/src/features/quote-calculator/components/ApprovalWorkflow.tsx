/**
 * ✅ APPROVAL WORKFLOW
 * Maximum 100 lines - approval UI only!
 * Handles special cases requiring approval codes
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Lock } from "lucide-react";

import { QuoteFormData } from "../types/QuoteTypes";

interface ApprovalWorkflowProps {
  formData: QuoteFormData;
  onApprovalSuccess: (approvalCode: string) => void;
  onCancel: () => void;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  formData,
  onApprovalSuccess,
  onCancel,
}) => {
  const [approvalCode, setApprovalCode] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [customOverrideReason, setCustomOverrideReason] = useState("");

  const handleSubmit = () => {
    // Simple validation - in production would verify against server
    if (approvalCode.length >= 4) {
      onApprovalSuccess(approvalCode);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Approval Required
          </DialogTitle>
          <DialogDescription>
            This quote requires special approval. Please provide an approval
            code to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Override Reason */}
          <div>
            <Label htmlFor="overrideReason">Override Reason</Label>
            <select
              id="overrideReason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Select reason...</option>
              <option value="complex_cleanup">Complex cleanup project</option>
              <option value="custom_pricing">Custom pricing arrangement</option>
              <option value="special_client">
                Special client circumstances
              </option>
              <option value="other">Other (please specify)</option>
            </select>
          </div>

          {overrideReason === "other" && (
            <div>
              <Label htmlFor="customOverrideReason">Please specify</Label>
              <Input
                id="customOverrideReason"
                value={customOverrideReason}
                onChange={(e) => setCustomOverrideReason(e.target.value)}
                placeholder="Enter custom reason..."
              />
            </div>
          )}

          {/* Approval Code */}
          <div>
            <Label htmlFor="approvalCode" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Approval Code
            </Label>
            <Input
              id="approvalCode"
              type="password"
              value={approvalCode}
              onChange={(e) => setApprovalCode(e.target.value)}
              placeholder="Enter approval code..."
              className="font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button onClick={onCancel} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!approvalCode || !overrideReason}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Submit for Approval
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
