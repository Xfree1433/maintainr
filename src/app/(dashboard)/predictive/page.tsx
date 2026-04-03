"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { QuickGuide } from "@/components/ui/quick-guide";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  INFO: "bg-blue-100 text-blue-800 border-blue-300",
};

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-800",
  ACKNOWLEDGED: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  FALSE_POSITIVE: "bg-gray-100 text-gray-800",
};

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  sensorType: string;
  currentValue: number;
  threshold: number;
  createdAt: string;
  asset: { name: string; assetTag: string };
}

interface HealthScore {
  assetId: string;
  assetTag: string;
  name: string;
  status: string;
  healthScore: number;
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
}

interface SensorReading {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  anomaly: boolean;
}

export default function PredictivePage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedSensorType, setSelectedSensorType] = useState("TEMPERATURE");
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    const res = await fetch("/api/predictive/alerts");
    if (res.ok) {
      const data = await res.json();
      setAlerts(data);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    const res = await fetch("/api/predictive/health");
    if (res.ok) {
      const data = await res.json();
      setHealthScores(data);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    const res = await fetch("/api/assets");
    if (res.ok) {
      const data = await res.json();
      setAssets(data.assets ?? data);
    }
  }, []);

  const fetchSensorData = useCallback(async () => {
    if (!selectedAsset) {
      setSensorData([]);
      return;
    }
    const res = await fetch(`/api/assets/${selectedAsset}/sensors?type=${selectedSensorType}`);
    if (res.ok) {
      const data = await res.json();
      setSensorData(data);
    }
  }, [selectedAsset, selectedSensorType]);

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchHealth(), fetchAssets()]).then(() =>
      setLoading(false)
    );
  }, [fetchAlerts, fetchHealth, fetchAssets]);

  useEffect(() => {
    fetchSensorData();
  }, [fetchSensorData]);

  const handleUpdateAlert = async (id: string, status: string) => {
    setUpdatingId(id);
    const res = await fetch(`/api/predictive/alerts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchAlerts();
      fetchHealth();
    }
    setUpdatingId(null);
  };

  const chartData = sensorData
    .slice()
    .reverse()
    .map((r) => ({
      time: new Date(r.timestamp).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: r.value,
      anomaly: r.anomaly ? r.value : null,
    }));

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Predictive Maintenance</h1>

      <QuickGuide
        title="Quick Guide: Predictive Analytics"
        steps={[
          "Active alerts are generated when sensor readings exceed safe thresholds or show anomalous trends.",
          "Acknowledge alerts to indicate they're being investigated, or resolve/dismiss as false positives.",
          "Health scores range from 0-100. Green (>70) is healthy, yellow (40-70) needs attention, red (<40) is critical.",
          "Use the sensor trend chart to visualize readings over time and identify developing patterns.",
        ]}
      />

      {/* Active Alerts */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Active Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-gray-500">No alerts found.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 ${SEVERITY_COLORS[alert.severity] ?? ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{alert.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[alert.status] ?? ""}`}
                      >
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {alert.asset.name} ({alert.asset.assetTag}) &middot;{" "}
                      {alert.sensorType} &middot; Value: {alert.currentValue} / Threshold:{" "}
                      {alert.threshold} &middot;{" "}
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {alert.status === "ACTIVE" && (
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleUpdateAlert(alert.id, "ACKNOWLEDGED")}
                        disabled={updatingId === alert.id}
                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleUpdateAlert(alert.id, "RESOLVED")}
                        disabled={updatingId === alert.id}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                  {alert.status === "ACKNOWLEDGED" && (
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleUpdateAlert(alert.id, "RESOLVED")}
                        disabled={updatingId === alert.id}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleUpdateAlert(alert.id, "FALSE_POSITIVE")}
                        disabled={updatingId === alert.id}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        False Positive
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Health Scores */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Asset Health Scores</h2>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Asset Tag</th>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Health Score</th>
              </tr>
            </thead>
            <tbody>
              {healthScores.map((h) => {
                const barColor =
                  h.healthScore > 70
                    ? "bg-green-500"
                    : h.healthScore > 40
                      ? "bg-yellow-500"
                      : "bg-red-500";
                return (
                  <tr key={h.assetId} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{h.assetTag}</td>
                    <td className="p-3">{h.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {h.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${barColor}`}
                            style={{ width: `${h.healthScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{h.healthScore}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sensor Trend Chart */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Sensor Trends</h2>
        <div className="flex gap-3 mb-4">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">Select an asset...</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.assetTag})
              </option>
            ))}
          </select>
          <select
            value={selectedSensorType}
            onChange={(e) => setSelectedSensorType(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="TEMPERATURE">Temperature</option>
            <option value="VIBRATION">Vibration</option>
            <option value="PRESSURE">Pressure</option>
            <option value="HUMIDITY">Humidity</option>
            <option value="CURRENT">Current</option>
            <option value="RPM">RPM</option>
          </select>
        </div>
        {chartData.length > 0 ? (
          <div className="border rounded-lg p-4 bg-white">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="anomaly"
                  stroke="transparent"
                  dot={{ fill: "#dc2626", r: 5 }}
                  activeDot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            {selectedAsset
              ? "No sensor data found for this selection."
              : "Select an asset to view sensor trends."}
          </p>
        )}
      </section>
    </div>
  );
}
