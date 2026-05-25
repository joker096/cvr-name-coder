import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";

interface AccordionItemProps {
  id: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const AccordionItem = memo<AccordionItemProps>(({
  id,
  isOpen,
  onToggle,
  header,
  children,
  className,
}) => (
  <div className={cn("px-4 mb-1.5", className)}>
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between bg-[#161618] border border-[#222] rounded-lg px-3.5 py-2.5 text-[11px] font-mono tracking-[1.5px] text-[#999] hover:text-[#ccc] transition-colors"
    >
      <div className="flex items-center gap-2">
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-[#555]" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[#555]" />
        )}
        {header}
      </div>
    </button>

    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-[#161618] border border-t-0 border-[#222] rounded-b-lg -mt-[1px] px-3.5 py-3 max-h-[350px] overflow-y-auto"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));
