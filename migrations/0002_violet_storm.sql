CREATE TABLE "ai_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mode" text NOT NULL,
	"title" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"name" text NOT NULL,
	"sha1" text,
	"etag" text,
	"size" integer,
	"modified_at" timestamp,
	"version" text,
	"client_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_documents_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"company_name" text,
	"industry" text,
	"revenue" text,
	"employees" integer,
	"lifecycle_stage" text,
	"owner_id" text,
	"owner_email" text,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crm_contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"name" text NOT NULL,
	"stage" text,
	"pipeline" text,
	"amount" numeric(10, 2),
	"close_date" timestamp,
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text,
	"source" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"stage" text DEFAULT 'unassigned' NOT NULL,
	"assigned_to" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"type" text NOT NULL,
	"direction" text NOT NULL,
	"provider_id" text,
	"status" text,
	"body" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"assignee_id" text,
	"title" text NOT NULL,
	"due_date" timestamp,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"source" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	CONSTRAINT "intake_webhooks_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "signed_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "signed_by_name" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "signed_ip" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "stripe_checkout_session_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "payment_status" text;--> statement-breakpoint
ALTER TABLE "ai_chunks" ADD CONSTRAINT "ai_chunks_document_id_ai_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."ai_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_ai_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversations"("id") ON DELETE no action ON UPDATE no action;