-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'PROCESSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secret_2fa" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_enabled" BOOLEAN NOT NULL DEFAULT false,
    "registration_deadline" TIMESTAMP(3),
    "registration_open_override" BOOLEAN,
    "location" TEXT,
    "partner_logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "max_participants" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_pricing" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "price_type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "group_id" TEXT,
    "event_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "activity_id" TEXT,
    "activity_name" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "sumup_checkout_id" TEXT,
    "sumup_transaction_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "checkout_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "TransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "sumup_response" JSONB,
    "checkout_url" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_booking" BOOLEAN NOT NULL DEFAULT false,
    "booking_data" JSONB,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "admin_name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_name_key" ON "admins"("name");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "activities_event_id_idx" ON "activities"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "activities_event_id_name_key" ON "activities"("event_id", "name");

-- CreateIndex
CREATE INDEX "event_pricing_activity_id_idx" ON "event_pricing"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_pricing_activity_id_price_type_key" ON "event_pricing"("activity_id", "price_type");

-- CreateIndex
CREATE INDEX "reservations_event_id_idx" ON "reservations"("event_id");

-- CreateIndex
CREATE INDEX "reservations_activity_id_idx" ON "reservations"("activity_id");

-- CreateIndex
CREATE INDEX "reservations_email_idx" ON "reservations"("email");

-- CreateIndex
CREATE INDEX "reservations_payment_status_idx" ON "reservations"("payment_status");

-- CreateIndex
CREATE INDEX "reservations_archived_idx" ON "reservations"("archived");

-- CreateIndex
CREATE INDEX "reservations_group_id_idx" ON "reservations"("group_id");

-- CreateIndex
CREATE INDEX "payment_transactions_reservation_id_idx" ON "payment_transactions"("reservation_id");

-- CreateIndex
CREATE INDEX "payment_transactions_checkout_id_idx" ON "payment_transactions"("checkout_id");

-- CreateIndex
CREATE INDEX "payment_transactions_transaction_id_idx" ON "payment_transactions"("transaction_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "contact_requests_status_idx" ON "contact_requests"("status");

-- CreateIndex
CREATE INDEX "contact_requests_created_at_idx" ON "contact_requests"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pricing" ADD CONSTRAINT "event_pricing_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

