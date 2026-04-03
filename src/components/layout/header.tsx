"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Search, Menu, Check, ExternalLink, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { useSidebar } from "./sidebar";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  ALERT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  WORK_ORDER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SCHEDULE_DUE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PREDICTIVE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  PART_LOW_STOCK: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DOWNTIME: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  TEAM: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  SYSTEM: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function Header() {
  const { toggle } = useSidebar();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAsRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggle} title="Open menu">
          <Menu className="h-5 w-5" />
        </Button>

        <button
          type="button"
          className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-64 lg:w-80"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
          }}
        >
          <Search className="h-4 w-4 text-gray-400" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Ctrl+K</kbd>
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
          }}
          title="Search"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            title="Notifications"
            onClick={() => {
              setShowNotifs((v) => !v);
              if (!showNotifs) fetchNotifications();
            }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full p-0 text-[10px]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-[28rem] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 font-medium"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        !n.read ? "bg-orange-50/50 dark:bg-orange-900/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLORS[n.type] || TYPE_COLORS.SYSTEM}`}>
                              {n.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                          {n.link && (
                            <Link
                              href={n.link}
                              className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline mt-1"
                              onClick={() => {
                                if (!n.read) markAsRead(n.id);
                                setShowNotifs(false);
                              }}
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                        {!n.read && (
                          <button
                            type="button"
                            className="shrink-0 p-1 text-gray-400 hover:text-orange-600"
                            title="Mark as read"
                            onClick={() => markAsRead(n.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-sm font-medium text-white">
            M
          </div>
        </div>
      </div>
    </header>
  );
}
