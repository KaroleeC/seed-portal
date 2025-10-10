import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Settings, Eye } from "lucide-react";
import { RichTextEditor, type RichTextEditorRef } from "@/components/RichTextEditor";
import { TimingSelector } from "./TimingSelector";
import { VariablePicker } from "./VariablePicker";
import type { CadenceAction, ScheduleRuleKind } from "@/pages/sales-cadence/types";

interface EmailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: CadenceAction;
  onSave: (action: CadenceAction) => void;
  allowImmediately?: boolean;
  dayNumber: number;
}

export function EmailModal({
  open,
  onOpenChange,
  action,
  onSave,
  allowImmediately = false,
  dayNumber,
}: EmailModalProps) {
  const [kind, setKind] = useState<ScheduleRuleKind>(action.scheduleRule.kind);
  const [timeOfDay, setTimeOfDay] = useState<string>(action.scheduleRule.timeOfDay || "09:00");
  const [minutesAfterPrev, setMinutesAfterPrev] = useState<number>(
    action.scheduleRule.minutesAfterPrev || 10
  );
  const [subject, setSubject] = useState<string>(
    action.config.email?.subject || "Quick intro from Seed Financial"
  );
  const [fromName, setFromName] = useState<string>(action.config.email?.fromName || "");
  const [signature, setSignature] = useState<string>(action.config.email?.signature || "");
  const [bodyHtml, setBodyHtml] = useState<string>(
    action.config.email?.bodyHtml ||
      "<p>Hi {{firstName}},</p><p>Great to meet you. I'd love to connect.</p>"
  );
  const editorRef = useRef<RichTextEditorRef>(null);

  useEffect(() => {
    setKind(action.scheduleRule.kind);
    setTimeOfDay(action.scheduleRule.timeOfDay || "09:00");
    setMinutesAfterPrev(action.scheduleRule.minutesAfterPrev || 10);
    setSubject(action.config.email?.subject || "Quick intro from Seed Financial");
    setFromName(action.config.email?.fromName || "");
    setSignature(action.config.email?.signature || "");
    setBodyHtml(
      action.config.email?.bodyHtml ||
        "<p>Hi {{firstName}},</p><p>Great to meet you. I'd love to connect.</p>"
    );
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
        email: { ...(action.config.email || {}), subject, bodyHtml, fromName, signature },
      },
    };
    onSave(updated);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-white">Configure Email</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/50">
            <TabsTrigger value="settings" className="data-[state=active]:bg-orange-500">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-orange-500">
              <FileText className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-orange-500">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-white">From Name</div>
                <Input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Optional"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-white">Signature</div>
                <Input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Optional"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <div className="text-sm font-medium text-white">Subject Line</div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white">Email Body</div>
                <VariablePicker onInsert={(v) => editorRef.current?.insertContent(` ${v} `)} />
              </div>
              <div className="bg-white rounded-lg p-2">
                <RichTextEditor
                  ref={editorRef}
                  content={bodyHtml}
                  onChange={setBodyHtml}
                  height={300}
                />
              </div>
              <div className="text-xs text-gray-400">
                Available: {`{{firstName}}`}, {`{{lastName}}`}, {`{{companyName}}`}
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="mt-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-white rounded-lg p-8 text-gray-900">
              <div className="max-w-2xl mx-auto">
                <div className="border-b border-gray-200 pb-4 mb-6">
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">From:</span> {fromName || "Your Name"}{" "}
                    &lt;you@seedfinancial.io&gt;
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Subject:</span> {subject || "No subject"}
                  </div>
                </div>

                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: bodyHtml || "<p>Your email content will appear here...</p>",
                  }}
                />

                {signature && (
                  <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
                    {signature}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
            Save Email Action
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
