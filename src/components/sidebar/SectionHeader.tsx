import React from "react";
import { HelpCircle } from "lucide-react";
import type { SectionDef } from "./sectionConfig";

interface SectionHeaderProps {
  section: SectionDef;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ section }) => {
  const Icon = section.icon;

  return (
    <div className="flex items-center gap-2 w-full">
      <Icon className="w-3.5 h-3.5 text-[#777]" />
      {section.label}
      <span className="relative group ml-auto">
        <HelpCircle className="w-3 h-3 text-[#555] hover:text-[#888] cursor-help" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 px-2.5 py-1.5 bg-neutral-950 border border-[#333] rounded text-[10px] leading-relaxed text-[#aaa] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 shadow-xl">
          {section.help}
        </span>
      </span>
      {section.count !== undefined && (
        <span className="bg-[#1a1a1e] border border-[#333] rounded px-2 py-0.5 text-[10px] text-[#888]">
          {section.count}
        </span>
      )}
    </div>
  );
};