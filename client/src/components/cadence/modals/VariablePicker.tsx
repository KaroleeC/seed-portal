import { useState, useRef, useEffect } from "react";
import { Hash } from "lucide-react";

interface VariablePickerProps {
  onInsert: (variable: string) => void;
}

const VARIABLES = [
  { key: "{{firstName}}", label: "First Name", example: "John" },
  { key: "{{lastName}}", label: "Last Name", example: "Smith" },
  { key: "{{companyName}}", label: "Company Name", example: "Acme Corp" },
  { key: "{{email}}", label: "Email", example: "john@acme.com" },
  { key: "{{phone}}", label: "Phone", example: "(555) 123-4567" },
];

export function VariablePicker({ onInsert }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600 rounded-md hover:bg-slate-700 text-gray-300 hover:text-white transition-colors"
      >
        <Hash className="h-3.5 w-3.5" />
        Insert Variable
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Available Variables
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {VARIABLES.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => {
                  onInsert(variable.key);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{variable.label}</div>
                    <div className="text-xs text-orange-400 font-mono mt-0.5">{variable.key}</div>
                  </div>
                  <div className="text-xs text-gray-400 italic">{variable.example}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
