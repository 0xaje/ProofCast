import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? "Switch to Day mode" : "Switch to Night mode"}
      title={isDark ? "Switch to Day mode (Light)" : "Switch to Night mode (Dark)"}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer ${
        isDark
          ? "border-white/10 bg-[#0a0e14]/90 text-[#f5f6f2] hover:border-[#c8f06a]/50 hover:bg-[#c8f06a]/10 hover:shadow-[0_0_15px_rgba(200,240,106,0.2)]"
          : "border-black/10 bg-white text-[#151515] shadow-sm hover:border-black/20 hover:bg-slate-50 hover:shadow-md"
      } active:scale-95 ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun
            size={18}
            className="text-[#eab308] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110"
          />
        ) : (
          <Moon
            size={18}
            className="text-[#6366f1] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
          />
        )}
      </div>
    </button>
  );
}
