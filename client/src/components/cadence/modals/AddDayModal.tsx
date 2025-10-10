import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dayNumber: number) => void;
  minDayNumber: number; // Previous day + 1
  existingDays: number[]; // Array of existing day numbers
}

export function AddDayModal({
  isOpen,
  onClose,
  onAdd,
  minDayNumber,
  existingDays,
}: AddDayModalProps) {
  const [dayNumber, setDayNumber] = useState(minDayNumber);
  const [error, setError] = useState("");

  const handleAdd = () => {
    // Validate
    if (dayNumber < minDayNumber) {
      setError(`Day must be at least ${minDayNumber}`);
      return;
    }

    if (existingDays.includes(dayNumber)) {
      setError(`Day ${dayNumber} already exists`);
      return;
    }

    if (dayNumber <= 0) {
      setError("Day must be greater than 0");
      return;
    }

    if (dayNumber > 365) {
      setError("Day cannot exceed 365");
      return;
    }

    // Add the day
    onAdd(dayNumber);

    // Reset and close
    setError("");
    setDayNumber(minDayNumber);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError("");
      setDayNumber(minDayNumber);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Day</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="day-number" className="text-white">
              Day Number
            </Label>
            <Input
              id="day-number"
              type="number"
              min={minDayNumber}
              max={365}
              value={dayNumber}
              onChange={(e) => {
                setDayNumber(parseInt(e.target.value, 10) || minDayNumber);
                setError("");
              }}
              className="bg-slate-700/50 border-slate-600 text-white"
            />
            <p className="text-xs text-gray-400">Must be at least Day {minDayNumber}</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-orange-400">Day {dayNumber}</span> will be added
              to your cadence timeline.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              You can add actions to this day after creating it.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-slate-500 text-white hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600 text-white">
            Add Day {dayNumber}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
