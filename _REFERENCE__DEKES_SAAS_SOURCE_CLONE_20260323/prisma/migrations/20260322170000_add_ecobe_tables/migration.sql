-- CreateEnum
CREATE TYPE "LeadEnrichmentStatus" AS ENUM ('PENDING', 'ENRICHING', 'ENRICHED', 'FAILED');

-- CreateEnum
CREATE TYPE "EcobeHandoffStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'FAILED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "EcobeHandoffType" AS ENUM ('PROSPECT', 'TENANT_CREATE', 'DEMO_TRIGGER', 'WORKLOAD_SIGNAL');

-- CreateEnum
CREATE TYPE "EcobeEventType" AS ENUM ('BUDGET_WARNING', 'BUDGET_EXCEEDED', 'POLICY_DELAY', 'POLICY_BLOCK', 'HIGH_CARBON_PATTERN', 'LOW_CONFIDENCE_REGION', 'CLEAN_WINDOW_OPPORTUNITY', 'PROVIDER_DISAGREEMENT_ALERT', 'EXECUTION_DRIFT_RISK', 'ROUTING_POLICY_INSIGHT');

-- CreateEnum
CREATE TYPE "EcobeEventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EcobeEventClassification" AS ENUM ('OPPORTUNITY', 'RISK', 'INFORMATIONAL', 'NO_ACTION');

-- AlterTable: Add ECOBE carbon-aware routing metadata to Run
ALTER TABLE "Run" ADD COLUMN "ecobeDecisionId" TEXT;
ALTER TABLE "Run" ADD COLUMN "ecobeRegion" TEXT;
ALTER TABLE "Run" ADD COLUMN "ecobeCarbonDelta" DOUBLE PRECISION;
ALTER TABLE "Run" ADD COLUMN "ecobeQualityTier" TEXT;
ALTER TABLE "Run" ADD COLUMN "ecobePolicyAction" TEXT;
ALTER TABLE "Run" ADD COLUMN "ecobeDecisionTimestamp" TIMESTAMP(3);

-- AlterTable: Add UTM attribution and enrichment fields to Lead
ALTER TABLE "Lead" ADD COLUMN "utm_source" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utm_medium" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utm_campaign" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utm_term" TEXT;
ALTER TABLE "Lead" ADD COLUMN "utm_content" TEXT;
ALTER TABLE "Lead" ADD COLUMN "enrichmentStatus" "LeadEnrichmentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Lead" ADD COLUMN "enrichedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "enrichmentMeta" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Lead" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN "duplicateOfLeadId" TEXT;

-- CreateTable
CREATE TABLE "OperationalMetric" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT,
    "value" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcobeHandoff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "queryId" TEXT,
    "runId" TEXT,
    "externalOrgId" TEXT,
    "externalLeadId" TEXT,
    "handoffType" "EcobeHandoffType" NOT NULL DEFAULT 'PROSPECT',
    "status" "EcobeHandoffStatus" NOT NULL DEFAULT 'PENDING',
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "responseJson" JSONB,
    "errorMessage" TEXT,
    "qualificationReason" TEXT,
    "qualificationScore" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcobeHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcobeInboundEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "handoffId" TEXT NOT NULL,
    "eventType" "EcobeEventType" NOT NULL,
    "severity" "EcobeEventSeverity" NOT NULL,
    "classification" "EcobeEventClassification" NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "budgetUsed" DOUBLE PRECISION,
    "budgetLimit" DOUBLE PRECISION,
    "budgetCurrency" TEXT,
    "policyId" TEXT,
    "policyAction" TEXT,
    "delayMinutes" INTEGER,
    "cleanWindowRegion" TEXT,
    "replayUrl" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcobeInboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalMetric_name_createdAt_idx" ON "OperationalMetric"("name", "createdAt");

-- CreateIndex
CREATE INDEX "EcobeHandoff_organizationId_status_idx" ON "EcobeHandoff"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EcobeHandoff_createdAt_idx" ON "EcobeHandoff"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EcobeInboundEvent_handoffId_key" ON "EcobeInboundEvent"("handoffId");

-- CreateIndex
CREATE INDEX "EcobeInboundEvent_organizationId_createdAt_idx" ON "EcobeInboundEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "EcobeInboundEvent_organizationId_eventType_idx" ON "EcobeInboundEvent"("organizationId", "eventType");

-- CreateIndex (Lead enrichment and UTM)
CREATE INDEX "Lead_enrichmentStatus_idx" ON "Lead"("enrichmentStatus");

-- CreateIndex (Lead UTM)
CREATE INDEX "Lead_utm_source_idx" ON "Lead"("utm_source");

-- CreateIndex (Lead UTM campaign)
CREATE INDEX "Lead_utm_campaign_idx" ON "Lead"("utm_campaign");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateOfLeadId_fkey" FOREIGN KEY ("duplicateOfLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcobeHandoff" ADD CONSTRAINT "EcobeHandoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcobeHandoff" ADD CONSTRAINT "EcobeHandoff_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcobeHandoff" ADD CONSTRAINT "EcobeHandoff_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcobeHandoff" ADD CONSTRAINT "EcobeHandoff_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcobeInboundEvent" ADD CONSTRAINT "EcobeInboundEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
