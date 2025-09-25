import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalCode: string;
  setApprovalCode: (value: string) => void;
  isValidating: boolean;
  onValidate: () => void;
};

export function ApprovalCodeDialog({
  open,
  onOpenChange,
  approvalCode,
  setApprovalCode,
  isValidating,
  onValidate,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Enter Approval Code</DialogTitle>
          <DialogDescription className="text-center">
            Enter the 4-digit approval code from Slack to proceed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="approvalCode"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Approval Code
            </label>
            <Input
              id="approvalCode"
              type="text"
              maxLength={4}
              placeholder="0000"
              value={approvalCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setApprovalCode(value);
              }}
              className="text-center text-2xl tracking-widest font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && approvalCode.length === 4) {
                  onValidate();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setApprovalCode("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onValidate}
              disabled={isValidating || approvalCode.length !== 4}
              className="flex-1"
            >
              {isValidating ? "Validating..." : "Validate Code"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
