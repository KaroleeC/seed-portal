import React from "react";
import { Button } from "@/components/ui/button";

interface FormNavigationProps {
  activeServices: ("bookkeeping" | "taas")[];
  currentFormView: "bookkeeping" | "taas";
  onViewChange: (view: "bookkeeping" | "taas") => void;
}

export function FormNavigation({
  activeServices,
  currentFormView,
  onViewChange,
}: FormNavigationProps) {
  if (activeServices.length <= 1) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg p-1 flex items-center gap-1">
          {activeServices.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => onViewChange(service)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                currentFormView === service
                  ? "bg-white shadow-sm text-[#e24c00] border border-gray-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {service === "bookkeeping" ? "Bookkeeping" : "Tax Service"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
