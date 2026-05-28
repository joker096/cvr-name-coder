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
  <div className={cn("px-3 mb-1", className)}>
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between bg-[#161618] border border-[#222] rounded-lg px-2.5 py-1.5 text-[10px] font-mono tracking-[1px] text-[#999] hover:text-[#ccc] transition-colors"
    >
      <div className="flex items-center gap-1.5">
        {isOpen ? (
          <ChevronDown className="w-2.5 h-2.5 text-[#555]" />
        ) : (
          <ChevronRight className="w-2.5 h-2.5 text-[#555]" />
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
          className="bg-[#161618] border border-t-0 border-[#222] rounded-b-lg -mt-[1px] px-3 py-2 max-h-[300px] overflow-y-auto"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));
