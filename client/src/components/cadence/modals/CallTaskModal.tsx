import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Clock3 } from "lucide-react";
import { TimingSelector } from "./TimingSelector";
import type { CadenceAction, ScheduleRuleKind } from "@/pages/sales-cadence/types";

interface CallTaskModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: CadenceAction;
  onSave: (action: CadenceAction) => void;
  allowImmediately?: boolean;
  dayNumber: number;
}

export function CallTaskModal({
  open,
  onOpenChange,
  action,
  onSave,
  allowImmediately = false,
  dayNumber,
}: CallTaskModalProps) {
  const [kind, setKind] = useState<ScheduleRuleKind>(action.scheduleRule.kind);
  const [timeOfDay, setTimeOfDay] = useState<string>(action.scheduleRule.timeOfDay || "09:00");
  const [minutesAfterPrev, setMinutesAfterPrev] = useState<number>(
    action.scheduleRule.minutesAfterPrev || 10
  );
  const [title, setTitle] = useState<string>(action.config.call_task?.title || "Call lead");
  const [description, setDescription] = useState<string>(
    action.config.call_task?.description || ""
  );
  const [reminder, setReminder] = useState<number>(
    action.config.call_task?.reminderMinutesBefore ?? 15
  );
  const [watcherUserId, setWatcherUserId] = useState<string>(
    action.config.call_task?.watcherUserId || ""
  );

  useEffect(() => {
    setKind(action.scheduleRule.kind);
    setTimeOfDay(action.scheduleRule.timeOfDay || "09:00");
    setMinutesAfterPrev(action.scheduleRule.minutesAfterPrev || 10);
    setTitle(action.config.call_task?.title || "Call lead");
    setDescription(action.config.call_task?.description || "");
    setReminder(action.config.call_task?.reminderMinutesBefore ?? 15);
    setWatcherUserId(action.config.call_task?.watcherUserId || "");
  }, [action]);

  function save() {
    const updated: CadenceAction = {
      ...action,
      scheduleRule:
        kind === "timeOfDay"
          ? { kind, timeOfDay }
          : kind === "afterPrevious"
            ? { kind, minutesAfterPrev }
            : { kind },
      config: {
        ...action.config,
        call_task: {
          title,
          description,
          reminderMinutesBefore: (reminder as 0 | 15 | 30 | 60) ?? 15,
          watcherUserId: watcherUserId || undefined,
        },
      },
    };
    onSave(updated);
  }

  const reminderOptions = [
    { value: 0, label: "No Reminder", icon: BellOff },
    { value: 15, label: "15 Minutes", icon: Bell },
    { value: 30, label: "30 Minutes", icon: Bell },
    { value: 60, label: "1 Hour", icon: Clock3 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Configure Call Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Timing */}
          <TimingSelector
            kind={kind}
            timeOfDay={timeOfDay}
            minutesAfterPrev={minutesAfterPrev}
            onKindChange={setKind}
            onTimeOfDayChange={setTimeOfDay}
            onMinutesChange={setMinutesAfterPrev}
            allowImmediately={allowImmediately}
            disableTimeOfDay={dayNumber === 1}
            dayNumber={dayNumber}
          />

          {/* Task Details */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-white">Task Title</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call to discuss services"
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-white">Description (optional)</div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context or notes for this call..."
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 resize-none"
              rows={3}
            />
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-white">Reminder</div>
            <div className="grid grid-cols-2 gap-3">
              {reminderOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = reminder === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReminder(option.value)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${
                        isSelected
                          ? "border-orange-400 bg-orange-400/10"
                          : "border-slate-600 hover:border-slate-500 bg-slate-700/30"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-4 w-4 ${isSelected ? "text-orange-400" : "text-gray-400"}`}
                      />
                      <div
                        className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-300"}`}
                      >
                        {option.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-500 text-white hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button onClick={save} className="bg-orange-500 hover:bg-orange-600 text-white">
            Save Call Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
