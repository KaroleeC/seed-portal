CREATE TABLE "crm_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_minutes" integer NOT NULL,
	"end_minutes" integer NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_availability_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"start_minutes" integer,
	"end_minutes" integer,
	"is_available" boolean NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_cadence_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"cadence_id" text NOT NULL,
	"day_id" text NOT NULL,
	"action_type" text NOT NULL,
	"schedule_rule" jsonb NOT NULL,
	"config" jsonb,
	"sort_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_cadence_days" (
	"id" text PRIMARY KEY NOT NULL,
	"cadence_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"sort_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_cadence_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_cadence_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"cadence_id" text NOT NULL,
	"lead_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"stopped_at" timestamp,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_cadence_scheduled_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"action_id" text NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_cadences" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"owner_user_id" text,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"trigger" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_event_attendees" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"name" text,
	"role" text DEFAULT 'attendee' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_event_types" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"duration_min" integer DEFAULT 30 NOT NULL,
	"buffer_before_min" integer DEFAULT 15 NOT NULL,
	"buffer_after_min" integer DEFAULT 15 NOT NULL,
	"meeting_link_template" text,
	"meeting_mode" text,
	"min_lead_minutes" integer DEFAULT 120 NOT NULL,
	"max_horizon_days" integer DEFAULT 14 NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type_id" text,
	"owner_user_id" text NOT NULL,
	"contact_id" text,
	"lead_id" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"location" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"meeting_link" text,
	"meeting_mode" text,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_lead_sources" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_lead_stages" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_lead_statuses" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_scheduling_links" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"event_type_id" text,
	"slug" text NOT NULL,
	"token_hash" text,
	"expires_at" timestamp,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"meeting_mode" text,
	"min_lead_minutes" integer,
	"max_horizon_days" integer,
	"custom_availability" jsonb,
	"brand_theme" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crm_scheduling_links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"scope" text NOT NULL,
	"prefs" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "converted_at" timestamp;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "converted_contact_id" text;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "last_contacted_at" timestamp;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD COLUMN "next_action_at" timestamp;--> statement-breakpoint
ALTER TABLE "crm_messages" ADD COLUMN "channel" text NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_messages" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "crm_messages" ADD COLUMN "provider_message_id" text;--> statement-breakpoint
ALTER TABLE "crm_messages" ADD COLUMN "thread_key" text;--> statement-breakpoint
ALTER TABLE "crm_messages" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "crm_messages" ADD COLUMN "raw" jsonb;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "quote_stage" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "proposal_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "signature_png_path" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "signature_certificate_json" jsonb;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "signed_by_email" text;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_messages" DROP COLUMN "type";