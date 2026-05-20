import { useState, useEffect } from "react";
import { Zap, Heart, Droplets, Coins, Star } from "lucide-react";
import { getGamerState, completeTask } from "../../server/gamerState";
import type { GamerState } from "../../server/gamerState";

export default function GamerStatusBar() {
  const [gamer, setGamer] = useState<GamerState>(getGamerState());
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGamer({ ...getGamerState() });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const levelUpAnim = leveledUp ? "animate-bounce" : "";

  return (
    <div className="flex items-center gap-1 sm:gap-2 md:gap-3 ml-auto overflow-x-auto custom-scrollbar no-scrollbar py-2">
      {/* Optimal Badge */}
      <div className="inline-flex items-center justify-center cursor-help" tabIndex={0}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg cursor-help transition-all shadow-sm" style={{ transform: "none" }}>
          <div className="text-emerald-500 transition-colors">
            <Zap className="w-3 h-3" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-500">
              {gamer.optimal ? "Optimal" : "Active"}
            </span>
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(103, gamer.optimal ? 103 : 60 + gamer.focus * 0.4)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Health + Focus Bars */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
        {/* Health */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1 group">
          <div className="flex items-center gap-1 sm:gap-1.5 text-rose-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">
            <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
            <span className="hidden sm:inline">Health</span>
          </div>
          <div className="w-14 sm:w-20 lg:w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)] transition-all duration-500"
              style={{ width: `${gamer.health}%` }}
            />
          </div>
        </div>

        {/* Focus */}
        <div className="flex flex-col items-center gap-0.5 sm:gap-1 group">
          <div className="flex items-center gap-1 sm:gap-1.5 text-blue-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">
            <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
            <span className="hidden sm:inline">Focus</span>
          </div>
          <div className="w-14 sm:w-20 lg:w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all duration-500"
              style={{ width: `${gamer.focus}%` }}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-6 sm:h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

      {/* Coins + Level */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0">
        {/* Coins */}
        <div className="inline-flex items-center justify-center cursor-help" tabIndex={0}>
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg whitespace-nowrap">
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
              {gamer.coins}
            </span>
          </div>
        </div>

        {/* Level */}
        <div
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-primary/10 text-primary rounded-lg text-xs sm:text-sm font-bold shadow-sm whitespace-nowrap ${levelUpAnim}`}
          onClick={() => {
            completeTask();
            setGamer({ ...getGamerState() });
            setLeveledUp(true);
            setTimeout(() => setLeveledUp(false), 600);
          }}
        >
          <Star className="w-3 sm:w-4 sm:h-4" />
          LVL {gamer.level}
        </div>
      </div>
    </div>
  );
}
