import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { TimingSelector } from "./TimingSelector";
import { VariablePicker } from "./VariablePicker";
import type { CadenceAction, ScheduleRuleKind } from "@/pages/sales-cadence/types";

interface SmsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: CadenceAction;
  onSave: (action: CadenceAction) => void;
  allowImmediately?: boolean;
  dayNumber: number;
}

export function SmsModal({
  open,
  onOpenChange,
  action,
  onSave,
  allowImmediately = false,
  dayNumber,
}: SmsModalProps) {
  const [kind, setKind] = useState<ScheduleRuleKind>(action.scheduleRule.kind);
  const [timeOfDay, setTimeOfDay] = useState<string>(action.scheduleRule.timeOfDay || "09:00");
  const [minutesAfterPrev, setMinutesAfterPrev] = useState<number>(
    action.scheduleRule.minutesAfterPrev || 10
  );
  const [body, setBody] = useState<string>(
    action.config.sms?.body || "Hi {{firstName}}, quick intro from Seed Financial."
  );
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  useEffect(() => {
    setKind(action.scheduleRule.kind);
    setTimeOfDay(action.scheduleRule.timeOfDay || "09:00");
    setMinutesAfterPrev(action.scheduleRule.minutesAfterPrev || 10);
    setBody(action.config.sms?.body || "Hi {{firstName}}, quick intro from Seed Financial.");
  }, [action]);

  const charCount = body.length;
  const segmentCount = Math.ceil(charCount / 160);
  const isOver160 = charCount > 160;

  function insertVariable(variable: string) {
    const newBody = body.slice(0, cursorPosition) + variable + body.slice(cursorPosition);
    setBody(newBody);
    setCursorPosition(cursorPosition + variable.length);
  }

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
        sms: { ...(action.config.sms || {}), body },
      },
    };
    onSave(updated);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-white">Configure SMS</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-4">
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

            {/* Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">Message</div>
                <div className={`text-xs ${isOver160 ? "text-orange-400" : "text-gray-400"}`}>
                  {charCount} / {segmentCount} {segmentCount === 1 ? "segment" : "segments"}
                </div>
              </div>

              <Textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setCursorPosition(e.target.selectionStart || 0);
                }}
                onSelect={(e) =>
                  setCursorPosition((e.target as HTMLTextAreaElement).selectionStart || 0)
                }
                placeholder="Type your message..."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400 min-h-[120px] resize-none"
                rows={6}
              />

              <div className="flex items-center justify-between">
                <VariablePicker onInsert={insertVariable} />
                {isOver160 && (
                  <div className="text-xs text-orange-400">
                    ⚠️ Long messages may be split into {segmentCount} parts
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Phone Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-lg border border-slate-600 p-6">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-3">Preview</div>
            <div className="relative">
              {/* Phone Frame */}
              <div className="w-64 h-96 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border-4 border-slate-700 shadow-2xl p-4 flex flex-col">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-3">
                  <span>9:41 AM</span>
                  <div className="flex gap-1">
                    <Smartphone className="h-3 w-3" />
                  </div>
                </div>

                {/* Message Bubble */}
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 text-center mb-2">Today 9:41 AM</div>
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%] text-sm break-words">
                        {body || "Your message will appear here..."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
            Save SMS Action
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
