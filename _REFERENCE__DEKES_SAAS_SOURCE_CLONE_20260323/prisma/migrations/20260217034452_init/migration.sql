-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('REJECTED', 'OUTREACH_READY', 'REVIEW', 'CONTACTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CREATED', 'UPDATED', 'QUALIFIED', 'REJECTED', 'CONTACTED', 'WON', 'LOST', 'TEMPLATE_SENT', 'EXPORTED');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('DM', 'FU');

-- CreateEnum
CREATE TYPE "SourcePack" AS ENUM ('FORUMS', 'SOCIAL', 'PROFESSIONAL', 'WIDE_WEB');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "plan" "BillingPlan" NOT NULL DEFAULT 'FREE',
    "status" "OrgStatus" NOT NULL DEFAULT 'TRIAL',
    "monthlyLeadQuota" INTEGER NOT NULL DEFAULT 100,
    "monthlyLeadsUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "sourcePack" "SourcePack" NOT NULL DEFAULT 'WIDE_WEB',
    "market" TEXT NOT NULL DEFAULT 'en-US',
    "freshness" TEXT NOT NULL DEFAULT 'Week',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ipsRewardSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipsWeightSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runsCount" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "qualifiedCount" INTEGER NOT NULL DEFAULT 0,
    "wonCount" INTEGER NOT NULL DEFAULT 0,
    "lostCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastWinAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "leadCount" INTEGER NOT NULL DEFAULT 0,
    "qualifiedCount" INTEGER NOT NULL DEFAULT 0,
    "geoLocation" TEXT,
    "geoGl" TEXT,
    "geoHl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STARTED',
    "error" TEXT,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "type" "EntityType" NOT NULL DEFAULT 'PERSON',
    "displayName" TEXT,
    "primaryEmail" TEXT,
    "primaryDomain" TEXT,
    "primaryHandle" TEXT,
    "handles" JSONB NOT NULL DEFAULT '{}',
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "publishedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL,
    "intentDepth" INTEGER NOT NULL,
    "urgencyVelocity" INTEGER NOT NULL,
    "budgetSignals" INTEGER NOT NULL,
    "fitPrecision" INTEGER NOT NULL,
    "buyerType" TEXT,
    "painTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rush12HourEligible" BOOLEAN NOT NULL DEFAULT false,
    "intentClass" TEXT,
    "intentConfidence" DOUBLE PRECISION,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "status" "LeadStatus" NOT NULL DEFAULT 'OUTREACH_READY',
    "rejectedReason" TEXT,
    "entityId" TEXT,
    "queryId" TEXT,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarbonReport" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "actualCO2" DOUBLE PRECISION NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "CarbonReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "buyerType" TEXT,
    "serviceTag" TEXT,
    "painTag" TEXT,
    "body" TEXT NOT NULL,
    "timesSent" INTEGER NOT NULL DEFAULT 0,
    "repliesCount" INTEGER NOT NULL DEFAULT 0,
    "wonCount" INTEGER NOT NULL DEFAULT 0,
    "ipsRewardSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ipsWeightSum" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachAttempt" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "queryId" TEXT,
    "templateId" TEXT,
    "queryProb" DOUBLE PRECISION NOT NULL,
    "templateProb" DOUBLE PRECISION NOT NULL,
    "overallProb" DOUBLE PRECISION NOT NULL,
    "policy" TEXT NOT NULL DEFAULT 'UCB1_SOFTMAX',
    "policyVersion" TEXT NOT NULL DEFAULT 'v1',
    "outcome" TEXT,
    "outcomeAt" TIMESTAMP(3),
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringWeights" (
    "id" TEXT NOT NULL,
    "intentWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "urgencyWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "budgetWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "fitWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringWeights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionPattern" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "lastWinAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionPattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

-- CreateIndex
CREATE INDEX "Query_enabled_idx" ON "Query"("enabled");

-- CreateIndex
CREATE INDEX "Query_organizationId_idx" ON "Query"("organizationId");

-- CreateIndex
CREATE INDEX "Run_organizationId_idx" ON "Run"("organizationId");

-- CreateIndex
CREATE INDEX "Run_queryId_idx" ON "Run"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_primaryDomain_key" ON "Entity"("primaryDomain");

-- CreateIndex
CREATE INDEX "Entity_primaryEmail_idx" ON "Entity"("primaryEmail");

-- CreateIndex
CREATE INDEX "Entity_primaryDomain_idx" ON "Entity"("primaryDomain");

-- CreateIndex
CREATE INDEX "Lead_score_idx" ON "Lead"("score");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_entityId_idx" ON "Lead"("entityId");

-- CreateIndex
CREATE INDEX "Lead_queryId_idx" ON "Lead"("queryId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_organizationId_canonicalHash_key" ON "Lead"("organizationId", "canonicalHash");

-- CreateIndex
CREATE INDEX "LeadEvent_leadId_type_idx" ON "LeadEvent"("leadId", "type");

-- CreateIndex
CREATE INDEX "CarbonReport_queryId_idx" ON "CarbonReport"("queryId");

-- CreateIndex
CREATE INDEX "CarbonReport_reportedAt_idx" ON "CarbonReport"("reportedAt");

-- CreateIndex
CREATE INDEX "Template_enabled_idx" ON "Template"("enabled");

-- CreateIndex
CREATE INDEX "OutreachAttempt_leadId_idx" ON "OutreachAttempt"("leadId");

-- CreateIndex
CREATE INDEX "OutreachAttempt_queryId_idx" ON "OutreachAttempt"("queryId");

-- CreateIndex
CREATE INDEX "OutreachAttempt_templateId_idx" ON "OutreachAttempt"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversionPattern_key_key" ON "ConversionPattern"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachAttempt" ADD CONSTRAINT "OutreachAttempt_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

