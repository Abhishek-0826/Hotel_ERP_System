-- ROOST initial schema (generated from schema.prisma) plus the rules Prisma cannot express.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "amenities" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "room_id" BIGINT NOT NULL,
    "bed_code" VARCHAR(50) NOT NULL,
    "position" VARCHAR(50),
    "price_override" DECIMAL(12,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" BIGSERIAL NOT NULL,
    "booking_code" VARCHAR(50) NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "guest_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "room_id" BIGINT NOT NULL,
    "bed_id" BIGINT NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "guest_name" VARCHAR(255) NOT NULL,
    "guest_phone" VARCHAR(30),
    "guest_email" VARCHAR(255),
    "source" VARCHAR(30) NOT NULL DEFAULT 'WEB',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "actual_check_in" TIMESTAMP(6),
    "actual_check_out" TIMESTAMP(6),
    "checked_in_by" BIGINT,
    "checked_out_by" BIGINT,
    "payment_status" VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "area" VARCHAR(100),
    "property_type" VARCHAR(30) NOT NULL DEFAULT 'PG',
    "gender_policy" VARCHAR(30) NOT NULL DEFAULT 'MIXED',
    "price" DECIMAL(12,2),
    "starting_price" DECIMAL(12,2),
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "tenant_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "amenity_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_property_amenities" PRIMARY KEY ("property_id","amenity_id")
);

-- CreateTable
CREATE TABLE "room_amenities" (
    "tenant_id" BIGINT NOT NULL,
    "room_id" BIGINT NOT NULL,
    "amenity_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_room_amenities" PRIMARY KEY ("room_id","amenity_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "room_number" VARCHAR(50) NOT NULL,
    "floor" INTEGER,
    "gender_policy" VARCHAR(30) NOT NULL DEFAULT 'MIXED',
    "has_ac" BOOLEAN NOT NULL DEFAULT false,
    "has_attached_bathroom" BOOLEAN NOT NULL DEFAULT false,
    "base_price" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" BIGSERIAL NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "whatsapp_number" VARCHAR(20),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "logo_url" TEXT,
    "brand_color" VARCHAR(20),
    "tagline" VARCHAR(255),
    "description" TEXT,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "website" VARCHAR(255),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255),
    "auth_user_id" UUID,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "role" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "department" VARCHAR(100),
    "joining_date" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "user_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_profiles" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "id_proof_type" VARCHAR(50),
    "id_proof_number" VARCHAR(100),
    "id_proof_photo" VARCHAR(500),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "nationality" VARCHAR(50) DEFAULT 'Indian',
    "gender" VARCHAR(10),
    "date_of_birth" DATE,
    "emergency_contact_name" VARCHAR(255),
    "emergency_contact_phone" VARCHAR(20),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "payment_code" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" VARCHAR(30) NOT NULL DEFAULT 'CASH',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "received_by" BIGINT,
    "transaction_ref" VARCHAR(255),
    "notes" TEXT,
    "paid_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "payment_id" BIGINT,
    "invoice_number" VARCHAR(50) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "issued_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "refund_code" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "approved_by" BIGINT,
    "processed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT,
    "guest_id" BIGINT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "cleanliness_rating" INTEGER,
    "service_rating" INTEGER,
    "value_rating" INTEGER,
    "comment" TEXT,
    "status" VARCHAR(30) NOT NULL DEFAULT 'NEW',
    "reviewed_by" BIGINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT,
    "guest_id" BIGINT NOT NULL,
    "complaint_code" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50),
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    "assigned_to" BIGINT,
    "resolution" TEXT,
    "resolved_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "user_id" BIGINT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "property_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(30) NOT NULL DEFAULT 'NON_RECURRING',
    "unit" VARCHAR(30) DEFAULT 'PIECE',
    "current_stock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_per_unit" DECIMAL(12,2),
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "item_id" BIGINT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "performed_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ONLINE',
    "stream_url" VARCHAR(2048),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT,
    "category" VARCHAR(50) DEFAULT 'GENERAL',
    "description" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_amenities_tenant_id" ON "amenities"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_amenities_tenant_id" ON "amenities"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_amenities_tenant_name" ON "amenities"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "idx_beds_room_id" ON "beds"("room_id");

-- CreateIndex
CREATE INDEX "idx_beds_status" ON "beds"("status");

