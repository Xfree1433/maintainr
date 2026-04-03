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
import { QuickGuide } from "@/components/ui/quick-guide";

type Tab = "mtbf" | "mttr" | "costs";

interface MtbfEntry {
  assetTag: string;
  name: string;
  mtbfHours: number;
}

interface MttrEntry {
  assetTag: string;
  name: string;
  mttrHours: number;
}

interface CostEntry {
  assetTag: string;
  name: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mtbf");
  const [mtbfData, setMtbfData] = useState<MtbfEntry[]>([]);
  const [mttrData, setMttrData] = useState<MttrEntry[]>([]);
  const [costsData, setCostsData] = useState<CostEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMtbf = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reports/mtbf");
    if (res.ok) setMtbfData(await res.json());
    setLoading(false);
  }, []);

  const fetchMttr = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reports/mttr");
    if (res.ok) setMttrData(await res.json());
    setLoading(false);
  }, []);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/reports/costs");
    if (res.ok) setCostsData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "mtbf") fetchMtbf();
    else if (activeTab === "mttr") fetchMttr();
    else fetchCosts();
  }, [activeTab, fetchMtbf, fetchMttr, fetchCosts]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "mtbf", label: "MTBF" },
    { key: "mttr", label: "MTTR" },
    { key: "costs", label: "Costs" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <QuickGuide
        title="Quick Guide: Reports"
        steps={[
          "MTBF (Mean Time Between Failures) shows average uptime between unplanned breakdowns per asset.",
          "MTTR (Mean Time To Repair) shows average repair duration for corrective and emergency work orders.",
          "The Costs tab breaks down labor and parts costs per asset to identify expensive equipment.",
          "Higher MTBF and lower MTTR indicate better maintenance performance.",
        ]}
      />

      {/* Tab Selector */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-orange-600 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (
        <>
          {/* MTBF Tab */}
          {activeTab === "mtbf" && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-white">
                <h2 className="text-sm font-semibold text-gray-500 mb-3">
                  Mean Time Between Failures (hours)
                </h2>
                {mtbfData.length === 0 ? (
                  <p className="text-gray-500 text-sm">No MTBF data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mtbfData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assetTag" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="mtbfHours" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Asset Tag</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">MTBF (hours)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mtbfData.map((d) => (
                      <tr key={d.assetTag} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{d.assetTag}</td>
                        <td className="p-3">{d.name}</td>
                        <td className="p-3 font-medium">{d.mtbfHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MTTR Tab */}
          {activeTab === "mttr" && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-white">
                <h2 className="text-sm font-semibold text-gray-500 mb-3">
                  Mean Time To Repair (hours)
                </h2>
                {mttrData.length === 0 ? (
                  <p className="text-gray-500 text-sm">No MTTR data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mttrData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assetTag" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="mttrHours" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Asset Tag</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">MTTR (hours)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mttrData.map((d) => (
                      <tr key={d.assetTag} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{d.assetTag}</td>
                        <td className="p-3">{d.name}</td>
                        <td className="p-3 font-medium">{d.mttrHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Costs Tab */}
          {activeTab === "costs" && (
            <div className="space-y-6">
              <div className="border rounded-lg p-4 bg-white">
                <h2 className="text-sm font-semibold text-gray-500 mb-3">
                  Maintenance Costs by Asset ($)
                </h2>
                {costsData.length === 0 ? (
                  <p className="text-gray-500 text-sm">No cost data available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="assetTag" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="laborCost"
                        stackId="costs"
                        fill="#ea580c"
                        radius={[0, 0, 0, 0]}
                        name="Labor"
                      />
                      <Bar
                        dataKey="partsCost"
                        stackId="costs"
                        fill="#fb923c"
                        radius={[4, 4, 0, 0]}
                        name="Parts"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium">Asset Tag</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Labor Cost</th>
                      <th className="text-left p-3 font-medium">Parts Cost</th>
                      <th className="text-left p-3 font-medium">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costsData.map((d) => (
                      <tr key={d.assetTag} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{d.assetTag}</td>
                        <td className="p-3">{d.name}</td>
                        <td className="p-3">${d.laborCost.toFixed(2)}</td>
                        <td className="p-3">${d.partsCost.toFixed(2)}</td>
                        <td className="p-3 font-medium">${d.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
