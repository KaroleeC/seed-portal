import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Phone } from "lucide-react";
import type { ActionType } from "@/pages/sales-cadence/types";

interface AddActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (type: ActionType) => void;
  dayNumber: number;
}

const ACTION_TYPES: Array<{
  type: ActionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    type: "sms",
    label: "SMS",
    icon: <MessageSquare className="h-6 w-6" />,
    description: "Send a text message to the lead",
  },
  {
    type: "email",
    label: "Email",
    icon: <Mail className="h-6 w-6" />,
    description: "Send an email to the lead",
  },
  {
    type: "call_task",
    label: "Call Task",
    icon: <Phone className="h-6 w-6" />,
    description: "Create a task to call the lead",
  },
];

export function AddActionModal({
  isOpen,
  onClose,
  onSelectAction,
  dayNumber,
}: AddActionModalProps) {
  const handleSelect = (type: ActionType) => {
    onSelectAction(type);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add Action to Day {dayNumber}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-300 mb-4">Choose the type of action you want to add:</p>

          <div className="space-y-3">
            {ACTION_TYPES.map((action) => (
              <Button
                key={action.type}
                variant="outline"
                className="w-full h-auto p-4 flex items-start gap-4 text-left border-slate-600 hover:border-orange-400 hover:bg-slate-700 transition-all"
                onClick={() => handleSelect(action.type)}
              >
                <div className="text-orange-400 mt-0.5">{action.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-white mb-1">{action.label}</div>
                  <div className="text-sm text-gray-400">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