-- CreateIndex
CREATE INDEX "idx_beds_tenant_id" ON "beds"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_beds_room_code" ON "beds"("room_id", "bed_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_beds_tenant_room_id" ON "beds"("tenant_id", "room_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "idx_bookings_bed_dates" ON "bookings"("bed_id", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "idx_bookings_bed_id" ON "bookings"("bed_id");

-- CreateIndex
CREATE INDEX "idx_bookings_guest_id" ON "bookings"("guest_id");

-- CreateIndex
CREATE INDEX "idx_bookings_property_id" ON "bookings"("property_id");

-- CreateIndex
CREATE INDEX "idx_bookings_room_id" ON "bookings"("room_id");

-- CreateIndex
CREATE INDEX "idx_bookings_status" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "idx_bookings_tenant_id" ON "bookings"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_properties_city" ON "properties"("city");

-- CreateIndex
CREATE INDEX "idx_properties_tenant_id" ON "properties"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_properties_tenant_id" ON "properties"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_properties_tenant_slug" ON "properties"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "idx_property_amenities_amenity_id" ON "property_amenities"("amenity_id");

-- CreateIndex
CREATE INDEX "idx_property_amenities_tenant_id" ON "property_amenities"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_room_amenities_amenity_id" ON "room_amenities"("amenity_id");

-- CreateIndex
CREATE INDEX "idx_room_amenities_tenant_id" ON "room_amenities"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_rooms_property_id" ON "rooms"("property_id");

-- CreateIndex
CREATE INDEX "idx_rooms_tenant_id" ON "rooms"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rooms_property_number" ON "rooms"("property_id", "room_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rooms_tenant_id" ON "rooms"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_rooms_tenant_property_id" ON "rooms"("tenant_id", "property_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("auth_user_id");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_tenant_id" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_created" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_guest_profiles_tenant" ON "guest_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_guest_profiles_user" ON "guest_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_guest_profiles_tenant_user" ON "guest_profiles"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_code_key" ON "payments"("payment_code");

-- CreateIndex
CREATE INDEX "idx_payments_tenant" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_payments_booking" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_tenant" ON "invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_invoices_booking" ON "invoices"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_refund_code_key" ON "refunds"("refund_code");

-- CreateIndex
CREATE INDEX "idx_refunds_tenant" ON "refunds"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_refunds_payment" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "idx_feedback_tenant" ON "feedback"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_feedback_booking" ON "feedback"("booking_id");

-- CreateIndex
CREATE INDEX "idx_feedback_guest" ON "feedback"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "complaints_complaint_code_key" ON "complaints"("complaint_code");

-- CreateIndex
CREATE INDEX "idx_complaints_tenant" ON "complaints"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_complaints_status" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "idx_complaints_priority" ON "complaints"("priority");

-- CreateIndex
CREATE INDEX "idx_audit_logs_tenant" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_inventory_items_tenant" ON "inventory_items"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_inventory_items_property" ON "inventory_items"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_items_tenant_property_name" ON "inventory_items"("tenant_id", "property_id", "name");

-- CreateIndex
CREATE INDEX "idx_inventory_tx_tenant" ON "inventory_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_inventory_tx_item" ON "inventory_transactions"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "cameras_name_key" ON "cameras"("name");

-- CreateIndex
CREATE INDEX "idx_cameras_status" ON "cameras"("status");

-- CreateIndex
CREATE INDEX "idx_system_settings_tenant" ON "system_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_system_settings_category" ON "system_settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "fk_amenities_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "fk_beds_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "fk_beds_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "fk_beds_tenant_room" FOREIGN KEY ("tenant_id", "room_id") REFERENCES "rooms"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_bed" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_guest" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_checked_out_by_fkey" FOREIGN KEY ("checked_out_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_room" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_tenant_property" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "properties"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_tenant_property_room" FOREIGN KEY ("tenant_id", "property_id", "room_id") REFERENCES "rooms"("tenant_id", "property_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_tenant_room_bed" FOREIGN KEY ("tenant_id", "room_id", "bed_id") REFERENCES "beds"("tenant_id", "room_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "fk_properties_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "fk_property_amenities_amenity" FOREIGN KEY ("tenant_id", "amenity_id") REFERENCES "amenities"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "fk_property_amenities_property" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_amenities" ADD CONSTRAINT "fk_room_amenities_amenity" FOREIGN KEY ("tenant_id", "amenity_id") REFERENCES "amenities"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "room_amenities" ADD CONSTRAINT "fk_room_amenities_room" FOREIGN KEY ("tenant_id", "room_id") REFERENCES "rooms"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_rooms_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_rooms_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "fk_rooms_tenant_property" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "properties"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "fk_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════
-- Rules Prisma cannot express in schema.prisma
-- (consolidated from the earlier incremental migrations 0002–0008)
-- ═══════════════════════════════════════════════════════════════════════════

-- No two active bookings may overlap on the same bed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "bookings" ADD CONSTRAINT "no_double_booking"
  EXCLUDE USING gist (
    "bed_id" WITH =,
    daterange("check_in", "check_out", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED', 'CHECKED_IN'));

-- One settings row per (tenant, key); tenant_id NULL = platform default.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_system_settings_tenant_key"
  ON "system_settings"(COALESCE("tenant_id", 0), "setting_key");

-- Allowed values
ALTER TABLE "tenants" ADD CONSTRAINT "chk_tenants_status" CHECK ("status" IN ('ACTIVE', 'SUSPENDED'));
ALTER TABLE "users" ADD CONSTRAINT "chk_users_role"
  CHECK ("role" IN ('GUEST','OWNER','STAFF','PLATFORM_ADMIN','MANAGER','RECEPTIONIST'));
ALTER TABLE "users" ADD CONSTRAINT "chk_users_status" CHECK ("status" IN ('ACTIVE', 'INACTIVE'));
ALTER TABLE "properties" ADD CONSTRAINT "chk_properties_status" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'ACTIVE'));
ALTER TABLE "properties" ADD CONSTRAINT "chk_properties_type" CHECK ("property_type" IN ('PG', 'HOSTEL', 'CO_LIVING', 'DORMITORY'));
ALTER TABLE "properties" ADD CONSTRAINT "chk_properties_gender_policy" CHECK ("gender_policy" IN ('MIXED', 'MALE', 'FEMALE'));
ALTER TABLE "beds" ADD CONSTRAINT "chk_beds_status" CHECK ("status" IN ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'));
ALTER TABLE "bookings" ADD CONSTRAINT "chk_bookings_status"
  CHECK ("status" IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'CHECKED_IN', 'CHECKED_OUT', 'REJECTED'));
ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_method" CHECK ("method" IN ('UPI', 'CARD', 'NET_BANKING', 'COD'));
ALTER TABLE "payments" ADD CONSTRAINT "chk_payments_status"
  CHECK ("status" IN ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'PAY_AT_PROPERTY'));
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_status" CHECK ("status" IN ('DRAFT','ISSUED','PAID','CANCELLED'));
ALTER TABLE "refunds" ADD CONSTRAINT "chk_refunds_status" CHECK ("status" IN ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'));
ALTER TABLE "complaints" ADD CONSTRAINT "chk_complaints_priority" CHECK ("priority" IN ('LOW','MEDIUM','HIGH','URGENT'));
ALTER TABLE "complaints" ADD CONSTRAINT "chk_complaints_status" CHECK ("status" IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED'));
ALTER TABLE "complaints" ADD CONSTRAINT "chk_complaints_category"
  CHECK ("category" IN ('CLEANLINESS','NOISE','MAINTENANCE','SERVICE','FOOD','SAFETY','OTHER'));
ALTER TABLE "inventory_items" ADD CONSTRAINT "chk_inventory_category" CHECK ("category" IN ('RECURRING','NON_RECURRING'));
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "chk_inventory_tx_type" CHECK ("type" IN ('IN','OUT','ADJUSTMENT'));
ALTER TABLE "cameras" ADD CONSTRAINT "chk_cameras_status" CHECK ("status" IN ('ONLINE', 'OFFLINE', 'MAINTENANCE'));
ALTER TABLE "feedback" ADD CONSTRAINT "chk_feedback_ratings" CHECK (
  "overall_rating" BETWEEN 1 AND 5
  AND ("cleanliness_rating" IS NULL OR "cleanliness_rating" BETWEEN 1 AND 5)
  AND ("service_rating" IS NULL OR "service_rating" BETWEEN 1 AND 5)
  AND ("value_rating" IS NULL OR "value_rating" BETWEEN 1 AND 5)
);

-- Platform-wide default settings (tenant_id NULL).
INSERT INTO "system_settings" ("tenant_id", "setting_key", "setting_value", "category", "description") VALUES
  (NULL, 'default_language',     'en',           'LANGUAGE', 'Default system language (en/hi/mr)'),
  (NULL, 'supported_languages',  'en,hi,mr',     'LANGUAGE', 'Supported languages: English, Hindi, Marathi'),
  (NULL, 'default_timezone',     'Asia/Kolkata', 'GENERAL',  'Default timezone'),
  (NULL, 'default_currency',     'INR',          'GENERAL',  'Default currency'),
  (NULL, 'default_bed_count',    '46',           'GENERAL',  'Total default bed count'),
  (NULL, 'ac_bed_count',         '20',           'GENERAL',  'AC beds — Super Deluxe'),
  (NULL, 'non_ac_bed_count',     '26',           'GENERAL',  'Non-AC beds — Deluxe'),
  (NULL, 'backup_enabled',       'false',        'BACKUP',   'Automatic backup enabled'),
  (NULL, 'backup_frequency',     'daily',        'BACKUP',   'Backup frequency'),
  (NULL, 'camera_enabled',       'false',        'CAMERA',   'Camera integration enabled')
ON CONFLICT DO NOTHING;
