import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CadenceModel, StopCondition } from "@/pages/sales-cadence/types";

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface CadenceSettingsProps {
  model: CadenceModel;
  onUpdate: (updates: Partial<CadenceModel>) => void;
  currentUser?: { id: number; email: string; firstName?: string; lastName?: string };
  isAdmin?: boolean;
}

const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

const STOP_CONDITIONS: { value: StopCondition; label: string }[] = [
  { value: "lead_replied_email", label: "Lead replied to email" },
  { value: "lead_replied_sms", label: "Lead responds to SMS" },
  { value: "incoming_call_logged", label: "Incoming call connected and logged" },
  { value: "outgoing_call_logged", label: "Outgoing call connected and logged" },
  { value: "meeting_booked", label: "Meeting booked" },
  { value: "lead_stage_change", label: "Lead stage change" },
  { value: "lead_unsubscribed", label: "Lead unsubscribed" },
];

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function CadenceSettings({
  model,
  onUpdate,
  currentUser,
  isAdmin: _isAdmin,
}: CadenceSettingsProps) {
  const [newTag, setNewTag] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch all users for assignee selection
  const { data: usersData } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => await apiRequest<{ users: User[] }>("GET", "/api/admin/users"),
  });
  const users = usersData?.users || [];

  // Fetch lead stages for stop condition configuration
  const { data: stagesData } = useQuery({
    queryKey: ["/api/crm/lead-config"],
    queryFn: async () =>
      await apiRequest<{ stagesDetailed?: Array<{ id: string; name: string; order: number }> }>(
        "GET",
        "/api/crm/lead-config"
      ),
  });
  const leadStages = stagesData?.stagesDetailed || [];

  function addTag() {
    if (!newTag.trim()) return;
    const tags = model.tags || [];
    if (!tags.includes(newTag.trim())) {
      onUpdate({ tags: [...tags, newTag.trim()] });
      setNewTag("");
    }
  }

  function removeTag(tag: string) {
    onUpdate({ tags: (model.tags || []).filter((t) => t !== tag) });
  }

  function toggleBusinessHoursDay(day: number) {
    const days = model.businessHours?.days || [];
    onUpdate({
      businessHours: {
        ...model.businessHours!,
        days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
      },
    });
  }

  function toggleStopCondition(condition: StopCondition) {
    const conditions = model.stopConditions?.conditions || [];
    onUpdate({
      stopConditions: {
        ...model.stopConditions!,
        conditions: conditions.includes(condition)
          ? conditions.filter((c) => c !== condition)
          : [...conditions, condition],
      },
    });
  }

  function toggleAssignee(userId: string) {
    const assignedTo = model.trigger?.config?.assignedTo || [];
    if (!Array.isArray(assignedTo)) return; // Only works in specific mode

    onUpdate({
      trigger: {
        type: "lead_assigned",
        config: {
          assignedTo: assignedTo.includes(userId)
            ? assignedTo.filter((id) => id !== userId)
            : [...assignedTo, userId],
        },
      },
    });
  }

  function toggleStageTarget(stageId: string) {
    const targets = model.stopConditions?.stageChangeTargets || [];
    onUpdate({
      stopConditions: {
        ...model.stopConditions!,
        stageChangeTargets: targets.includes(stageId)
          ? targets.filter((id) => id !== stageId)
          : [...targets, stageId],
      },
    });
  }

  // Get timezone label for summary
  const timezoneLabel =
    US_TIMEZONES.find((tz) => tz.value === model.timezone)?.label || model.timezone;

  // Check if settings are complete
  const isComplete = model.name && model.timezone && model.trigger;

  // Collapsed Summary View
  if (isCollapsed) {
    return (
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Settings className="h-5 w-5 text-orange-400" />
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-white font-medium">{model.name || "New Cadence"}</span>
                <span className="text-gray-400">•</span>
                <Badge
                  variant={model.isActive ? "default" : "secondary"}
                  className={model.isActive ? "bg-green-600" : ""}
                >
                  {model.isActive ? "Active" : "Inactive"}
                </Badge>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-300">{timezoneLabel}</span>
                {model.tags && model.tags.length > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <div className="flex gap-1.5">
                      {model.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs border-slate-500 text-gray-300"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {model.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs border-slate-500 text-gray-300">
                          +{model.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
              {!isComplete && (
                <Badge variant="outline" className="border-orange-400 text-orange-400">
                  ⚠️ Incomplete
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="text-gray-300 hover:text-white hover:bg-slate-700"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Expand Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full Expanded View
  return (
    <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-slate-600/50 backdrop-blur-xl border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">Cadence Settings</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="text-gray-300 hover:text-white hover:bg-slate-700"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Minimize
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cadence-name" className="text-white">
                Cadence Name
              </Label>
              <Input
                id="cadence-name"
                value={model.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="e.g., New Lead Nurture"
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-white">
                Timezone
              </Label>
              <Select value={model.timezone} onValueChange={(timezone) => onUpdate({ timezone })}>
                <SelectTrigger
                  id="timezone"
                  className="bg-slate-700/50 border-slate-600 text-white"
                >
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {US_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={model.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Describe the purpose of this cadence..."
              className="bg-slate-700/50 border-slate-600 text-white min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="bg-slate-700/50 border-slate-600 text-white"
              />
              <Button onClick={addTag} variant="outline" className="border-slate-500 text-white">
                Add
              </Button>
            </div>
            {model.tags && model.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {model.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-slate-600 text-white">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-400"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is-active"
              checked={model.isActive}
              onCheckedChange={(isActive) => onUpdate({ isActive })}
            />
            <Label htmlFor="is-active" className="font-normal text-white">
              Active - Cadence will run automatically for new leads
            </Label>
          </div>

          {model.ownerUserId && (
            <div className="space-y-2">
              <Label className="text-white">Owner</Label>
              <div className="text-sm text-gray-300">{currentUser?.email || model.ownerUserId}</div>
            </div>
          )}
        </div>

        {/* Advanced Settings */}
        <Accordion type="multiple" className="w-full">
          {/* Trigger Settings */}
          <AccordionItem value="trigger" className="border-slate-600">
            <AccordionTrigger className="text-white hover:text-orange-200">
              Trigger Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-white">Run for</Label>
                <Select
                  value={Array.isArray(model.trigger?.config?.assignedTo) ? "specific" : "all"}
                  onValueChange={(value) => {
                    onUpdate({
                      trigger: {
                        type: "lead_assigned",
                        config: { assignedTo: value === "all" ? null : [] },
                      },
                    });
                  }}
                >
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    <SelectItem value="specific">Specific users only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  Choose whether this cadence runs for all lead assignments or only specific users
                </p>
              </div>

              {/* User Selection (only shown in specific mode) */}
              {Array.isArray(model.trigger?.config?.assignedTo) && (
                <div className="space-y-3 pl-4 border-l-2 border-orange-400/50">
                  <Label className="text-white">Select Users</Label>
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-400">Loading users...</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {users.map((user: User) => (
                        <div key={user.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={model.trigger?.config?.assignedTo?.includes(String(user.id))}
                            onCheckedChange={() => toggleAssignee(String(user.id))}
                          />
                          <Label
                            htmlFor={`user-${user.id}`}
                            className="font-normal text-white cursor-pointer flex-1"
                          >
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email}
                            {/* Displaying user role for informational purposes, not for authorization */}
                            {/* eslint-disable-next-line rbac/no-direct-role-checks */}
                            {user.role && (
                              <span className="text-xs text-gray-400 ml-2">({user.role})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(model.trigger?.config?.assignedTo) &&
                    model.trigger.config.assignedTo.length === 0 && (
                      <p className="text-xs text-yellow-400">
                        ⚠️ No users selected. Cadence will not run until you select at least one
                        user.
                      </p>
                    )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Execution Rules */}
          <AccordionItem value="execution" className="border-slate-600">
            <AccordionTrigger className="text-white hover:text-orange-200">
              Execution Rules
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="max-concurrent" className="text-white">
                  Max Concurrent Runs per Lead
                </Label>
                <Input
                  id="max-concurrent"
                  type="number"
                  min="1"
                  value={model.maxConcurrentRuns || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onUpdate({ maxConcurrentRuns: isNaN(val) || val <= 0 ? 1 : val });
                  }}
                  placeholder="1 (recommended)"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
                <p className="text-xs text-gray-400">
                  Prevents the same lead from entering this cadence multiple times simultaneously
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Business Hours */}
          <AccordionItem value="business-hours" className="border-slate-600">
            <AccordionTrigger className="text-white hover:text-orange-200">
              Business Hours
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="business-hours-enabled"
                  checked={model.businessHours?.enabled || false}
                  onCheckedChange={(enabled) =>
                    onUpdate({
                      businessHours: { ...model.businessHours!, enabled },
                    })
                  }
                />
                <Label htmlFor="business-hours-enabled" className="font-normal text-white">
                  Only run during business hours
                </Label>
              </div>

              {model.businessHours?.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="text-white">
                        Start Time
                      </Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={model.businessHours.startTime}
                        onChange={(e) =>
                          onUpdate({
                            businessHours: { ...model.businessHours!, startTime: e.target.value },
                          })
                        }
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time" className="text-white">
                        End Time
                      </Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={model.businessHours.endTime}
                        onChange={(e) =>
                          onUpdate({
                            businessHours: { ...model.businessHours!, endTime: e.target.value },
                          })
                        }
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Active Days</Label>
                    <div className="flex gap-2">
                      {WEEKDAYS.map((day) => (
                        <Button
                          key={day.value}
                          variant={
                            model.businessHours?.days?.includes(day.value) ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => toggleBusinessHoursDay(day.value)}
                          className={
                            model.businessHours?.days?.includes(day.value)
                              ? "bg-orange-500 hover:bg-orange-600"
                              : "border-slate-500 text-white"
                          }
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Stop Conditions */}
          <AccordionItem value="stop-conditions" className="border-slate-600">
            <AccordionTrigger className="text-white hover:text-orange-200">
              Stop Conditions
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="stop-conditions-enabled"
                  checked={model.stopConditions?.enabled || false}
                  onCheckedChange={(enabled) =>
                    onUpdate({
                      stopConditions: { ...model.stopConditions!, enabled },
                    })
                  }
                />
                <Label htmlFor="stop-conditions-enabled" className="font-normal text-white">
                  Auto-stop cadence when conditions are met
                </Label>
              </div>

              {model.stopConditions?.enabled && (
                <div className="space-y-3">
                  <Label className="text-white">Stop if:</Label>
                  {STOP_CONDITIONS.map((condition) => (
                    <div key={condition.value}>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`stop-${condition.value}`}
                          checked={model.stopConditions?.conditions?.includes(condition.value)}
                          onCheckedChange={() => toggleStopCondition(condition.value)}
                        />
                        <Label
                          htmlFor={`stop-${condition.value}`}
                          className="font-normal text-white cursor-pointer"
                        >
                          {condition.label}
                        </Label>
                      </div>

                      {/* Stage Selection (shown right after lead_stage_change checkbox) */}
                      {condition.value === "lead_stage_change" &&
                        model.stopConditions?.conditions?.includes("lead_stage_change") && (
                          <div className="mt-3 ml-6 space-y-3 pl-4 border-l-2 border-orange-400/50">
                            <Label className="text-white">
                              Stop when lead moves to these stages:
                            </Label>
                            {leadStages.length === 0 ? (
                              <p className="text-sm text-gray-400">Loading stages...</p>
                            ) : (
                              <div className="space-y-2">
                                {leadStages.map(
                                  (stage: { id: string; name: string; order: number }) => (
                                    <div key={stage.id} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`stage-${stage.id}`}
                                        checked={model.stopConditions?.stageChangeTargets?.includes(
                                          stage.id
                                        )}
                                        onCheckedChange={() => toggleStageTarget(stage.id)}
                                      />
                                      <Label
                                        htmlFor={`stage-${stage.id}`}
                                        className="font-normal text-white cursor-pointer"
                                      >
                                        {stage.name}
                                      </Label>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            {(!model.stopConditions?.stageChangeTargets ||
                              model.stopConditions.stageChangeTargets.length === 0) && (
                              <p className="text-xs text-yellow-400">
                                ⚠️ No stages selected. Cadence will stop on ANY stage change.
                              </p>
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
