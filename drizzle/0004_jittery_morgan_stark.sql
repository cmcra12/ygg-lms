CREATE TABLE "workflow_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflow_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"workflow_id" integer NOT NULL,
	"position" integer NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"kind" text DEFAULT 'task' NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"actioned_by" integer,
	"actioned_at" text
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workflows_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"template_key" text NOT NULL,
	"description" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"allocated_to" integer,
	"opened_by" integer,
	"opened_at" text NOT NULL,
	"completed_at" text
);
--> statement-breakpoint
ALTER TABLE "workflow_items" ADD CONSTRAINT "workflow_items_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_items" ADD CONSTRAINT "workflow_items_actioned_by_users_id_fk" FOREIGN KEY ("actioned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_allocated_to_users_id_fk" FOREIGN KEY ("allocated_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_items_workflow_idx" ON "workflow_items" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflows_entity_idx" ON "workflows" USING btree ("entity_type","entity_id");