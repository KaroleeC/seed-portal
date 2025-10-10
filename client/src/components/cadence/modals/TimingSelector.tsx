import { Zap, Clock, Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ScheduleRuleKind } from "@/pages/sales-cadence/types";

interface TimingSelectorProps {
  kind: ScheduleRuleKind;
  timeOfDay?: string;
  minutesAfterPrev?: number;
  onKindChange: (kind: ScheduleRuleKind) => void;
  onTimeOfDayChange: (time: string) => void;
  onMinutesChange: (minutes: number) => void;
  allowImmediately?: boolean;
  disableTimeOfDay?: boolean;
  dayNumber?: number;
}

export function TimingSelector({
  kind,
  timeOfDay = "09:00",
  minutesAfterPrev = 10,
  onKindChange,
  onTimeOfDayChange,
  onMinutesChange,
  allowImmediately = false,
  disableTimeOfDay = false,
  dayNumber,
}: TimingSelectorProps) {
  const options = [
    {
      value: "immediately" as const,
      icon: Zap,
      label: "Immediately",
      description: "Send right away",
      disabled: !allowImmediately,
      disabledReason: "Day 1, Action 1 only",
    },
    {
      value: "timeOfDay" as const,
      icon: Clock,
      label: "Time of Day",
      description: "Specific time",
      disabled: disableTimeOfDay,
      disabledReason: "Not available on Day 1",
    },
    {
      value: "afterPrevious" as const,
      icon: Timer,
      label: "After Previous",
      description: "Wait X minutes",
      disabled: false,
      disabledReason: undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-white">When to send</div>

      {/* Icon Cards */}
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = kind === option.value;
          const isDisabled = option.disabled;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isDisabled && onKindChange(option.value)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? "border-orange-400 bg-orange-400/10"
                    : "border-slate-600 hover:border-slate-500 bg-slate-700/30"
                }
                ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon className={`h-6 w-6 ${isSelected ? "text-orange-400" : "text-gray-400"}`} />
                <div className="text-center">
                  <div
                    className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-300"}`}
                  >
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Helper text for disabled options */}
      {(disableTimeOfDay || !allowImmediately) && (
        <div className="text-xs text-gray-400 italic">
          {!allowImmediately && "Immediately is only available for the first action on Day 1"}
          {!allowImmediately && disableTimeOfDay && " • "}
          {disableTimeOfDay && "Time of Day is not available on Day 1"}
        </div>
      )}

      {/* Time Input */}
      {kind === "timeOfDay" && (
        <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
          <Clock className="h-4 w-4 text-orange-400" />
          <span className="text-sm text-gray-300">Time:</span>
          <Input
            type="time"
            value={timeOfDay}
            onChange={(e) => onTimeOfDayChange(e.target.value)}
            className="w-32 bg-slate-700/50 border-slate-600 text-white"
          />
        </div>
      )}

      {/* Minutes Input */}
      {kind === "afterPrevious" && (
        <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
          <Timer className="h-4 w-4 text-orange-400" />
          <span className="text-sm text-gray-300">Wait:</span>
          <Input
            type="number"
            value={minutesAfterPrev}
            onChange={(e) => onMinutesChange(parseInt(e.target.value || "0", 10))}
            className="w-24 bg-slate-700/50 border-slate-600 text-white"
            min="1"
          />
          <span className="text-sm text-gray-300">minutes after previous action</span>
        </div>
      )}
    </div>
  );
}
