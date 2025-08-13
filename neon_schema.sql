--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approval_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_codes (
    id integer NOT NULL,
    code text NOT NULL,
    contact_email text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: approval_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_codes_id_seq OWNED BY public.approval_codes.id;


--
-- Name: box_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.box_folders (
    id integer NOT NULL,
    box_folder_id text NOT NULL,
    folder_name text NOT NULL,
    parent_folder_id text,
    contact_email text,
    company_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: box_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.box_folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: box_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.box_folders_id_seq OWNED BY public.box_folders.id;


--
-- Name: client_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_activities (
    id integer NOT NULL,
    contact_id text NOT NULL,
    activity_type text NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: client_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.client_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: client_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.client_activities_id_seq OWNED BY public.client_activities.id;


--
-- Name: commission_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_adjustments (
    id integer NOT NULL,
    commission_id integer,
    original_amount numeric NOT NULL,
    requested_amount numeric NOT NULL,
    final_amount numeric,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    requested_by integer,
    approved_by integer,
    type text DEFAULT 'request'::text,
    requested_date timestamp without time zone DEFAULT now(),
    reviewed_date timestamp without time zone,
    CONSTRAINT commission_adjustments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: commission_adjustments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commission_adjustments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commission_adjustments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commission_adjustments_id_seq OWNED BY public.commission_adjustments.id;


--
-- Name: commissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commissions (
    id integer NOT NULL,
    deal_id integer,
    sales_rep_id integer,
    commission_type text,
    rate numeric(5,4),
    base_amount numeric(10,2),
    commission_amount numeric(10,2),
    month_number integer,
    is_paid boolean DEFAULT false,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    hubspot_invoice_id integer,
    hubspot_subscription_id integer,
    type text,
    amount numeric(10,2),
    status text DEFAULT 'pending'::text,
    service_type text,
    date_earned timestamp without time zone,
    date_paid timestamp without time zone,
    payment_method text,
    notes text,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.commissions_id_seq OWNED BY public.commissions.id;


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id integer NOT NULL,
    hubspot_deal_id text NOT NULL,
    deal_name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    monthly_value numeric(10,2),
    setup_fee numeric(10,2),
    close_date timestamp without time zone,
    deal_stage text NOT NULL,
    deal_owner text NOT NULL,
    sales_rep_id integer,
    company_name text,
    service_type text,
    is_collected boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: deals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.deals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.deals_id_seq OWNED BY public.deals.id;


--
-- Name: document_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_templates (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    template_content text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: document_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_templates_id_seq OWNED BY public.document_templates.id;


--
-- Name: hubspot_debug; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hubspot_debug (
    invoice_id text NOT NULL,
    properties_json text,
    associations_json text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: hubspot_invoice_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hubspot_invoice_line_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    hubspot_line_item_id text,
    name text NOT NULL,
    description text,
    quantity numeric(10,2) DEFAULT 1,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    service_type text,
    is_recurring boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: hubspot_invoice_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hubspot_invoice_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hubspot_invoice_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hubspot_invoice_line_items_id_seq OWNED BY public.hubspot_invoice_line_items.id;


--
-- Name: hubspot_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hubspot_invoices (
    id integer NOT NULL,
    hubspot_invoice_id text NOT NULL,
    hubspot_deal_id text,
    hubspot_contact_id text,
    sales_rep_id integer,
    invoice_number text,
    status text NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    paid_amount numeric(10,2) DEFAULT 0,
    invoice_date timestamp without time zone NOT NULL,
    due_date timestamp without time zone,
    paid_date timestamp without time zone,
    company_name text,
    is_processed_for_commission boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: hubspot_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hubspot_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hubspot_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hubspot_invoices_id_seq OWNED BY public.hubspot_invoices.id;


--
-- Name: hubspot_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hubspot_subscriptions (
    id integer NOT NULL,
    hubspot_subscription_id text NOT NULL,
    hubspot_contact_id text,
    hubspot_deal_id text,
    sales_rep_id integer,
    status text NOT NULL,
    monthly_amount numeric(10,2) NOT NULL,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    last_invoice_date timestamp without time zone,
    next_invoice_date timestamp without time zone,
    company_name text,
    service_description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: hubspot_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.hubspot_subscriptions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: hubspot_subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.hubspot_subscriptions_id_seq OWNED BY public.hubspot_subscriptions.id;


--
-- Name: kb_article_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_article_versions (
    id integer NOT NULL,
    article_id integer NOT NULL,
    version integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    author_id integer NOT NULL,
    change_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_article_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_article_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_article_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_article_versions_id_seq OWNED BY public.kb_article_versions.id;


--
-- Name: kb_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_articles (
    id integer NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text NOT NULL,
    category_id integer NOT NULL,
    author_id integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    featured boolean DEFAULT false,
    tags text[],
    view_count integer DEFAULT 0,
    search_vector text,
    ai_summary text,
    last_reviewed_at timestamp without time zone,
    last_reviewed_by integer,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_articles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_articles_id_seq OWNED BY public.kb_articles.id;


--
-- Name: kb_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_bookmarks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    article_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_bookmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_bookmarks_id_seq OWNED BY public.kb_bookmarks.id;


--
-- Name: kb_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_categories (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text DEFAULT 'folder'::text,
    color text DEFAULT 'blue'::text,
    parent_id integer,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_categories_id_seq OWNED BY public.kb_categories.id;


--
-- Name: kb_search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_search_history (
    id integer NOT NULL,
    user_id integer,
    query text NOT NULL,
    results_count integer DEFAULT 0,
    clicked_article_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_search_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kb_search_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kb_search_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kb_search_history_id_seq OWNED BY public.kb_search_history.id;


--
-- Name: milestone_bonuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_bonuses (
    id integer NOT NULL,
    sales_rep_id integer NOT NULL,
    milestone_type text NOT NULL,
    total_clients integer NOT NULL,
    bonus_amount numeric(10,2) NOT NULL,
    bonus_description text,
    achieved_at timestamp without time zone DEFAULT now() NOT NULL,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp without time zone
);


--
-- Name: milestone_bonuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.milestone_bonuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: milestone_bonuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.milestone_bonuses_id_seq OWNED BY public.milestone_bonuses.id;


--
-- Name: monthly_bonuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_bonuses (
    id integer NOT NULL,
    sales_rep_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    clients_closed integer NOT NULL,
    bonus_level text,
    bonus_amount numeric(10,2),
    bonus_description text,
    is_paid boolean DEFAULT false NOT NULL,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: monthly_bonuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.monthly_bonuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monthly_bonuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.monthly_bonuses_id_seq OWNED BY public.monthly_bonuses.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    contact_email text NOT NULL,
    monthly_transactions text NOT NULL,
    industry text NOT NULL,
    cleanup_months integer NOT NULL,
    cleanup_complexity numeric(3,2) NOT NULL,
    monthly_fee numeric(10,2) NOT NULL,
    setup_fee numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    cleanup_override boolean DEFAULT false NOT NULL,
    override_reason text,
    approval_required boolean DEFAULT false NOT NULL,
    hubspot_contact_id text,
    hubspot_deal_id text,
    hubspot_quote_id text,
    hubspot_contact_verified boolean DEFAULT false,
    company_name text,
    owner_id integer NOT NULL,
    quote_type text DEFAULT 'bookkeeping'::text NOT NULL,
    entity_type text,
    num_entities integer,
    states_filed integer,
    international_filing boolean,
    num_business_owners integer,
    bookkeeping_quality text,
    include_1040s boolean,
    prior_years_unfiled integer,
    already_on_seed_bookkeeping boolean,
    taas_monthly_fee numeric(10,2) DEFAULT 0 NOT NULL,
    taas_prior_years_fee numeric(10,2) DEFAULT 0 NOT NULL,
    includes_bookkeeping boolean DEFAULT true NOT NULL,
    includes_taas boolean DEFAULT false NOT NULL,
    custom_num_entities integer,
    custom_states_filed integer,
    custom_num_business_owners integer,
    qbo_subscription boolean DEFAULT false,
    contact_first_name text,
    contact_first_name_locked boolean DEFAULT true,
    contact_last_name text,
    contact_last_name_locked boolean DEFAULT true,
    industry_locked boolean DEFAULT true,
    company_address_locked boolean DEFAULT true,
    monthly_revenue_range text,
    service_bookkeeping boolean DEFAULT false,
    service_taas boolean DEFAULT false,
    service_payroll boolean DEFAULT false,
    service_ap_ar_lite boolean DEFAULT false,
    service_fpa_lite boolean DEFAULT false,
    client_street_address text,
    client_city text,
    client_state text,
    client_zip_code text,
    client_country text DEFAULT 'US'::text,
    company_name_locked boolean DEFAULT true,
    accounting_basis text,
    business_loans boolean
);


--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: sales_reps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_reps (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    hubspot_user_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer
);


--
-- Name: sales_reps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_reps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_reps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_reps_id_seq OWNED BY public.sales_reps.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    password text NOT NULL,
    first_name text,
    last_name text,
    hubspot_user_id text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    profile_photo text,
    phone_number text,
    address text,
    city text,
    state text,
    zip_code text,
    country text DEFAULT 'US'::text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    last_weather_update timestamp without time zone,
    last_hubspot_sync timestamp without time zone,
    hubspot_sync_enabled boolean DEFAULT true,
    google_id character varying(255),
    firebase_uid text,
    auth_provider text DEFAULT 'local'::text,
    role text DEFAULT 'user'::text,
    role_assigned_by integer,
    role_assigned_at timestamp without time zone,
    default_dashboard text DEFAULT 'sales'::text,
    is_impersonating boolean DEFAULT false,
    original_admin_id integer
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workspace_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_users (
    id integer NOT NULL,
    google_id text NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    full_name text,
    is_admin boolean DEFAULT false NOT NULL,
    suspended boolean DEFAULT false NOT NULL,
    org_unit_path text DEFAULT '/'::text,
    last_login_time timestamp without time zone,
    creation_time timestamp without time zone,
    thumbnail_photo_url text,
    last_synced_at timestamp without time zone DEFAULT now() NOT NULL,
    sync_source text DEFAULT 'google_admin_api'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workspace_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workspace_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workspace_users_id_seq OWNED BY public.workspace_users.id;


--
-- Name: approval_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_codes ALTER COLUMN id SET DEFAULT nextval('public.approval_codes_id_seq'::regclass);


--
-- Name: box_folders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.box_folders ALTER COLUMN id SET DEFAULT nextval('public.box_folders_id_seq'::regclass);


--
-- Name: client_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_activities ALTER COLUMN id SET DEFAULT nextval('public.client_activities_id_seq'::regclass);


--
-- Name: commission_adjustments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_adjustments ALTER COLUMN id SET DEFAULT nextval('public.commission_adjustments_id_seq'::regclass);


--
-- Name: commissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions ALTER COLUMN id SET DEFAULT nextval('public.commissions_id_seq'::regclass);


--
-- Name: deals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals ALTER COLUMN id SET DEFAULT nextval('public.deals_id_seq'::regclass);


--
-- Name: document_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates ALTER COLUMN id SET DEFAULT nextval('public.document_templates_id_seq'::regclass);


--
-- Name: hubspot_invoice_line_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoice_line_items ALTER COLUMN id SET DEFAULT nextval('public.hubspot_invoice_line_items_id_seq'::regclass);


--
-- Name: hubspot_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoices ALTER COLUMN id SET DEFAULT nextval('public.hubspot_invoices_id_seq'::regclass);


--
-- Name: hubspot_subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_subscriptions ALTER COLUMN id SET DEFAULT nextval('public.hubspot_subscriptions_id_seq'::regclass);


--
-- Name: kb_article_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_article_versions ALTER COLUMN id SET DEFAULT nextval('public.kb_article_versions_id_seq'::regclass);


--
-- Name: kb_articles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles ALTER COLUMN id SET DEFAULT nextval('public.kb_articles_id_seq'::regclass);


--
-- Name: kb_bookmarks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_bookmarks ALTER COLUMN id SET DEFAULT nextval('public.kb_bookmarks_id_seq'::regclass);


--
-- Name: kb_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories ALTER COLUMN id SET DEFAULT nextval('public.kb_categories_id_seq'::regclass);


--
-- Name: kb_search_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_history ALTER COLUMN id SET DEFAULT nextval('public.kb_search_history_id_seq'::regclass);


--
-- Name: milestone_bonuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_bonuses ALTER COLUMN id SET DEFAULT nextval('public.milestone_bonuses_id_seq'::regclass);


--
-- Name: monthly_bonuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bonuses ALTER COLUMN id SET DEFAULT nextval('public.monthly_bonuses_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: sales_reps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reps ALTER COLUMN id SET DEFAULT nextval('public.sales_reps_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: workspace_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users ALTER COLUMN id SET DEFAULT nextval('public.workspace_users_id_seq'::regclass);


--
-- Name: approval_codes approval_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_codes
    ADD CONSTRAINT approval_codes_pkey PRIMARY KEY (id);


--
-- Name: box_folders box_folders_box_folder_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.box_folders
    ADD CONSTRAINT box_folders_box_folder_id_key UNIQUE (box_folder_id);


--
-- Name: box_folders box_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.box_folders
    ADD CONSTRAINT box_folders_pkey PRIMARY KEY (id);


--
-- Name: client_activities client_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_activities
    ADD CONSTRAINT client_activities_pkey PRIMARY KEY (id);


--
-- Name: commission_adjustments commission_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_adjustments
    ADD CONSTRAINT commission_adjustments_pkey PRIMARY KEY (id);


--
-- Name: commissions commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_pkey PRIMARY KEY (id);


--
-- Name: deals deals_hubspot_deal_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_hubspot_deal_id_key UNIQUE (hubspot_deal_id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: document_templates document_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_templates
    ADD CONSTRAINT document_templates_pkey PRIMARY KEY (id);


--
-- Name: hubspot_debug hubspot_debug_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_debug
    ADD CONSTRAINT hubspot_debug_pkey PRIMARY KEY (invoice_id);


--
-- Name: hubspot_invoice_line_items hubspot_invoice_line_items_hubspot_line_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoice_line_items
    ADD CONSTRAINT hubspot_invoice_line_items_hubspot_line_item_id_key UNIQUE (hubspot_line_item_id);


--
-- Name: hubspot_invoice_line_items hubspot_invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoice_line_items
    ADD CONSTRAINT hubspot_invoice_line_items_pkey PRIMARY KEY (id);


--
-- Name: hubspot_invoices hubspot_invoices_hubspot_invoice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoices
    ADD CONSTRAINT hubspot_invoices_hubspot_invoice_id_key UNIQUE (hubspot_invoice_id);


--
-- Name: hubspot_invoices hubspot_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoices
    ADD CONSTRAINT hubspot_invoices_pkey PRIMARY KEY (id);


--
-- Name: hubspot_subscriptions hubspot_subscriptions_hubspot_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_subscriptions
    ADD CONSTRAINT hubspot_subscriptions_hubspot_subscription_id_key UNIQUE (hubspot_subscription_id);


--
-- Name: hubspot_subscriptions hubspot_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_subscriptions
    ADD CONSTRAINT hubspot_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: kb_article_versions kb_article_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_article_versions
    ADD CONSTRAINT kb_article_versions_pkey PRIMARY KEY (id);


--
-- Name: kb_articles kb_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_pkey PRIMARY KEY (id);


--
-- Name: kb_articles kb_articles_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_slug_key UNIQUE (slug);


--
-- Name: kb_bookmarks kb_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_bookmarks
    ADD CONSTRAINT kb_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: kb_bookmarks kb_bookmarks_user_id_article_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_bookmarks
    ADD CONSTRAINT kb_bookmarks_user_id_article_id_key UNIQUE (user_id, article_id);


--
-- Name: kb_categories kb_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT kb_categories_pkey PRIMARY KEY (id);


--
-- Name: kb_categories kb_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT kb_categories_slug_key UNIQUE (slug);


--
-- Name: kb_search_history kb_search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_history
    ADD CONSTRAINT kb_search_history_pkey PRIMARY KEY (id);


--
-- Name: milestone_bonuses milestone_bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_bonuses
    ADD CONSTRAINT milestone_bonuses_pkey PRIMARY KEY (id);


--
-- Name: monthly_bonuses monthly_bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bonuses
    ADD CONSTRAINT monthly_bonuses_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: sales_reps sales_reps_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reps
    ADD CONSTRAINT sales_reps_email_key UNIQUE (email);


--
-- Name: sales_reps sales_reps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reps
    ADD CONSTRAINT sales_reps_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_firebase_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firebase_uid_key UNIQUE (firebase_uid);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workspace_users workspace_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_email_key UNIQUE (email);


--
-- Name: workspace_users workspace_users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_google_id_key UNIQUE (google_id);


--
-- Name: workspace_users workspace_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_pkey PRIMARY KEY (id);


--
-- Name: idx_quotes_contact_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_contact_email ON public.quotes USING btree (contact_email);


--
-- Name: idx_quotes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_created_at ON public.quotes USING btree (created_at DESC);


--
-- Name: idx_quotes_owner_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_owner_archived ON public.quotes USING btree (owner_id, archived);


--
-- Name: idx_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_expire ON public.session USING btree (expire);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: commission_adjustments commission_adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_adjustments
    ADD CONSTRAINT commission_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: commission_adjustments commission_adjustments_commission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_adjustments
    ADD CONSTRAINT commission_adjustments_commission_id_fkey FOREIGN KEY (commission_id) REFERENCES public.commissions(id);


--
-- Name: commission_adjustments commission_adjustments_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_adjustments
    ADD CONSTRAINT commission_adjustments_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: commissions commissions_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(id);


--
-- Name: commissions commissions_hubspot_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_hubspot_invoice_id_fkey FOREIGN KEY (hubspot_invoice_id) REFERENCES public.hubspot_invoices(id);


--
-- Name: commissions commissions_hubspot_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_hubspot_subscription_id_fkey FOREIGN KEY (hubspot_subscription_id) REFERENCES public.hubspot_subscriptions(id);


--
-- Name: commissions commissions_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions
    ADD CONSTRAINT commissions_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);


--
-- Name: deals deals_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.sales_reps(id);


--
-- Name: hubspot_invoice_line_items hubspot_invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoice_line_items
    ADD CONSTRAINT hubspot_invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.hubspot_invoices(id);


--
-- Name: hubspot_invoices hubspot_invoices_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_invoices
    ADD CONSTRAINT hubspot_invoices_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);


--
-- Name: hubspot_subscriptions hubspot_subscriptions_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hubspot_subscriptions
    ADD CONSTRAINT hubspot_subscriptions_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.sales_reps(id);


--
-- Name: kb_article_versions kb_article_versions_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_article_versions
    ADD CONSTRAINT kb_article_versions_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.kb_articles(id);


--
-- Name: kb_article_versions kb_article_versions_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_article_versions
    ADD CONSTRAINT kb_article_versions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: kb_articles kb_articles_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: kb_articles kb_articles_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.kb_categories(id);


--
-- Name: kb_articles kb_articles_last_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_articles
    ADD CONSTRAINT kb_articles_last_reviewed_by_fkey FOREIGN KEY (last_reviewed_by) REFERENCES public.users(id);


--
-- Name: kb_bookmarks kb_bookmarks_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_bookmarks
    ADD CONSTRAINT kb_bookmarks_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.kb_articles(id);


--
-- Name: kb_bookmarks kb_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_bookmarks
    ADD CONSTRAINT kb_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: kb_categories kb_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_categories
    ADD CONSTRAINT kb_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.kb_categories(id);


--
-- Name: kb_search_history kb_search_history_clicked_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_history
    ADD CONSTRAINT kb_search_history_clicked_article_id_fkey FOREIGN KEY (clicked_article_id) REFERENCES public.kb_articles(id);


--
-- Name: kb_search_history kb_search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_search_history
    ADD CONSTRAINT kb_search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: milestone_bonuses milestone_bonuses_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_bonuses
    ADD CONSTRAINT milestone_bonuses_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.sales_reps(id);


--
-- Name: monthly_bonuses monthly_bonuses_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_bonuses
    ADD CONSTRAINT monthly_bonuses_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.sales_reps(id);


--
-- Name: sales_reps sales_reps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reps
    ADD CONSTRAINT sales_reps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_role_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_assigned_by_fkey FOREIGN KEY (role_assigned_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

