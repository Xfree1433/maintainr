import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning tables...");

  // Clean in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.partUsage.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.maintenanceWorkOrder.deleteMany();
  await prisma.maintenanceSchedule.deleteMany();
  await prisma.predictiveAlert.deleteMany();
  await prisma.downtimeEvent.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.part.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 12);

  const mark = await prisma.user.create({
    data: {
      name: "Mark Peterson",
      email: "mark@acme-mfg.com",
      hashedPassword,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      name: "Sarah Chen",
      email: "sarah@acme-mfg.com",
      hashedPassword,
    },
  });

  const mike = await prisma.user.create({
    data: {
      name: "Mike Rodriguez",
      email: "mike@acme-mfg.com",
      hashedPassword,
    },
  });

  console.log("Creating organization...");
  const org = await prisma.organization.create({
    data: {
      name: "Acme Manufacturing",
      slug: "acme-manufacturing",
      plan: "PRO",
    },
  });

  console.log("Creating memberships...");
  await prisma.membership.createMany({
    data: [
      { organizationId: org.id, userId: mark.id, role: "OWNER" },
      { organizationId: org.id, userId: sarah.id, role: "MANAGER" },
      { organizationId: org.id, userId: mike.id, role: "OPERATOR" },
    ],
  });

  console.log("Creating facility...");
  const facility = await prisma.facility.create({
    data: {
      name: "Main Production Facility",
      address: "1200 Industrial Blvd, Suite 100",
      organizationId: org.id,
    },
  });

  console.log("Creating asset categories...");
  const categoryNames = ["CNC Machines", "Conveyors", "Presses", "HVAC", "Pumps", "Compressors"];
  const categories: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.assetCategory.create({
      data: { name, organizationId: org.id },
    });
    categories[name] = cat.id;
  }

  console.log("Creating assets...");
  const assetDefs = [
    { assetTag: "CNC-001", name: "Haas VF-2 CNC Mill", status: "OPERATIONAL" as const, criticality: "CRITICAL" as const, category: "CNC Machines" },
    { assetTag: "CNC-002", name: "DMG MORI NLX 2500 Lathe", status: "DEGRADED" as const, criticality: "CRITICAL" as const, category: "CNC Machines" },
    { assetTag: "CNC-003", name: "Fanuc RoboDrill", status: "OPERATIONAL" as const, criticality: "HIGH" as const, category: "CNC Machines" },
    { assetTag: "CONV-001", name: "Main Assembly Conveyor", status: "OPERATIONAL" as const, criticality: "HIGH" as const, category: "Conveyors" },
    { assetTag: "CONV-002", name: "Packaging Line Conveyor", status: "MAINTENANCE" as const, criticality: "MEDIUM" as const, category: "Conveyors" },
    { assetTag: "PRS-001", name: "Hydraulic Press 200T", status: "OPERATIONAL" as const, criticality: "HIGH" as const, category: "Presses" },
    { assetTag: "PRS-002", name: "Stamping Press A", status: "DOWN" as const, criticality: "CRITICAL" as const, category: "Presses" },
    { assetTag: "HVAC-001", name: "Facility HVAC Unit 1", status: "OPERATIONAL" as const, criticality: "MEDIUM" as const, category: "HVAC" },
    { assetTag: "PUMP-001", name: "Coolant Circulation Pump", status: "DEGRADED" as const, criticality: "HIGH" as const, category: "Pumps" },
    { assetTag: "PUMP-002", name: "Hydraulic Power Unit", status: "OPERATIONAL" as const, criticality: "HIGH" as const, category: "Pumps" },
    { assetTag: "COMP-001", name: "Air Compressor Main", status: "OPERATIONAL" as const, criticality: "HIGH" as const, category: "Compressors" },
    { assetTag: "COMP-002", name: "Air Compressor Backup", status: "OPERATIONAL" as const, criticality: "LOW" as const, category: "Compressors" },
  ];

  const assets: Record<string, string> = {};
  for (const def of assetDefs) {
    const asset = await prisma.asset.create({
      data: {
        assetTag: def.assetTag,
        name: def.name,
        status: def.status,
        criticality: def.criticality,
        categoryId: categories[def.category],
        facilityId: facility.id,
        organizationId: org.id,
      },
    });
    assets[def.assetTag] = asset.id;
  }

  console.log("Creating sensor readings (~2000)...");
  const now = new Date();
  const sensorAssets = ["CNC-001", "CNC-002", "CNC-003", "CONV-001", "PRS-001", "PRS-002", "PUMP-001", "PUMP-002", "COMP-001"];
  const sensorTypes = ["TEMPERATURE", "VIBRATION", "PRESSURE"] as const;
  const sensorUnits: Record<string, string> = { TEMPERATURE: "°C", VIBRATION: "mm/s", PRESSURE: "bar" };
  const baselines: Record<string, { base: number; noise: number }> = {
    TEMPERATURE: { base: 40, noise: 3 },
    VIBRATION: { base: 3.5, noise: 1 },
    PRESSURE: { base: 6, noise: 0.5 },
  };
  const thresholds: Record<string, number> = { TEMPERATURE: 55, VIBRATION: 8, PRESSURE: 10 };

  const readingsBatch: any[] = [];
  const totalReadings = 7 * 12; // 7 days, every 2 hours = 84 readings per sensor per asset

  for (const assetTag of sensorAssets) {
    const assetId = assets[assetTag];
    for (const sType of sensorTypes) {
      const { base, noise } = baselines[sType];
      const threshold = thresholds[sType];

      for (let i = 0; i < totalReadings; i++) {
        const timestamp = new Date(now.getTime() - (totalReadings - i) * 2 * 60 * 60 * 1000);
        let value = base + (Math.random() - 0.5) * 2 * noise;

        // For degraded assets, inject upward vibration trend
        if ((assetTag === "CNC-002" || assetTag === "PUMP-001") && sType === "VIBRATION") {
          value += i * 0.1;
        }

        // For PRS-002, inject spike values in last day
        if (assetTag === "PRS-002" && i >= totalReadings - 12) {
          if (sType === "PRESSURE") {
            value += 5 + Math.random() * 3;
          } else if (sType === "VIBRATION") {
            value += 4 + Math.random() * 2;
          }
        }

        value = Math.round(value * 100) / 100;
        const anomaly = value > threshold;

        readingsBatch.push({
          assetId,
          type: sType,
          value,
          unit: sensorUnits[sType],
          timestamp,
          anomaly,
        });
      }
    }
  }

  // Insert in batches of 500
  for (let i = 0; i < readingsBatch.length; i += 500) {
    await prisma.sensorReading.createMany({
      data: readingsBatch.slice(i, i + 500),
    });
  }
  console.log(`Created ${readingsBatch.length} sensor readings`);

  console.log("Creating predictive alerts...");
  const alertCNC002 = await prisma.predictiveAlert.create({
    data: {
      assetId: assets["CNC-002"],
      sensorType: "VIBRATION",
      severity: "WARNING",
      title: "Vibration Trending Upward",
      message: "Vibration levels on CNC-002 have been steadily increasing over the past 7 days, indicating potential bearing wear.",
      currentValue: 7.5,
      threshold: 8,
      status: "ACTIVE",
      organizationId: org.id,
    },
  });

  const alertPUMP001 = await prisma.predictiveAlert.create({
    data: {
      assetId: assets["PUMP-001"],
      sensorType: "TEMPERATURE",
      severity: "CRITICAL",
      title: "Temperature Exceeding Safe Threshold",
      message: "Coolant pump temperature has exceeded the safe operating threshold of 55°C multiple times in the last 24 hours.",
      currentValue: 58.2,
      threshold: 55,
      status: "ACTIVE",
      organizationId: org.id,
    },
  });

  const alertPRS002 = await prisma.predictiveAlert.create({
    data: {
      assetId: assets["PRS-002"],
      sensorType: "PRESSURE",
      severity: "CRITICAL",
      title: "Pressure Anomaly Detected",
      message: "Hydraulic pressure readings on Stamping Press A show dangerous anomalies indicating potential system failure.",
      currentValue: 12.4,
      threshold: 10,
      status: "ACTIVE",
      organizationId: org.id,
    },
  });

  console.log("Creating technicians...");
  const techJohn = await prisma.technician.create({
    data: {
      name: "John Martinez",
      email: "john.martinez@acme-mfg.com",
      employeeId: "TECH-001",
      skills: JSON.stringify(["Electrical", "PLC"]),
      certifications: JSON.stringify(["CMRT"]),
      status: "AVAILABLE",
      hourlyRate: 45,
      organizationId: org.id,
    },
  });

  const techLisa = await prisma.technician.create({
    data: {
      name: "Lisa Wong",
      email: "lisa.wong@acme-mfg.com",
      employeeId: "TECH-002",
      skills: JSON.stringify(["Mechanical", "Hydraulics"]),
      certifications: JSON.stringify(["CEM"]),
      status: "ON_JOB",
      hourlyRate: 50,
      organizationId: org.id,
    },
  });

  const techDavid = await prisma.technician.create({
    data: {
      name: "David Kim",
      email: "david.kim@acme-mfg.com",
      employeeId: "TECH-003",
      skills: JSON.stringify(["CNC", "Precision Measurement"]),
      certifications: JSON.stringify([]),
      status: "AVAILABLE",
      hourlyRate: 48,
      organizationId: org.id,
    },
  });

  const techAna = await prisma.technician.create({
    data: {
      name: "Ana Torres",
      email: "ana.torres@acme-mfg.com",
      employeeId: "TECH-004",
      skills: JSON.stringify(["General Maintenance", "Welding"]),
      certifications: JSON.stringify([]),
      status: "OFF_SHIFT",
      hourlyRate: 42,
      organizationId: org.id,
    },
  });

  console.log("Creating work orders...");
  const wo1 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00001",
      type: "CORRECTIVE",
      status: "IN_PROGRESS",
      priority: "HIGH",
      title: "Investigate vibration increase",
      description: "CNC-002 vibration levels trending upward. Investigate root cause and perform corrective action.",
      assetId: assets["CNC-002"],
      technicianId: techJohn.id,
      alertId: alertCNC002.id,
      organizationId: org.id,
      startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  const wo2 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00002",
      type: "EMERGENCY",
      status: "OPEN",
      priority: "CRITICAL",
      title: "Hydraulic system failure",
      description: "Stamping Press A hydraulic system has failed. Immediate attention required.",
      assetId: assets["PRS-002"],
      alertId: alertPRS002.id,
      organizationId: org.id,
    },
  });

  const wo3 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00003",
      type: "PREVENTIVE",
      status: "COMPLETED",
      priority: "MEDIUM",
      title: "Belt replacement",
      description: "Scheduled belt replacement on main assembly conveyor.",
      assetId: assets["CONV-001"],
      technicianId: techLisa.id,
      organizationId: org.id,
      actualHours: 3,
      laborCost: 150,
      partsCost: 180,
      startedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    },
  });

  const wo4 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00004",
      type: "INSPECTION",
      status: "OPEN",
      priority: "LOW",
      title: "Quarterly filter inspection",
      description: "Routine quarterly HVAC filter inspection.",
      assetId: assets["HVAC-001"],
      organizationId: org.id,
    },
  });

  const wo5 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00005",
      type: "PREVENTIVE",
      status: "COMPLETED",
      priority: "MEDIUM",
      title: "Spindle lubrication",
      description: "Monthly spindle lubrication for CNC-001.",
      assetId: assets["CNC-001"],
      technicianId: techDavid.id,
      organizationId: org.id,
      actualHours: 1.5,
      laborCost: 72,
      partsCost: 61,
      startedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
    },
  });

  const wo6 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00006",
      type: "PREDICTIVE",
      status: "IN_PROGRESS",
      priority: "HIGH",
      title: "Bearing replacement",
      description: "Predictive analysis indicates bearing wear on coolant pump. Replace bearings.",
      assetId: assets["PUMP-001"],
      technicianId: techLisa.id,
      alertId: alertPUMP001.id,
      organizationId: org.id,
      startedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const wo7 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00007",
      type: "PREVENTIVE",
      status: "OPEN",
      priority: "MEDIUM",
      title: "Tool calibration",
      description: "Scheduled tool calibration for Fanuc RoboDrill.",
      assetId: assets["CNC-003"],
      organizationId: org.id,
    },
  });

  const wo8 = await prisma.maintenanceWorkOrder.create({
    data: {
      orderNumber: "WO-00008",
      type: "INSPECTION",
      status: "COMPLETED",
      priority: "LOW",
      title: "Air filter check",
      description: "Monthly air filter inspection on main compressor.",
      assetId: assets["COMP-001"],
      technicianId: techAna.id,
      organizationId: org.id,
      actualHours: 0.5,
      laborCost: 21,
      partsCost: 0,
      startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 0.5 * 60 * 60 * 1000),
    },
  });

  console.log("Creating maintenance schedules...");
  await prisma.maintenanceSchedule.createMany({
    data: [
      {
        name: "CNC-001 Spindle Lubrication",
        description: "Monthly spindle lubrication and inspection",
        assetId: assets["CNC-001"],
        frequency: "MONTHLY",
        intervalDays: 30,
        nextDue: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
        lastPerformed: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        enabled: true,
        organizationId: org.id,
      },
      {
        name: "CNC-001 Full Calibration",
        description: "Quarterly full machine calibration",
        assetId: assets["CNC-001"],
        frequency: "QUARTERLY",
        intervalDays: 90,
        nextDue: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        enabled: true,
        organizationId: org.id,
      },
      {
        name: "CONV-001 Belt Inspection",
        description: "Biweekly belt tension and wear inspection",
        assetId: assets["CONV-001"],
        frequency: "BIWEEKLY",
        intervalDays: 14,
        nextDue: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        lastPerformed: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        enabled: true,
        organizationId: org.id,
      },
      {
        name: "PRS-001 Hydraulic Fluid Check",
        description: "Monthly hydraulic fluid level and quality check",
        assetId: assets["PRS-001"],
        frequency: "MONTHLY",
        intervalDays: 30,
        nextDue: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // overdue!
        enabled: true,
        organizationId: org.id,
      },
      {
        name: "HVAC-001 Filter Replacement",
        description: "Quarterly HVAC filter replacement",
        assetId: assets["HVAC-001"],
        frequency: "QUARTERLY",
        intervalDays: 90,
        nextDue: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        enabled: true,
        organizationId: org.id,
      },
      {
        name: "COMP-001 Air Filter Change",
        description: "Monthly air filter replacement",
        assetId: assets["COMP-001"],
        frequency: "MONTHLY",
        intervalDays: 30,
        nextDue: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        lastPerformed: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        enabled: true,
        organizationId: org.id,
      },
      {
        name: "All Pumps Bearing Inspection",
        description: "Semi-annual bearing inspection for all pumps",
        assetId: assets["PUMP-001"],
        frequency: "SEMI_ANNUAL",
        intervalDays: 180,
        nextDue: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
        enabled: true,
        organizationId: org.id,
      },
    ],
  });

  console.log("Creating parts...");
  const partDefs = [
    { partNumber: "BRG-001", name: "SKF 6205 Ball Bearing", quantity: 12, minStock: 5, category: "Bearings", unitCost: 15 },
    { partNumber: "BRG-002", name: "SKF 6308 Ball Bearing", quantity: 3, minStock: 4, category: "Bearings", unitCost: 28 },
    { partNumber: "FLT-001", name: "HVAC Panel Filter 20x20", quantity: 8, minStock: 4, category: "Filters", unitCost: 12 },
    { partNumber: "FLT-002", name: "Hydraulic Oil Filter", quantity: 6, minStock: 3, category: "Filters", unitCost: 35 },
    { partNumber: "BLT-001", name: "Conveyor Belt Section 2m", quantity: 4, minStock: 2, category: "Belts", unitCost: 180 },
    { partNumber: "BLT-002", name: "V-Belt A68", quantity: 10, minStock: 6, category: "Belts", unitCost: 22 },
    { partNumber: "OIL-001", name: "Spindle Oil ISO VG 10 5L", quantity: 5, minStock: 3, category: "Lubricants", unitCost: 45 },
    { partNumber: "OIL-002", name: "Hydraulic Oil ISO VG 46 20L", quantity: 3, minStock: 2, category: "Lubricants", unitCost: 85 },
    { partNumber: "GRS-001", name: "Lithium Grease Cartridge", quantity: 15, minStock: 8, category: "Lubricants", unitCost: 8 },
    { partNumber: "SEN-001", name: "Temperature Sensor PT100", quantity: 4, minStock: 2, category: "Sensors", unitCost: 65 },
    { partNumber: "SEN-002", name: "Vibration Sensor ICP", quantity: 2, minStock: 2, category: "Sensors", unitCost: 120 },
    { partNumber: "PMP-001", name: "Coolant Pump Impeller", quantity: 1, minStock: 1, category: "Pump Parts", unitCost: 95 },
    { partNumber: "SEL-001", name: "Contactor LC1D32", quantity: 3, minStock: 2, category: "Electrical", unitCost: 55 },
    { partNumber: "FUS-001", name: "Fuse 32A gG", quantity: 20, minStock: 10, category: "Electrical", unitCost: 3 },
    { partNumber: "GSK-001", name: "Hydraulic Cylinder Seal Kit", quantity: 2, minStock: 2, category: "Seals", unitCost: 75 },
  ];

  const parts: Record<string, string> = {};
  for (const def of partDefs) {
    const part = await prisma.part.create({
      data: {
        partNumber: def.partNumber,
        name: def.name,
        quantity: def.quantity,
        minStock: def.minStock,
        category: def.category,
        unitCost: def.unitCost,
        organizationId: org.id,
      },
    });
    parts[def.partNumber] = part.id;
  }

  console.log("Creating part usages...");
  await prisma.partUsage.createMany({
    data: [
      { workOrderId: wo3.id, partId: parts["BLT-001"], quantity: 1, unitCost: 180 },
      { workOrderId: wo5.id, partId: parts["OIL-001"], quantity: 1, unitCost: 45 },
      { workOrderId: wo5.id, partId: parts["GRS-001"], quantity: 2, unitCost: 8 },
    ],
  });

  console.log("Creating downtime events...");
  await prisma.downtimeEvent.createMany({
    data: [
      {
        assetId: assets["PRS-002"],
        reason: "BREAKDOWN",
        category: "Hydraulic",
        notes: "Complete hydraulic system failure. Awaiting emergency repair.",
        planned: false,
        startedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        organizationId: org.id,
      },
      {
        assetId: assets["CNC-002"],
        reason: "BREAKDOWN",
        category: "Mechanical",
        notes: "Excessive vibration caused emergency shutdown.",
        planned: false,
        startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        durationMin: 240,
        organizationId: org.id,
      },
      {
        assetId: assets["CNC-002"],
        reason: "BREAKDOWN",
        category: "Mechanical",
        notes: "Spindle bearing failure.",
        planned: false,
        startedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        durationMin: 120,
        organizationId: org.id,
      },
      {
        assetId: assets["CONV-002"],
        reason: "PREVENTIVE_MAINTENANCE",
        category: "Mechanical",
        notes: "Scheduled belt replacement and roller inspection.",
        planned: true,
        startedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        organizationId: org.id,
      },
      {
        assetId: assets["PUMP-001"],
        reason: "BREAKDOWN",
        category: "Mechanical",
        notes: "Bearing overheating caused pump shutdown.",
        planned: false,
        startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        durationMin: 360,
        organizationId: org.id,
      },
      {
        assetId: assets["HVAC-001"],
        reason: "SETUP_CHANGEOVER",
        category: "HVAC",
        notes: "Seasonal filter changeover.",
        planned: true,
        startedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
        durationMin: 60,
        organizationId: org.id,
      },
    ],
  });

  console.log("Creating audit logs...");
  const auditEntries = [
    { action: "asset.create", entityType: "Asset", entityId: assets["CNC-001"], userId: mark.id, metadata: { assetTag: "CNC-001", name: "Haas VF-2 CNC Mill" }, daysAgo: 30 },
    { action: "asset.create", entityType: "Asset", entityId: assets["PRS-002"], userId: mark.id, metadata: { assetTag: "PRS-002", name: "Stamping Press A" }, daysAgo: 28 },
    { action: "workorder.create", entityType: "MaintenanceWorkOrder", entityId: wo1.id, userId: sarah.id, metadata: { orderNumber: "WO-00001", title: "Investigate vibration increase" }, daysAgo: 2 },
    { action: "workorder.create", entityType: "MaintenanceWorkOrder", entityId: wo2.id, userId: sarah.id, metadata: { orderNumber: "WO-00002", title: "Hydraulic system failure" }, daysAgo: 2 },
    { action: "workorder.complete", entityType: "MaintenanceWorkOrder", entityId: wo3.id, userId: sarah.id, metadata: { orderNumber: "WO-00003", actualHours: 3 }, daysAgo: 10 },
    { action: "workorder.complete", entityType: "MaintenanceWorkOrder", entityId: wo5.id, userId: mark.id, metadata: { orderNumber: "WO-00005", actualHours: 1.5 }, daysAgo: 14 },
    { action: "workorder.create", entityType: "MaintenanceWorkOrder", entityId: wo6.id, userId: sarah.id, metadata: { orderNumber: "WO-00006", title: "Bearing replacement" }, daysAgo: 1 },
    { action: "downtime.create", entityType: "DowntimeEvent", entityId: null, userId: mike.id, metadata: { assetTag: "PRS-002", reason: "BREAKDOWN" }, daysAgo: 2 },
    { action: "asset.update", entityType: "Asset", entityId: assets["PRS-002"], userId: sarah.id, metadata: { changes: ["status"], newStatus: "DOWN" }, daysAgo: 2 },
    { action: "workorder.complete", entityType: "MaintenanceWorkOrder", entityId: wo8.id, userId: mark.id, metadata: { orderNumber: "WO-00008", actualHours: 0.5 }, daysAgo: 5 },
  ];

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId,
        organizationId: org.id,
        metadata: JSON.stringify(entry.metadata),
        createdAt: new Date(now.getTime() - entry.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("Creating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        type: "ALERT",
        title: "Critical Alert: Pressure Anomaly",
        message: "Stamping Press A pressure readings show dangerous anomalies.",
        link: "/predictive",
        userId: mark.id,
        organizationId: org.id,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        type: "WORK_ORDER",
        title: "Emergency Work Order Created",
        message: "WO-00002: Hydraulic system failure on Stamping Press A.",
        link: "/work-orders",
        userId: sarah.id,
        organizationId: org.id,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PREDICTIVE",
        title: "Vibration Trend Warning",
        message: "CNC-002 vibration levels are trending upward. Consider scheduling maintenance.",
        link: "/predictive",
        userId: sarah.id,
        organizationId: org.id,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PART_LOW_STOCK",
        title: "Low Stock: SKF 6308 Ball Bearing",
        message: "BRG-002 quantity (3) is below minimum stock level (4).",
        link: "/parts",
        userId: mark.id,
        organizationId: org.id,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        type: "PART_LOW_STOCK",
        title: "Low Stock: Vibration Sensor ICP",
        message: "SEN-002 quantity (2) is at minimum stock level (2).",
        link: "/parts",
        userId: mark.id,
        organizationId: org.id,
        read: true,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("Seed complete!");
}

main()
  .then(() => {
    console.log("Seed complete!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
