-- Baseline migration for databases that predate Prisma migration tracking.
-- Existing production databases must mark this migration as applied once.

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawRule" (
    "id" SERIAL NOT NULL,
    "section" TEXT NOT NULL,
    "lawName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LawRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDomain" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedByUserId" INTEGER,

    CONSTRAINT "BlockedDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalConfig" (
    "id" SERIAL NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "GlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainAllowlist" (
    "id" SERIAL NOT NULL,
    "domain" TEXT NOT NULL,
    "listType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainAllowlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productLicenseNumber" TEXT,
    "licenseStatus" TEXT,
    "whoisInfo" TEXT,
    "aiRiskScore" DOUBLE PRECISION,
    "aiAnalysis" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiEvidenceQuotes" TEXT,
    "aiViolationCategories" TEXT,
    "aiSource" TEXT,
    "aiModelName" TEXT,
    "evidenceImage" TEXT,
    "evidenceText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reporterRole" TEXT NOT NULL,
    "reporterId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockLog" (
    "id" SERIAL NOT NULL,
    "caseId" TEXT NOT NULL,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "BlockLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "caseId" TEXT,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformMetric" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMetric_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ExtensionInstall" (
    "id" TEXT NOT NULL,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtensionInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CaseLaws" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LawRule_section_key" ON "LawRule"("section");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDomain_domain_key" ON "BlockedDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "DomainAllowlist_domain_key" ON "DomainAllowlist"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "_CaseLaws_AB_unique" ON "_CaseLaws"("A", "B");

-- CreateIndex
CREATE INDEX "_CaseLaws_B_index" ON "_CaseLaws"("B");

-- AddForeignKey
ALTER TABLE "BlockedDomain" ADD CONSTRAINT "BlockedDomain_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockLog" ADD CONSTRAINT "BlockLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaseLaws" ADD CONSTRAINT "_CaseLaws_A_fkey" FOREIGN KEY ("A") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CaseLaws" ADD CONSTRAINT "_CaseLaws_B_fkey" FOREIGN KEY ("B") REFERENCES "LawRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
