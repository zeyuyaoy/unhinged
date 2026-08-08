CREATE TABLE "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"action" text NOT NULL,
	"state_version" integer NOT NULL,
	"source" text NOT NULL,
	"latency_ms" integer NOT NULL,
	"token_usage" integer,
	"error_category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_hash" text NOT NULL,
	"case_number" integer NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"version" integer NOT NULL,
	"state" jsonb NOT NULL,
	"saved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "case_events_idempotency_idx" ON "case_events" USING btree ("case_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "cases_owner_updated_idx" ON "cases" USING btree ("owner_hash","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cases_owner_number_idx" ON "cases" USING btree ("owner_hash","case_number");