"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { QuickGuide } from "@/components/ui/quick-guide";
import {
  Plus,
  Plug,
  RefreshCw,
  TestTube,
  Trash2,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  Globe,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
  direction: string;
  config: string | null;
  syncEntities: string[];
  syncFrequency: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  _count: { syncLogs: number };
}

const TYPE_LABELS: Record<string, string> = {
  SAP: "SAP ERP",
  ORACLE: "Oracle E-Business",
  DYNAMICS_365: "Dynamics 365",
  ODBC: "ODBC / Generic SQL",
  POSTGRESQL: "PostgreSQL",
  MYSQL: "MySQL",
  MSSQL: "SQL Server",
  REST_API: "REST API",
  CSV_UPLOAD: "CSV Upload",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SAP: <Database className="h-5 w-5" />,
  ORACLE: <Database className="h-5 w-5" />,
  DYNAMICS_365: <Globe className="h-5 w-5" />,
  ODBC: <Database className="h-5 w-5" />,
  POSTGRESQL: <Database className="h-5 w-5" />,
  MYSQL: <Database className="h-5 w-5" />,
  MSSQL: <Database className="h-5 w-5" />,
  REST_API: <Globe className="h-5 w-5" />,
  CSV_UPLOAD: <FileSpreadsheet className="h-5 w-5" />,
};

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "destructive" | "secondary" | "default"; label: string }> = {
  PENDING: { variant: "secondary", label: "Pending" },
  CONNECTED: { variant: "success", label: "Connected" },
  SYNCING: { variant: "default", label: "Syncing" },
  ERROR: { variant: "destructive", label: "Error" },
  DISABLED: { variant: "secondary", label: "Disabled" },
};

const DIRECTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  IMPORT: { label: "Import", icon: <ArrowDownToLine className="h-3.5 w-3.5" /> },
  EXPORT: { label: "Export", icon: <ArrowUpFromLine className="h-3.5 w-3.5" /> },
  BIDIRECTIONAL: { label: "Bidirectional", icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
};

const CONFIG_FIELDS: Record<string, { label: string; placeholder: string; key: string }[]> = {
  SAP: [
    { label: "Host", placeholder: "sap-server.company.com", key: "host" },
    { label: "System Number", placeholder: "00", key: "systemNumber" },
    { label: "Client", placeholder: "100", key: "client" },
    { label: "Username", placeholder: "RFC_USER", key: "username" },
    { label: "Password", placeholder: "••••••••", key: "password" },
  ],
  ORACLE: [
    { label: "Host", placeholder: "oracle-db.company.com", key: "host" },
    { label: "Port", placeholder: "1521", key: "port" },
    { label: "Service Name", placeholder: "ORCL", key: "serviceName" },
    { label: "Username", placeholder: "maintainr_reader", key: "username" },
    { label: "Password", placeholder: "••••••••", key: "password" },
  ],
  DYNAMICS_365: [
    { label: "Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", key: "tenantId" },
    { label: "Environment", placeholder: "production", key: "environment" },
    { label: "Client ID", placeholder: "app-client-id", key: "clientId" },
    { label: "Client Secret", placeholder: "••••••••", key: "clientSecret" },
  ],
  POSTGRESQL: [
    { label: "Host", placeholder: "db.company.com", key: "host" },
    { label: "Port", placeholder: "5432", key: "port" },
    { label: "Database", placeholder: "erp_production", key: "database" },
    { label: "Username", placeholder: "readonly_user", key: "username" },
    { label: "Password", placeholder: "••••••••", key: "password" },
  ],
  MYSQL: [
    { label: "Host", placeholder: "mysql.company.com", key: "host" },
    { label: "Port", placeholder: "3306", key: "port" },
    { label: "Database", placeholder: "erp_db", key: "database" },
    { label: "Username", placeholder: "readonly_user", key: "username" },
    { label: "Password", placeholder: "••••••••", key: "password" },
  ],
  MSSQL: [
    { label: "Host", placeholder: "sqlserver.company.com", key: "host" },
    { label: "Port", placeholder: "1433", key: "port" },
    { label: "Database", placeholder: "MaintenanceDB", key: "database" },
    { label: "Username", placeholder: "sa", key: "username" },
    { label: "Password", placeholder: "••••••••", key: "password" },
  ],
  ODBC: [
    { label: "Connection String", placeholder: "Driver={ODBC Driver};Server=...;Database=...", key: "connectionString" },
  ],
  REST_API: [
    { label: "Base URL", placeholder: "https://api.erp.company.com/v1", key: "baseUrl" },
    { label: "API Key / Token", placeholder: "Bearer xxx...", key: "apiKey" },
    { label: "Assets Endpoint", placeholder: "/equipment", key: "assetsEndpoint" },
    { label: "Work Orders Endpoint", placeholder: "/work-orders", key: "workOrdersEndpoint" },
  ],
  CSV_UPLOAD: [],
};

