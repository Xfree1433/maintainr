"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ClipboardList,
  BrainCircuit,
  CalendarClock,
  Package,
} from "lucide-react";
import { QuickGuide } from "@/components/ui/quick-guide";

interface DashboardStats {
  openWorkOrders: number;
  overdueSchedules: number;
  activeAlerts: number;
  lowStockParts: number;
  assetStatusBreakdown: { status: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    user: { name: string | null } | null;
  }[];
  workOrderTrend: { date: string; count: number }[];
  uptimePercent: number;
}

const STATUS_BADGES: Record<string, string> = {
  OPERATIONAL: "bg-green-100 text-green-800",
  DEGRADED: "bg-yellow-100 text-yellow-800",
  DOWN: "bg-red-100 text-red-800",
  MAINTENANCE: "bg-blue-100 text-blue-800",
  DECOMMISSIONED: "bg-gray-100 text-gray-800",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/dashboard/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  const kpis = [
    {
      label: "Open Work Orders",
      value: stats.openWorkOrders,
      icon: ClipboardList,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Active Alerts",
      value: stats.activeAlerts,
      icon: BrainCircuit,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Overdue Schedules",
      value: stats.overdueSchedules,
      icon: CalendarClock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Low Stock Parts",
      value: stats.lowStockParts,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
  ];

  const trendData = stats.workOrderTrend.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    count: d.count,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <QuickGuide
        title="Quick Guide: Dashboard"
        steps={[
          "View key maintenance KPIs including open work orders, active alerts, overdue schedules, and low stock parts at a glance.",
          "Monitor asset status breakdown to see how many assets are operational, degraded, or down.",
          "Track work order trends over the past 7 days to identify patterns in maintenance activity.",
          "Review recent activity feed for the latest changes across your organization.",
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="border rounded-lg p-4 bg-white flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Asset Status + Uptime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">
            Asset Status Breakdown
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.assetStatusBreakdown.map((s) => (
              <span
                key={s.status}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_BADGES[s.status] ?? "bg-gray-100 text-gray-800"}`}
              >
                {s.status}: {s.count}
              </span>
            ))}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-white flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">
            7-Day Uptime
          </h2>
          <p className="text-5xl font-bold text-orange-600">
            {stats.uptimePercent}%
          </p>
        </div>
      </div>

      {/* Work Order Trend */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          Work Orders (Last 7 Days)
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#ea580c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="border rounded-lg p-4 bg-white">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          Recent Activity
        </h2>
        {stats.recentActivity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {stats.recentActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between text-sm border-b pb-2 last:border-0"
              >
                <div>
                  <span className="font-medium">
                    {entry.user?.name ?? "System"}
                  </span>{" "}
                  <span className="text-gray-500">{entry.action}</span>{" "}
                  <span className="text-gray-400">
                    {entry.entityType}
                    {entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ""}
                  </span>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
