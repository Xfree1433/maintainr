import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notify";

/**
 * POST /api/connectors/[id]/sync
 * Trigger a sync for the connector. Creates a SyncLog entry and
 * simulates importing/exporting data based on the connector's entities and direction.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = (session as any).organizationId as string;
  const { id } = await params;

  const connector = await prisma.connector.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!connector) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (connector.status === "DISABLED") {
    return NextResponse.json({ error: "Connector is disabled" }, { status: 400 });
  }

  if (connector.status !== "CONNECTED") {
    return NextResponse.json({ error: "Connector must be tested and connected before syncing" }, { status: 400 });
  }

  // Mark as syncing
  await prisma.connector.update({
    where: { id },
    data: { status: "SYNCING" },
  });

  const results: { entity: string; direction: string; created: number; updated: number; skipped: number; failed: number }[] = [];
  const startTime = Date.now();

  try {
    for (const entity of connector.syncEntities) {
      const direction = connector.direction;

      // Create sync log entry
      const syncLog = await prisma.syncLog.create({
        data: {
          connectorId: id,
          direction,
          entity,
          status: "RUNNING",
          organizationId: orgId,
        },
      });

      let recordsCreated = 0;
      let recordsUpdated = 0;
      let recordsSkipped = 0;
      let recordsFailed = 0;
      let recordsRead = 0;

      try {
        if (entity === "ASSETS" && (direction === "IMPORT" || direction === "BIDIRECTIONAL")) {
          // Simulate reading assets from external system
          // In production, this would query the external DB/API using connector config
          const simulatedExternalAssets = generateSimulatedAssets();
          recordsRead = simulatedExternalAssets.length;

          for (const extAsset of simulatedExternalAssets) {
            const existing = await prisma.asset.findFirst({
              where: {
                organizationId: orgId,
                externalId: extAsset.externalId,
              },
            });

            if (existing) {
              await prisma.asset.update({
                where: { id: existing.id },
                data: {
                  name: extAsset.name,
                  manufacturer: extAsset.manufacturer,
                  model: extAsset.model,
                  serialNumber: extAsset.serialNumber,
                  location: extAsset.location,
                },
              });
              recordsUpdated++;
            } else {
              // Check if assetTag already exists
              const tagExists = await prisma.asset.findFirst({
                where: { organizationId: orgId, assetTag: extAsset.assetTag },
              });
              if (tagExists) {
                recordsSkipped++;
              } else {
                await prisma.asset.create({
                  data: {
                    assetTag: extAsset.assetTag,
                    name: extAsset.name,
                    externalId: extAsset.externalId,
                    manufacturer: extAsset.manufacturer,
                    model: extAsset.model,
                    serialNumber: extAsset.serialNumber,
                    location: extAsset.location,
                    organizationId: orgId,
                  },
                });
                recordsCreated++;
              }
            }
          }
        }

        if (entity === "WORK_ORDERS" && (direction === "IMPORT" || direction === "BIDIRECTIONAL")) {
          const simulatedWOs = generateSimulatedWorkOrders();
          recordsRead += simulatedWOs.length;

          for (const extWO of simulatedWOs) {
            const existing = await prisma.maintenanceWorkOrder.findFirst({
              where: {
                organizationId: orgId,
                externalId: extWO.externalId,
              },
            });

            if (existing) {
              recordsSkipped++;
            } else {
              // Find asset by tag
              const asset = await prisma.asset.findFirst({
                where: { organizationId: orgId, assetTag: extWO.assetTag },
              });
              if (!asset) {
                recordsFailed++;
                continue;
              }

              const count = await prisma.maintenanceWorkOrder.count({ where: { organizationId: orgId } });
              await prisma.maintenanceWorkOrder.create({
                data: {
                  orderNumber: `WO-${String(count + 1).padStart(5, "0")}`,
                  externalId: extWO.externalId,
                  title: extWO.title,
                  type: extWO.type as any,
                  priority: extWO.priority as any,
                  assetId: asset.id,
                  organizationId: orgId,
                },
              });
              recordsCreated++;
            }
          }
        }

        if (entity === "ASSETS" && (direction === "EXPORT" || direction === "BIDIRECTIONAL")) {
          // Simulate exporting local assets to external system
          const localAssets = await prisma.asset.findMany({
            where: { organizationId: orgId, externalId: null },
            take: 10,
          });
          recordsRead += localAssets.length;
          // In production, push to external system via API/SQL
          // Simulate: mark them as exported by setting externalId
          for (const asset of localAssets) {
            await prisma.asset.update({
              where: { id: asset.id },
              data: { externalId: `EXT-${asset.assetTag}` },
            });
            recordsUpdated++;
          }
        }

        // Complete sync log
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: recordsFailed > 0 ? "PARTIAL" : "SUCCESS",
            recordsRead,
            recordsCreated,
            recordsUpdated,
            recordsSkipped,
            recordsFailed,
            duration: Date.now() - startTime,
            completedAt: new Date(),
          },
        });

        results.push({ entity, direction, created: recordsCreated, updated: recordsUpdated, skipped: recordsSkipped, failed: recordsFailed });
      } catch (err: any) {
        await prisma.syncLog.update({
          where: { id: syncLog.id },
          data: {
            status: "FAILED",
            errorDetails: JSON.stringify([{ message: err.message }]),
            duration: Date.now() - startTime,
            completedAt: new Date(),
          },
        });
        results.push({ entity, direction, created: 0, updated: 0, skipped: 0, failed: recordsRead || 1 });
      }
    }

    // Update connector
    const totalCreated = results.reduce((s, r) => s + r.created, 0);
    const totalUpdated = results.reduce((s, r) => s + r.updated, 0);
    const anyFailed = results.some((r) => r.failed > 0);

    await prisma.connector.update({
      where: { id },
      data: {
        status: "CONNECTED",
        lastSyncAt: new Date(),
        lastSyncStatus: anyFailed ? "partial" : "success",
        lastSyncCount: totalCreated + totalUpdated,
        errorMessage: null,
      },
    });

    logAudit({
      action: "connector.synced",
      entityType: "Connector",
      entityId: id,
      userId: session.user.id,
      organizationId: orgId,
      metadata: { results },
    });

    notify({
      type: "CONNECTOR",
      title: "Sync Complete",
      message: `${connector.name}: ${totalCreated} created, ${totalUpdated} updated`,
      link: "/connectors",
      organizationId: orgId,
    });

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    await prisma.connector.update({
      where: { id },
      data: {
        status: "ERROR",
        lastSyncAt: new Date(),
        lastSyncStatus: "failed",
        errorMessage: err.message,
      },
    });

    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── Simulated External Data ─────────────────────────────────────
// In production, these would be replaced by actual DB queries or API calls

function generateSimulatedAssets() {
  return [
    { externalId: "SAP-EQ-1001", assetTag: "ERP-LATHE-01", name: "CNC Lathe (ERP Import)", manufacturer: "Doosan", model: "Puma 2600SY", serialNumber: "DS-2600-1001", location: "Building B, Bay 1" },
    { externalId: "SAP-EQ-1002", assetTag: "ERP-MILL-01", name: "Vertical Mill (ERP Import)", manufacturer: "Mazak", model: "VCN-530C", serialNumber: "MZ-530-2003", location: "Building B, Bay 2" },
    { externalId: "SAP-EQ-1003", assetTag: "ERP-ROBOT-01", name: "Welding Robot (ERP Import)", manufacturer: "FANUC", model: "ARC Mate 100iD", serialNumber: "FN-ARC-3005", location: "Building A, Cell 4" },
  ];
}

function generateSimulatedWorkOrders() {
  return [
    { externalId: "SAP-WO-5001", assetTag: "CNC-001", title: "Annual calibration (ERP Import)", type: "PREVENTIVE", priority: "MEDIUM" },
    { externalId: "SAP-WO-5002", assetTag: "PRS-001", title: "Hydraulic seal replacement (ERP Import)", type: "CORRECTIVE", priority: "HIGH" },
  ];
}
