"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { QuickGuide } from "@/components/ui/quick-guide";

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string;
  status: string;
  criticality: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  warrantyExpiry?: string;
  location?: string;
  purchaseCost?: number;
  specifications?: string;
  category?: { id: string; name: string } | null;
  facility?: { id: string; name: string } | null;
  workOrders?: WorkOrder[];
  sensorReadings?: SensorReading[];
  schedules?: Schedule[];
  downtimeEvents?: DowntimeEvent[];
}

interface Schedule {
  id: string;
  name: string;
  frequency: string;
  intervalDays: number;
  nextDue: string;
  lastPerformed: string | null;
  enabled: boolean;
  estimatedHours: number | null;
}

interface DowntimeEvent {
  id: string;
  reason: string;
  category: string | null;
  planned: boolean;
  startedAt: string;
  endedAt: string | null;
  durationMin: number | null;
  notes: string | null;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  createdAt: string;
}

interface SensorReading {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  anomaly: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  OPERATIONAL: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DEGRADED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  DOWN: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  MAINTENANCE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  DECOMMISSIONED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const CRITICALITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  LOW: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const WO_STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  ON_HOLD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const SENSOR_TYPES = ["", "TEMPERATURE", "VIBRATION", "PRESSURE", "HUMIDITY", "CURRENT", "RPM", "OIL_LEVEL", "NOISE"];

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  // Sensor tab state
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [sensorType, setSensorType] = useState("");
  const [sensorRange, setSensorRange] = useState("30d");
  const [loadingSensors, setLoadingSensors] = useState(false);

  const fetchAsset = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/assets/${id}`);
    if (res.ok) {
      setAsset(await res.json());
    }
    setLoading(false);
  }, [id]);

  const fetchSensors = useCallback(async () => {
    setLoadingSensors(true);
    const params = new URLSearchParams();
    if (sensorType) params.set("type", sensorType);
    params.set("range", sensorRange);
    const res = await fetch(`/api/assets/${id}/sensors?${params}`);
    if (res.ok) {
      setSensorReadings(await res.json());
    }
    setLoadingSensors(false);
  }, [id, sensorType, sensorRange]);

  useEffect(() => {
    fetchAsset();
  }, [fetchAsset]);

  useEffect(() => {
    fetchSensors();
  }, [fetchSensors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading asset...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Asset not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/assets")}
            className="text-sm text-orange-600 hover:text-orange-800 dark:hover:text-orange-400 mb-1"
          >
            &larr; Back to Assets
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {asset.name}
          </h1>
          <p className="text-sm text-gray-500 font-mono">{asset.assetTag}</p>
        </div>
        <div className="flex gap-2">
          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[asset.status] ?? ""}`}>
            {asset.status}
          </span>
          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${CRITICALITY_BADGE[asset.criticality] ?? ""}`}>
            {asset.criticality}
          </span>
        </div>
      </div>

      <QuickGuide
        title="Quick Guide: Asset Details"
        steps={[
          "The Overview tab shows all asset specifications, location, warranty info, and current status.",
          "Switch to Sensor Data to view recent IoT readings. Filter by sensor type and time range.",
          "The Work Orders tab shows all maintenance history for this specific asset.",
          "Red anomaly flags on sensor readings indicate values outside normal operating ranges.",
        ]}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sensors">Sensor Data</TabsTrigger>
          <TabsTrigger value="workorders">Work Orders</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="downtime">Downtime</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailItem label="Asset Tag" value={asset.assetTag} />
              <DetailItem label="Name" value={asset.name} />
              <DetailItem label="Status" value={asset.status} />
              <DetailItem label="Criticality" value={asset.criticality} />
              <DetailItem label="Category" value={asset.category?.name} />
              <DetailItem label="Facility" value={asset.facility?.name} />
              <DetailItem label="Manufacturer" value={asset.manufacturer} />
              <DetailItem label="Model" value={asset.model} />
              <DetailItem label="Serial Number" value={asset.serialNumber} />
              <DetailItem
                label="Install Date"
                value={asset.installDate ? new Date(asset.installDate).toLocaleDateString() : undefined}
              />
              <DetailItem
                label="Warranty Expiry"
                value={asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : undefined}
              />
              <DetailItem label="Location" value={asset.location} />
              <DetailItem
                label="Purchase Cost"
                value={asset.purchaseCost != null ? `$${Number(asset.purchaseCost).toFixed(2)}` : undefined}
              />
            </div>
            {asset.description && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{asset.description}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Sensor Data Tab */}
        <TabsContent value="sensors">
          <div className="space-y-4">
            <div className="flex gap-3">
              <Select value={sensorType} onChange={(e) => setSensorType(e.target.value)}>
                <option value="">All Types</option>
                {SENSOR_TYPES.filter(Boolean).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <Select value={sensorRange} onChange={(e) => setSensorRange(e.target.value)}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {["Timestamp", "Type", "Value", "Unit", "Anomaly"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {loadingSensors ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : sensorReadings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sensor data found.</td>
                    </tr>
                  ) : (
                    sensorReadings.map((r) => (
                      <tr key={r.id} className={r.anomaly ? "bg-red-50 dark:bg-red-900/10" : ""}>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{r.type}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">{r.value}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.unit}</td>
                        <td className="px-4 py-3">
                          {r.anomaly && (
                            <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
                              ANOMALY
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="workorders">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Order #", "Title", "Type", "Status", "Priority", "Created"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {!asset.workOrders || asset.workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No work orders found.</td>
                  </tr>
                ) : (
                  asset.workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">{wo.orderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{wo.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{wo.type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${WO_STATUS_BADGE[wo.status] ?? ""}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{wo.priority}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(wo.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Name", "Frequency", "Interval (days)", "Next Due", "Last Performed", "Enabled"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {!asset.schedules || asset.schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No maintenance schedules for this asset.</td>
                  </tr>
                ) : (
                  asset.schedules.map((s) => {
                    const overdue = new Date(s.nextDue) < new Date();
                    return (
                      <tr key={s.id} className={overdue ? "bg-red-50 dark:bg-red-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800"}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.frequency.replace("_", " ")}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.intervalDays}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={overdue ? "text-red-600 font-medium" : "text-gray-900 dark:text-gray-100"}>
                            {new Date(s.nextDue).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {s.lastPerformed ? new Date(s.lastPerformed).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${s.enabled ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}>
                            {s.enabled ? "ENABLED" : "DISABLED"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Downtime Tab */}
        <TabsContent value="downtime">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Started", "Ended", "Duration", "Reason", "Type", "Notes"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {!asset.downtimeEvents || asset.downtimeEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No downtime events recorded for this asset.</td>
                  </tr>
                ) : (
                  asset.downtimeEvents.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{new Date(d.startedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {d.endedAt ? new Date(d.endedAt).toLocaleString() : <span className="text-red-600 font-medium">Ongoing</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {d.durationMin != null ? `${d.durationMin} min` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{d.reason.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${d.planned ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"}`}>
                          {d.planned ? "PLANNED" : "UNPLANNED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{d.notes ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{value ?? "\u2014"}</p>
    </div>
  );
}