export default function ConnectorsPage() {
  const toast = useToast();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("POSTGRESQL");
  const [formDirection, setFormDirection] = useState("BIDIRECTIONAL");
  const [formEntities, setFormEntities] = useState<string[]>(["ASSETS", "WORK_ORDERS"]);
  const [formFrequency, setFormFrequency] = useState("MANUAL");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [formMapping, setFormMapping] = useState("");

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch("/api/connectors");
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  async function handleCreate() {
    const res = await fetch("/api/connectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        type: formType,
        direction: formDirection,
        syncEntities: formEntities,
        syncFrequency: formFrequency,
        config: Object.keys(formConfig).length > 0 ? JSON.stringify(formConfig) : undefined,
        fieldMapping: formMapping || undefined,
      }),
    });
    if (res.ok) {
      toast({ message: "Connector created", variant: "success" });
      setShowCreate(false);
      resetForm();
      fetchConnectors();
    } else {
      const data = await res.json();
      toast({ message: data.error || "Failed to create", variant: "error" });
    }
  }

  function resetForm() {
    setFormName("");
    setFormType("POSTGRESQL");
    setFormDirection("BIDIRECTIONAL");
    setFormEntities(["ASSETS", "WORK_ORDERS"]);
    setFormFrequency("MANUAL");
    setFormConfig({});
    setFormMapping("");
  }

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/connectors/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ message: data.message, variant: "success" });
      } else {
        toast({ message: data.message || data.error, variant: "error" });
      }
      fetchConnectors();
    } catch {
      toast({ message: "Test failed", variant: "error" });
    }
    setTesting(null);
  }

  async function handleSync(id: string) {
    setSyncing(id);
    try {
      const res = await fetch(`/api/connectors/${id}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const summary = data.results.map((r: any) => `${r.entity}: ${r.created} new, ${r.updated} updated`).join("; ");
        toast({ message: `Sync complete: ${summary}`, variant: "success" });
      } else {
        toast({ message: data.error || "Sync failed", variant: "error" });
      }
      fetchConnectors();
    } catch {
      toast({ message: "Sync failed", variant: "error" });
    }
    setSyncing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this connector and all sync history?")) return;
    const res = await fetch(`/api/connectors/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ message: "Connector deleted", variant: "success" });
      fetchConnectors();
    }
  }

  async function handleToggle(id: string, currentStatus: string) {
    const newStatus = currentStatus === "DISABLED" ? "PENDING" : "DISABLED";
    await fetch(`/api/connectors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchConnectors();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connectors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect to ERP systems and databases to sync assets and work orders
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Connector
        </Button>
      </div>

      <QuickGuide
        title="Quick Guide: ERP Connectors"
        steps={[
          "Connect to SAP, Oracle, Dynamics 365, SQL databases, or REST APIs to sync equipment and work order data.",
          "After creating a connector, click 'Test' to validate the connection before syncing.",
          "Use 'Sync' to pull assets and work orders from the external system (or push, for bidirectional connectors).",
          "Each sync run is logged with record counts — check sync history to verify data imports.",
        ]}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading connectors...</div>
      ) : connectors.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
          <Plug className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No connectors yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Connect to SAP, Oracle, Dynamics 365, SQL databases, or REST APIs
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Your First Connector
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {connectors.map((c) => {
            const statusInfo = STATUS_BADGE[c.status] || STATUS_BADGE.PENDING;
            const dirInfo = DIRECTION_LABELS[c.direction] || DIRECTION_LABELS.IMPORT;
            return (
              <div
                key={c.id}
                className="border border-gray-200 rounded-lg bg-white p-5 flex items-start gap-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  {TYPE_ICONS[c.type] || <Database className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {dirInfo.icon} {dirInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {TYPE_LABELS[c.type] || c.type} &middot; Syncs: {c.syncEntities.join(", ")} &middot; {c._count.syncLogs} sync runs
                  </p>
                  {c.lastSyncAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last sync: {new Date(c.lastSyncAt).toLocaleString()} &middot;{" "}
                      <span className={c.lastSyncStatus === "success" ? "text-green-600" : c.lastSyncStatus === "failed" ? "text-red-600" : "text-yellow-600"}>
                        {c.lastSyncStatus}
                      </span>
                      {c.lastSyncCount !== null && ` (${c.lastSyncCount} records)`}
                    </p>
                  )}
                  {c.errorMessage && (
                    <p className="text-xs text-red-500 mt-1">{c.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(c.id)}
                    disabled={testing === c.id || c.status === "DISABLED"}
                  >
                    {testing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                    <span className="ml-1.5 hidden sm:inline">Test</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(c.id)}
                    disabled={syncing === c.id || c.status !== "CONNECTED"}
                  >
                    {syncing === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-1.5 hidden sm:inline">Sync</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(c.id, c.status)}
                    title={c.status === "DISABLED" ? "Enable" : "Disable"}
                  >
                    {c.status === "DISABLED" ? "Enable" : "Disable"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Connector Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Connector</DialogTitle>
            <DialogDescription>
              Connect to an ERP system or database to sync assets and work orders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Connector Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="SAP Production System"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <Select value={formType} onChange={(e) => { setFormType(e.target.value); setFormConfig({}); }} className="mt-1">
                  <option value="SAP">SAP ERP</option>
                  <option value="ORACLE">Oracle E-Business</option>
                  <option value="DYNAMICS_365">Dynamics 365</option>
                  <option value="POSTGRESQL">PostgreSQL</option>
                  <option value="MYSQL">MySQL</option>
                  <option value="MSSQL">SQL Server</option>
                  <option value="ODBC">ODBC / Generic SQL</option>
                  <option value="REST_API">REST API</option>
                  <option value="CSV_UPLOAD">CSV Upload</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sync Direction</label>
                <Select value={formDirection} onChange={(e) => setFormDirection(e.target.value)} className="mt-1">
                  <option value="IMPORT">Import Only</option>
                  <option value="EXPORT">Export Only</option>
                  <option value="BIDIRECTIONAL">Bidirectional</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Sync Entities</label>
              <div className="flex gap-4 mt-1">
                {["ASSETS", "WORK_ORDERS"].map((entity) => (
                  <label key={entity} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formEntities.includes(entity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormEntities([...formEntities, entity]);
                        } else {
                          setFormEntities(formEntities.filter((en) => en !== entity));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    {entity === "ASSETS" ? "Assets" : "Work Orders"}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Sync Frequency</label>
              <Select value={formFrequency} onChange={(e) => setFormFrequency(e.target.value)} className="mt-1">
                <option value="MANUAL">Manual</option>
                <option value="0 */6 * * *">Every 6 hours</option>
                <option value="0 0 * * *">Daily (midnight)</option>
                <option value="0 0 * * 1">Weekly (Monday)</option>
              </Select>
            </div>

            {/* Dynamic config fields based on type */}
            {CONFIG_FIELDS[formType] && CONFIG_FIELDS[formType].length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Connection Settings</label>
                <div className="space-y-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  {CONFIG_FIELDS[formType].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-gray-600">{field.label}</label>
                      <Input
                        value={formConfig[field.key] || ""}
                        onChange={(e) => setFormConfig({ ...formConfig, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        type={field.key === "password" || field.key === "clientSecret" || field.key === "apiKey" ? "password" : "text"}
                        className="mt-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                Field Mapping (optional JSON)
              </label>
              <Textarea
                value={formMapping}
                onChange={(e) => setFormMapping(e.target.value)}
                placeholder='{"equipment_id": "assetTag", "equipment_name": "name", "mfg": "manufacturer"}'
                rows={3}
                className="mt-1 font-mono text-xs"
              />
              <p className="text-xs text-gray-400 mt-1">Map external field names to MAINTAINR fields</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formName || formEntities.length === 0}>
                Create Connector
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
