"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface QuickGuideProps {
  title: string;
  steps: string[];
}

export function QuickGuide({ title, steps }: QuickGuideProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-orange-800 hover:bg-orange-100 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 pt-0">
          <ul className="space-y-1.5 text-sm text-orange-700">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-semibold text-orange-500 shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
