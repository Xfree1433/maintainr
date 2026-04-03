-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('SAP', 'ORACLE', 'DYNAMICS_365', 'ODBC', 'POSTGRESQL', 'MYSQL', 'MSSQL', 'REST_API', 'CSV_UPLOAD');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('PENDING', 'CONNECTED', 'SYNCING', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('IMPORT', 'EXPORT', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "SyncLogStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CONNECTOR';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "MaintenanceWorkOrder" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConnectorType" NOT NULL,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'PENDING',
    "direction" "SyncDirection" NOT NULL DEFAULT 'IMPORT',
    "config" TEXT,
    "fieldMapping" TEXT,
    "syncEntities" TEXT[],
    "syncFrequency" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncCount" INTEGER,
    "errorMessage" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "entity" TEXT NOT NULL,
    "status" "SyncLogStatus" NOT NULL,
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "duration" INTEGER,
    "organizationId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Connector_organizationId_status_idx" ON "Connector"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Connector_organizationId_type_idx" ON "Connector"("organizationId", "type");

-- CreateIndex
CREATE INDEX "SyncLog_connectorId_startedAt_idx" ON "SyncLog"("connectorId", "startedAt");

-- CreateIndex
CREATE INDEX "SyncLog_organizationId_startedAt_idx" ON "SyncLog"("organizationId", "startedAt");

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
