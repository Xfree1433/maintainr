"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Server, ClipboardList, CalendarClock,
  BrainCircuit, Package, HardHat, Clock, BarChart3, ScrollText,
  Settings, Plus, CornerDownLeft, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: "navigate" | "create" | "action";
  keywords?: string;
}

const SEARCH_TYPE_ICONS: Record<string, React.ElementType> = {
  Asset: Server,
  "Work Order": ClipboardList,
  Part: Package,
  Technician: HardHat,
};

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const navCommands: CommandItem[] = [
    { id: "nav-dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: () => router.push("/dashboard"), category: "navigate", keywords: "home overview kpi" },
    { id: "nav-assets", label: "Go to Assets", icon: Server, action: () => router.push("/assets"), category: "navigate", keywords: "equipment machines" },
    { id: "nav-work-orders", label: "Go to Work Orders", icon: ClipboardList, action: () => router.push("/work-orders"), category: "navigate", keywords: "maintenance repair" },
    { id: "nav-schedules", label: "Go to Schedules", icon: CalendarClock, action: () => router.push("/schedules"), category: "navigate", keywords: "preventive schedule" },
    { id: "nav-predictive", label: "Go to Predictive", icon: BrainCircuit, action: () => router.push("/predictive"), category: "navigate", keywords: "sensor anomaly health" },
    { id: "nav-parts", label: "Go to Parts", icon: Package, action: () => router.push("/parts"), category: "navigate", keywords: "spare inventory stock" },
    { id: "nav-technicians", label: "Go to Technicians", icon: HardHat, action: () => router.push("/technicians"), category: "navigate", keywords: "team workers" },
    { id: "nav-downtime", label: "Go to Downtime", icon: Clock, action: () => router.push("/downtime"), category: "navigate", keywords: "outage failure" },
    { id: "nav-reports", label: "Go to Reports", icon: BarChart3, action: () => router.push("/reports"), category: "navigate", keywords: "mtbf mttr analytics" },
    { id: "nav-audit", label: "Go to Audit Trail", icon: ScrollText, action: () => router.push("/audit-log"), category: "navigate", keywords: "history log changes" },
    { id: "nav-settings", label: "Go to Settings", icon: Settings, action: () => router.push("/settings"), category: "navigate", keywords: "team profile api keys" },
  ];

  const createCommands: CommandItem[] = [
    { id: "create-asset", label: "New Asset", icon: Plus, action: () => router.push("/assets?action=new"), category: "create", keywords: "add equipment machine" },
    { id: "create-wo", label: "New Work Order", icon: Plus, action: () => router.push("/work-orders?action=new"), category: "create", keywords: "add maintenance" },
    { id: "create-part", label: "New Part", icon: Plus, action: () => router.push("/parts?action=new"), category: "create", keywords: "add spare" },
  ];

  const actionCommands: CommandItem[] = [
    {
      id: "toggle-theme",
      label: resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      action: toggleTheme,
      category: "action",
      keywords: "dark light mode theme toggle appearance",
    },
  ];

  const allCommands = [...navCommands, ...createCommands, ...actionCommands];

  const filteredCommands = query.length > 0
    ? allCommands.filter((cmd) => {
        const haystack = `${cmd.label} ${cmd.keywords || ""}`.toLowerCase();
        return query.toLowerCase().split(/\s+/).every((word) => haystack.includes(word));
      })
    : allCommands;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch {
        // silently fail
      }
      setSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const totalItems = filteredCommands.length + searchResults.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, totalItems]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchResults([]);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const executeItem = useCallback((index: number) => {
    if (index < filteredCommands.length) {
      filteredCommands[index].action();
    } else {
      const sr = searchResults[index - filteredCommands.length];
      if (sr) router.push(sr.link);
    }
    setOpen(false);
  }, [filteredCommands, searchResults, router]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(totalItems, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (totalItems > 0) executeItem(activeIndex);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative mx-auto mt-[15vh] w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length > 0 && (
            <>
              {query.length === 0 && (
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Navigation
                </div>
              )}
              {filteredCommands.map((cmd, i) => {
                const Icon = cmd.icon;
                const isActive = i === activeIndex;
                return (
                  <button
                    key={cmd.id}
                    data-index={i}
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => executeItem(i)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-orange-600" : "text-gray-400"}`} />
                    <span className="flex-1 truncate">{cmd.label}</span>
                    {cmd.category === "create" && (
                      <span className="shrink-0 rounded bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                        CREATE
                      </span>
                    )}
                    {cmd.category === "action" && (
                      <span className="shrink-0 rounded bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-400">
                        ACTION
                      </span>
                    )}
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                  </button>
                );
              })}
            </>
          )}
          {searchResults.length > 0 && (
            <>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Search Results
              </div>
              {searchResults.map((r, i) => {
                const idx = filteredCommands.length + i;
                const Icon = SEARCH_TYPE_ICONS[r.type] || Package;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    data-index={idx}
                    type="button"
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => executeItem(idx)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-orange-100 dark:bg-orange-900/40" : "bg-gray-100 dark:bg-gray-700"}`}>
                      <Icon className={`h-3.5 w-3.5 ${isActive ? "text-orange-600" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="truncate text-xs text-gray-500">{r.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-gray-400 uppercase">{r.type}</span>
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                  </button>
                );
              })}
            </>
          )}
          {searching && searchResults.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">Searching...</div>
          )}
          {query.length >= 2 && !searching && filteredCommands.length === 0 && searchResults.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 font-mono">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 font-mono">esc</kbd> close</span>
          </div>
          <span><kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1 py-0.5 font-mono">Ctrl+K</kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
}
