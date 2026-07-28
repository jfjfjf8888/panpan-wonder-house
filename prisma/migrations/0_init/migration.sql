-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('DRAFT', 'VALIDATING', 'INVALID', 'READY', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'WARNING');

-- CreateEnum
CREATE TYPE "UploadJobStatus" AS ENUM ('CREATED', 'UPLOADING', 'UPLOADED', 'VALIDATING', 'VALIDATED', 'INVALID', 'PREVIEW_READY', 'SAVED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cover_url" TEXT,
    "icon_url" TEXT,
    "status" "GameStatus" NOT NULL DEFAULT 'DRAFT',
    "current_version_id" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "heat_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_versions" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "manifest_json" JSONB NOT NULL,
    "entry_url" TEXT NOT NULL,
    "package_url" TEXT NOT NULL,
    "package_sha256" TEXT NOT NULL,
    "compressed_size" INTEGER NOT NULL,
    "uncompressed_size" INTEGER NOT NULL,
    "validation_status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validation_report_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "game_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "game_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_tag_relations" (
    "game_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "game_tag_relations_pkey" PRIMARY KEY ("game_id","tag_id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "game_id" TEXT,
    "game_version_id" TEXT,
    "visitor_id_hash" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "device_type" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "referrer" TEXT,
    "properties_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_game_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "game_id" TEXT NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "game_opens" INTEGER NOT NULL DEFAULT 0,
    "game_starts" INTEGER NOT NULL DEFAULT 0,
    "game_ends" INTEGER NOT NULL DEFAULT 0,
    "average_duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeat_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "heat_score" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "daily_game_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_site_stats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "game_opens" INTEGER NOT NULL DEFAULT 0,
    "average_duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobile_visitors" INTEGER NOT NULL DEFAULT 0,
    "desktop_visitors" INTEGER NOT NULL DEFAULT 0,
    "tablet_visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_site_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_jobs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "storage_key" TEXT,
    "status" "UploadJobStatus" NOT NULL DEFAULT 'CREATED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "validation_report_json" JSONB,
    "package_sha256" TEXT,
    "compressed_size" INTEGER,
    "target_game_id" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'create',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_config" (
    "id" TEXT NOT NULL,
    "global_enabled" BOOLEAN NOT NULL DEFAULT false,
    "site_ads_enabled" BOOLEAN NOT NULL DEFAULT false,
    "game_ads_enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "config_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "detail_json" JSONB,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "games_current_version_id_key" ON "games"("current_version_id");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_featured_idx" ON "games"("featured");

-- CreateIndex
CREATE INDEX "game_versions_game_id_idx" ON "game_versions"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_versions_game_id_version_key" ON "game_versions"("game_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "game_tags_name_key" ON "game_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "game_tags_slug_key" ON "game_tags"("slug");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_game_id_created_at_idx" ON "analytics_events"("game_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_visitor_id_hash_created_at_idx" ON "analytics_events"("visitor_id_hash", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_game_stats_date_game_id_key" ON "daily_game_stats"("date", "game_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_site_stats_date_key" ON "daily_site_stats"("date");

-- CreateIndex
CREATE INDEX "upload_jobs_admin_id_idx" ON "upload_jobs"("admin_id");

-- CreateIndex
CREATE INDEX "upload_jobs_status_idx" ON "upload_jobs"("status");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "game_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_versions" ADD CONSTRAINT "game_versions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_tag_relations" ADD CONSTRAINT "game_tag_relations_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_tag_relations" ADD CONSTRAINT "game_tag_relations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "game_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_game_version_id_fkey" FOREIGN KEY ("game_version_id") REFERENCES "game_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_game_stats" ADD CONSTRAINT "daily_game_stats_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_jobs" ADD CONSTRAINT "upload_jobs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

