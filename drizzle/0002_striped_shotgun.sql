CREATE TABLE "searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"customer_id" integer,
	"subject" text NOT NULL,
	"result" text,
	"reference" text,
	"notes" text,
	"run_by" integer,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_run_by_users_id_fk" FOREIGN KEY ("run_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "searches_customer_idx" ON "searches" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "searches_type_idx" ON "searches" USING btree ("type");