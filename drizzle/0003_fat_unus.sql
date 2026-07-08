CREATE TABLE "application_applicants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_applicants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"application_id" integer NOT NULL,
	"position" integer NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"surname" text NOT NULL,
	"date_of_birth" text,
	"gender" text,
	"years_industry_experience" integer,
	"city_country_of_birth" text,
	"drivers_licence_no" text,
	"drivers_licence_expiry" text,
	"drivers_card_no" text,
	"medicare_no" text,
	"medicare_position" text,
	"medicare_expiry" text,
	"mobile" text,
	"email" text,
	"home_address_line1" text,
	"home_suburb" text,
	"home_state" text,
	"home_postcode" text,
	"home_ownership" text,
	"previous_address" text,
	"privacy_acknowledged" boolean DEFAULT false NOT NULL,
	"assets_detail" text,
	"liabilities_detail" text,
	"total_assets_cents" integer,
	"total_liabilities_cents" integer,
	"comments" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "trading_name" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "entity_type" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "trustee_type" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "trustee_name" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "years_trading" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "nature_of_business" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "business_phone" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "business_address_line1" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "business_suburb" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "business_state" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "business_postcode" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "premises" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "employees_count" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "machines_in_fleet" integer;--> statement-breakpoint
ALTER TABLE "application_applicants" ADD CONSTRAINT "application_applicants_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_applicants_app_idx" ON "application_applicants" USING btree ("application_id");