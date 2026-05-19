import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DashboardSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title, icon: Icon, count, defaultOpen = false, children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card-interactive overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-dash-text-muted" />
        ) : (
          <ChevronRight className="w-3 h-3 text-dash-text-muted" />
        )}
        <Icon className="w-3.5 h-3.5 text-dash-text-secondary" />
        <span className="text-[11px] font-mono uppercase tracking-wider text-dash-text-secondary flex-1 text-left">
          {title}
        </span>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-dash-text-muted bg-dash-bg px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-dash-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
