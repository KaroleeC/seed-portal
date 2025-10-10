CREATE TABLE "approval_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"contact_email" text NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculator_service_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"sow_title" text,
	"sow_template" text,
	"agreement_link" text,
	"included_fields_json" text,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "calculator_service_content_service_unique" UNIQUE("service")
);
--> statement-breakpoint
CREATE TABLE "client_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_profile_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"user_id" integer,
	"hubspot_activity_id" text,
	"activity_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_profile_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by" integer NOT NULL,
	"file_url" text,
	"extracted_text" text,
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_intel_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_email" text NOT NULL,
	"company_name" text NOT NULL,
	"industry" text,
	"revenue" text,
	"employees" integer,
	"hubspot_contact_id" text,
	"qbo_company_id" text,
	"pain_points" text[],
	"services" text[],
	"risk_score" integer DEFAULT 0,
	"upsell_opportunities" text[],
	"last_analyzed" timestamp,
	"last_activity" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_intel_profiles_contact_email_unique" UNIQUE("contact_email")
);
--> statement-breakpoint
CREATE TABLE "commission_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"commission_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"approved_by" integer,
	"original_amount" numeric(10, 2) NOT NULL,
	"requested_amount" numeric(10, 2) NOT NULL,
	"final_amount" numeric(10, 2),
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text DEFAULT 'request' NOT NULL,
	"notes" text,
	"requested_date" timestamp DEFAULT now() NOT NULL,
	"reviewed_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer,
	"hubspot_invoice_id" integer,
	"hubspot_subscription_id" integer,
	"monthly_bonus_id" integer,
	"milestone_bonus_id" integer,
	"sales_rep_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"month_number" integer NOT NULL,
	"service_type" text,
	"date_earned" timestamp NOT NULL,
	"date_paid" timestamp,
	"payment_method" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"hubspot_deal_id" text NOT NULL,
	"deal_name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"setup_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"monthly_fee" numeric(10, 2) NOT NULL,
	"stage" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"owner_id" integer NOT NULL,
	"hubspot_owner_id" text,
	"closed_date" timestamp,
	"service_type" text NOT NULL,
	"company_name" text,
	"contact_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deals_hubspot_deal_id_unique" UNIQUE("hubspot_deal_id")
);
--> statement-breakpoint
CREATE TABLE "hubspot_invoice_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"hubspot_line_item_id" text,
	"name" text NOT NULL,
	"description" text,
	"quantity" numeric(10, 2) DEFAULT '1',
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"service_type" text,
	"is_recurring" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hubspot_invoice_line_items_hubspot_line_item_id_unique" UNIQUE("hubspot_line_item_id")
);
--> statement-breakpoint
CREATE TABLE "hubspot_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"hubspot_invoice_id" text NOT NULL,
	"hubspot_deal_id" text,
	"hubspot_contact_id" text,
	"sales_rep_id" integer,
	"invoice_number" text,
	"status" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"paid_amount" numeric(10, 2) DEFAULT '0',
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp,
	"paid_date" timestamp,
	"company_name" text,
	"is_processed_for_commission" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hubspot_invoices_hubspot_invoice_id_unique" UNIQUE("hubspot_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "hubspot_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"hubspot_subscription_id" text NOT NULL,
	"hubspot_contact_id" text,
	"hubspot_deal_id" text,
	"sales_rep_id" integer,
	"status" text NOT NULL,
	"monthly_amount" numeric(10, 2) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"last_invoice_date" timestamp,
	"next_invoice_date" timestamp,
	"company_name" text,
	"service_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hubspot_subscriptions_hubspot_subscription_id_unique" UNIQUE("hubspot_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "kb_article_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_id" integer NOT NULL,
	"change_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"category_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false,
	"tags" text[],
	"view_count" integer DEFAULT 0,
	"search_vector" text,
	"ai_summary" text,
	"last_reviewed_at" timestamp,
	"last_reviewed_by" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kb_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kb_bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"article_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'folder',
	"color" text DEFAULT 'blue',
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kb_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kb_search_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"query" text NOT NULL,
	"results_count" integer DEFAULT 0,
	"clicked_article_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_bonuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"sales_rep_id" integer NOT NULL,
	"milestone" integer NOT NULL,
	"bonus_amount" numeric(10, 2) NOT NULL,
	"includes_equity" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"date_earned" timestamp NOT NULL,
	"date_paid" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_bonuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"sales_rep_id" integer NOT NULL,
	"month" text NOT NULL,
	"clients_closed_count" integer NOT NULL,
	"bonus_amount" numeric(10, 2) NOT NULL,
	"bonus_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"date_earned" timestamp NOT NULL,
	"date_paid" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"base_fee" numeric(10, 2) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_affected" text NOT NULL,
	"record_id" integer NOT NULL,
	"field_changed" text NOT NULL,
	"old_value" text,
	"new_value" text NOT NULL,
	"changed_by" integer NOT NULL,
	"change_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_industry_multipliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"industry" text NOT NULL,
	"monthly_multiplier" numeric(5, 3) NOT NULL,
	"cleanup_multiplier" numeric(5, 3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_industry_multipliers_industry_unique" UNIQUE("industry")
);
--> statement-breakpoint
CREATE TABLE "pricing_revenue_multipliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"revenue_range" text NOT NULL,
	"multiplier" numeric(5, 3) NOT NULL,
	"min_revenue" integer,
	"max_revenue" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_revenue_multipliers_revenue_range_unique" UNIQUE("revenue_range")
);
--> statement-breakpoint
CREATE TABLE "pricing_service_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" numeric(10, 2) NOT NULL,
	"setting_type" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"tier" text NOT NULL,
	"volume_band" text NOT NULL,
	"base_fee" numeric(10, 2) NOT NULL,
	"tier_multiplier" numeric(5, 3) DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_transaction_surcharges" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_range" text NOT NULL,
	"surcharge" numeric(10, 2) NOT NULL,
	"min_transactions" integer,
	"max_transactions" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_transaction_surcharges_transaction_range_unique" UNIQUE("transaction_range")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_email" text NOT NULL,
	"monthly_revenue_range" text NOT NULL,
	"monthly_transactions" text NOT NULL,
	"industry" text NOT NULL,
	"cleanup_months" integer NOT NULL,
	"cleanup_complexity" numeric(3, 2) NOT NULL,
	"cleanup_periods" text[],
	"cleanup_override" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"approval_required" boolean DEFAULT false NOT NULL,
	"monthly_fee" numeric(10, 2) NOT NULL,
	"setup_fee" numeric(10, 2) NOT NULL,
	"taas_monthly_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"taas_prior_years_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"includes_bookkeeping" boolean DEFAULT true NOT NULL,
	"includes_taas" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"quote_type" text DEFAULT 'bookkeeping' NOT NULL,
	"entity_type" text,
	"num_entities" integer,
	"custom_num_entities" integer,
	"states_filed" integer,
	"custom_states_filed" integer,
	"international_filing" boolean,
	"num_business_owners" integer,
	"custom_num_business_owners" integer,
	"bookkeeping_quality" text,
	"include_1040s" boolean,
	"prior_years_unfiled" integer,
	"prior_year_filings" integer[],
	"qbo_subscription" boolean DEFAULT false,
	"service_tier" text DEFAULT 'Automated',
	"accounting_basis" text,
	"business_loans" boolean,
	"current_bookkeeping_software" text,
	"other_bookkeeping_software" text,
	"primary_bank" text,
	"other_primary_bank" text,
	"additional_banks" text[],
	"other_additional_banks" text[],
	"merchant_providers" text[],
	"other_merchant_provider" text,
	"service_bookkeeping" boolean DEFAULT false,
	"service_taas" boolean DEFAULT false,
	"service_payroll" boolean DEFAULT false,
	"service_ap_ar_lite" boolean DEFAULT false,
	"service_fpa_lite" boolean DEFAULT false,
	"service_monthly_bookkeeping" boolean DEFAULT false,
	"service_cleanup_projects" boolean DEFAULT false,
	"service_taas_monthly" boolean DEFAULT false,
	"service_prior_year_filings" boolean DEFAULT false,
	"service_cfo_advisory" boolean DEFAULT false,
	"cfo_advisory_type" text,
	"cfo_advisory_bundle_hours" integer,
	"cfo_advisory_hubspot_product_id" text,
	"service_payroll_service" boolean DEFAULT false,
	"payroll_employee_count" integer DEFAULT 1,
	"payroll_state_count" integer DEFAULT 1,
	"service_ap_ar_service" boolean DEFAULT false,
	"ap_vendor_bills_band" text,
	"ap_vendor_count" integer,
	"custom_ap_vendor_count" integer,
	"ap_service_tier" text,
	"service_ar_service" boolean DEFAULT false,
	"ar_customer_invoices_band" text,
	"ar_customer_count" integer,
	"custom_ar_customer_count" integer,
	"ar_service_tier" text,
	"service_agent_of_service" boolean DEFAULT false,
	"agent_of_service_additional_states" integer DEFAULT 0,
	"agent_of_service_complex_case" boolean DEFAULT false,
	"service_fpa_build" boolean DEFAULT false,
	"service_fpa_support" boolean DEFAULT false,
	"service_nexus_study" boolean DEFAULT false,
	"service_entity_optimization" boolean DEFAULT false,
	"service_cost_segregation" boolean DEFAULT false,
	"service_rd_credit" boolean DEFAULT false,
	"service_real_estate_advisory" boolean DEFAULT false,
	"service_ap_lite" boolean DEFAULT false,
	"service_ar_lite" boolean DEFAULT false,
	"service_ap_advanced" boolean DEFAULT false,
	"service_ar_advanced" boolean DEFAULT false,
	"client_street_address" text,
	"client_city" text,
	"client_state" text,
	"client_zip_code" text,
	"client_country" text DEFAULT 'US',
	"company_name_locked" boolean DEFAULT true,
	"contact_first_name" text,
	"contact_first_name_locked" boolean DEFAULT true,
	"contact_last_name" text,
	"contact_last_name_locked" boolean DEFAULT true,
	"industry_locked" boolean DEFAULT true,
	"company_address_locked" boolean DEFAULT true,
	"owner_id" integer NOT NULL,
	"hubspot_contact_id" text,
	"hubspot_deal_id" text,
	"hubspot_quote_id" text,
	"hubspot_contact_verified" boolean DEFAULT false,
	"company_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_reps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"total_clients_closed_monthly" integer DEFAULT 0 NOT NULL,
	"total_clients_closed_all_time" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"first_name" text,
	"last_name" text,
	"hubspot_user_id" text,
	"firebase_uid" text,
	"google_id" text,
	"auth_provider" text DEFAULT 'local',
	"role" text DEFAULT 'employee',
	"default_dashboard" text DEFAULT 'sales',
	"role_assigned_by" integer,
	"role_assigned_at" timestamp,
	"auth_user_id" text,
	"last_login_at" timestamp,
	"profile_photo" text,
	"phone_number" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"country" text DEFAULT 'US',
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"last_weather_update" timestamp,
	"last_hubspot_sync" timestamp,
	"hubspot_sync_enabled" boolean DEFAULT true,
	"is_impersonating" boolean DEFAULT false,
	"original_admin_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"full_name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"org_unit_path" text DEFAULT '/',
	"last_login_time" timestamp,
	"creation_time" timestamp,
	"thumbnail_photo_url" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"sync_source" text DEFAULT 'google_admin_api' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "workspace_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "calculator_service_content" ADD CONSTRAINT "calculator_service_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_client_profile_id_client_intel_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_intel_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_profile_id_client_intel_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_intel_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_adjustments" ADD CONSTRAINT "commission_adjustments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_hubspot_invoice_id_hubspot_invoices_id_fk" FOREIGN KEY ("hubspot_invoice_id") REFERENCES "public"."hubspot_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_hubspot_subscription_id_hubspot_subscriptions_id_fk" FOREIGN KEY ("hubspot_subscription_id") REFERENCES "public"."hubspot_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_monthly_bonus_id_monthly_bonuses_id_fk" FOREIGN KEY ("monthly_bonus_id") REFERENCES "public"."monthly_bonuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_milestone_bonus_id_milestone_bonuses_id_fk" FOREIGN KEY ("milestone_bonus_id") REFERENCES "public"."milestone_bonuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sales_rep_id_sales_reps_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubspot_invoice_line_items" ADD CONSTRAINT "hubspot_invoice_line_items_invoice_id_hubspot_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."hubspot_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubspot_invoices" ADD CONSTRAINT "hubspot_invoices_sales_rep_id_sales_reps_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hubspot_subscriptions" ADD CONSTRAINT "hubspot_subscriptions_sales_rep_id_sales_reps_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_article_versions" ADD CONSTRAINT "kb_article_versions_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."kb_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_article_versions" ADD CONSTRAINT "kb_article_versions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_category_id_kb_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."kb_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_bookmarks" ADD CONSTRAINT "kb_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_bookmarks" ADD CONSTRAINT "kb_bookmarks_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."kb_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_search_history" ADD CONSTRAINT "kb_search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_search_history" ADD CONSTRAINT "kb_search_history_clicked_article_id_kb_articles_id_fk" FOREIGN KEY ("clicked_article_id") REFERENCES "public"."kb_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_bonuses" ADD CONSTRAINT "milestone_bonuses_sales_rep_id_sales_reps_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_bonuses" ADD CONSTRAINT "monthly_bonuses_sales_rep_id_sales_reps_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."sales_reps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_history" ADD CONSTRAINT "pricing_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reps" ADD CONSTRAINT "sales_reps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_assigned_by_users_id_fk" FOREIGN KEY ("role_assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;