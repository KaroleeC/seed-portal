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
-- Data for Name: approval_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approval_codes (id, code, contact_email, used, created_at, expires_at) FROM stdin;
14	9043	info@wagsworthhotel.com	f	2025-07-22 06:12:31.655327	2025-07-22 07:12:31.603
15	7018	info@wagsworthhotel.com	t	2025-07-22 06:15:59.93411	2025-07-22 07:15:59.881
16	4419	jonwalls.ins@gmail.com	t	2025-07-24 22:01:02.575507	2025-07-24 23:01:02.52
17	4018	jonwalls.ins@gmail.com	t	2025-07-24 22:13:34.641106	2025-07-24 23:13:34.588
18	1310	jonwalls.ins@gmail.com	t	2025-07-24 22:24:45.440632	2025-07-24 23:24:45.387
19	1065	jonwalls.ins@gmail.com	t	2025-07-24 22:31:14.378036	2025-07-24 23:31:14.324
20	8083	jonwalls.ins@gmail.com	t	2025-07-24 22:41:30.98581	2025-07-24 23:41:30.931
21	4924	jonwalls.ins@gmail.com	t	2025-07-24 22:48:53.573594	2025-07-24 23:48:53.521
22	1845	jonwalls.ins@gmail.com	t	2025-07-25 04:14:07.56314	2025-07-25 05:14:07.509
23	7721	jonwalls.ins@gmail.com	t	2025-07-25 04:19:51.006813	2025-07-25 05:19:50.954
24	7740	jonwalls.ins@gmail.com	t	2025-07-25 04:24:09.127291	2025-07-25 05:24:09.074
25	8409	jonwalls.ins@gmail.com	t	2025-07-25 04:39:03.068309	2025-07-25 05:39:03.015
26	6857	jonwalls.ins@gmail.com	t	2025-07-25 18:52:20.82732	2025-07-25 19:52:20.768
27	1505	jonwalls.ins@gmail.com	t	2025-07-28 17:37:19.846474	2025-07-28 18:37:19.793
28	2646	rickmyersfarrierservice@gmail.com	t	2025-07-30 21:13:44.949416	2025-07-30 22:13:44.892
29	9019	rickmyersfarrierservice@gmail.com	t	2025-07-30 21:20:44.379828	2025-07-30 22:20:44.321
30	1875	rickmyersfarrierservice@gmail.com	t	2025-07-30 21:28:49.429263	2025-07-30 22:28:49.371
\.


--
-- Data for Name: box_folders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.box_folders (id, box_folder_id, folder_name, parent_folder_id, contact_email, company_name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: client_activities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_activities (id, contact_id, activity_type, description, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: commission_adjustments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.commission_adjustments (id, commission_id, original_amount, requested_amount, final_amount, reason, status, notes, created_at, updated_at, requested_by, approved_by, type, requested_date, reviewed_date) FROM stdin;
\.


--
-- Data for Name: commissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.commissions (id, deal_id, sales_rep_id, commission_type, rate, base_amount, commission_amount, month_number, is_paid, paid_at, created_at, hubspot_invoice_id, hubspot_subscription_id, type, amount, status, service_type, date_earned, date_paid, payment_method, notes, updated_at) FROM stdin;
106	\N	3	\N	\N	\N	\N	1	f	\N	2025-08-12 06:05:32.544407	33	\N	month_1	0.00	rejected	recurring	2025-07-21 00:00:00	\N	\N	\N	2025-08-13 04:12:49.214911
107	\N	5	\N	\N	\N	\N	1	f	\N	2025-08-12 06:05:33.692149	34	\N	setup	80.00	approved	setup	2025-08-04 00:00:00	\N	\N	\N	2025-08-13 04:17:00.645236
108	\N	5	\N	\N	\N	\N	1	f	\N	2025-08-12 06:05:33.797443	34	\N	month_1	39.60	approved	recurring	2025-08-04 00:00:00	\N	\N	\N	2025-08-13 04:17:00.645236
109	\N	3	\N	\N	\N	\N	1	f	\N	2025-08-12 06:07:15.611305	32	\N	setup	0.00	rejected	setup	2025-07-18 00:00:00	\N	\N	\N	2025-08-13 04:08:06.158013
110	\N	3	\N	\N	\N	\N	1	f	\N	2025-08-12 06:07:15.611305	32	\N	month_1	0.00	rejected	recurring	2025-07-18 00:00:00	\N	\N	\N	2025-08-13 04:08:06.158013
\.


--
-- Data for Name: deals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.deals (id, hubspot_deal_id, deal_name, amount, monthly_value, setup_fee, close_date, deal_stage, deal_owner, sales_rep_id, company_name, service_type, is_collected, created_at, updated_at) FROM stdin;
21	101	Tech Startup Solutions	15000.00	1250.00	3000.00	2025-09-15 00:00:00	qualifiedtobuy	Jon Walls	8	InnovateTech LLC	bookkeeping + payroll	f	2025-08-12 07:53:40.025767	2025-08-12 07:53:40.025767
22	102	Construction Company Package	8000.00	800.00	1600.00	2025-08-25 00:00:00	decisionmakerboughtin	Amanda Cooper	10	BuildRight Construction	bookkeeping	f	2025-08-12 07:53:40.025767	2025-08-12 07:53:40.025767
23	103	Medical Practice Setup	12000.00	1000.00	2400.00	2025-09-30 00:00:00	presentationscheduled	Randall Hall	9	HealthFirst Medical	bookkeeping + taas	f	2025-08-12 07:53:40.025767	2025-08-12 07:53:40.025767
24	104	Law Firm Compliance	18000.00	1500.00	3600.00	2025-10-10 00:00:00	qualifiedtobuy	Jon Walls	8	Legal Partners Group	bookkeeping + payroll + taas	f	2025-08-12 07:53:40.025767	2025-08-12 07:53:40.025767
25	105	Restaurant Chain Expansion	6000.00	600.00	1200.00	2025-08-20 00:00:00	contractsent	Amanda Cooper	10	FoodCorp Restaurants	bookkeeping	f	2025-08-12 07:53:40.025767	2025-08-12 07:53:40.025767
26	106	E-commerce Growth	10000.00	900.00	2000.00	2025-09-05 00:00:00	decisionmakerboughtin	Randall Hall	9	OnlineRetail Pro	bookkeeping + payroll	f	2025-08-12 07:53:40.025767	2025-08-12 07:53:40.025767
\.


--
-- Data for Name: document_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_templates (id, name, type, template_content, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: hubspot_debug; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hubspot_debug (invoice_id, properties_json, associations_json, created_at) FROM stdin;
445245437317	{"hs_createdate":"2025-07-18T18:06:34.921Z","hs_invoice_status":"paid","hs_lastmodifieddate":"2025-07-18T18:07:49.648Z","hs_object_id":"445245437317"}	{"companies":{"results":[{"id":"35499150455","type":"invoice_to_company"}]},"deals":{"results":[{"id":"40445891623","type":"invoice_to_deal"}]},"line items":{"results":[{"id":"35982731606","type":"invoice_to_line_item"},{"id":"35982731607","type":"invoice_to_line_item"}]},"contacts":{"results":[{"id":"133123998480","type":"invoice_to_contact"}]}}	2025-08-12 06:06:27.564915
445842427800	{"hs_createdate":"2025-07-21T21:03:15.040Z","hs_invoice_status":"paid","hs_lastmodifieddate":"2025-07-21T21:03:51.025Z","hs_object_id":"445842427800"}	{"companies":{"results":[{"id":"36417247305","type":"invoice_to_company"}]},"deals":{"results":[{"id":"40445889635","type":"invoice_to_deal"}]},"line items":{"results":[{"id":"36142917029","type":"invoice_to_line_item"},{"id":"36142917030","type":"invoice_to_line_item"},{"id":"36142917031","type":"invoice_to_line_item"}]},"contacts":{"results":[{"id":"139243508082","type":"invoice_to_contact"}]}}	2025-08-12 06:06:28.112186
449606788189	{"hs_createdate":"2025-08-04T23:01:26.139Z","hs_invoice_status":"paid","hs_lastmodifieddate":"2025-08-04T23:02:32.644Z","hs_object_id":"449606788189"}	{"companies":{"results":[{"id":"36772350564","type":"invoice_to_company"}]},"deals":{"results":[{"id":"41109025157","type":"invoice_to_deal"}]},"line items":{"results":[{"id":"36863730499","type":"invoice_to_line_item"},{"id":"36863730500","type":"invoice_to_line_item"}]},"contacts":{"results":[{"id":"141326646879","type":"invoice_to_contact"}]}}	2025-08-12 06:06:28.53588
\.


--
-- Data for Name: hubspot_invoice_line_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hubspot_invoice_line_items (id, invoice_id, hubspot_line_item_id, name, description, quantity, unit_price, total_price, service_type, is_recurring, created_at) FROM stdin;
68	32	35982731606	Clean-Up / Catch-Up Project		1.00	800.00	800.00	setup	f	2025-08-12 06:04:21.61796
69	32	35982731607	Monthly Bookkeeping (Custom)		1.00	150.00	150.00	recurring	t	2025-08-12 06:04:21.725906
70	33	36142917029	Monthly Bookkeeping (Custom)		1.00	150.00	150.00	recurring	t	2025-08-12 06:05:32.22723
71	33	36142917030	Tax as a Service (Monthly)		1.00	275.00	275.00	recurring	t	2025-08-12 06:05:32.332123
72	33	36142917031	Managed QBO Subscription		1.00	60.00	60.00	setup	f	2025-08-12 06:05:32.43891
73	34	36863730499	Monthly Bookkeeping (Custom)		1.00	99.00	99.00	recurring	t	2025-08-12 06:05:33.481266
74	34	36863730500	Clean-Up / Catch-Up Project		1.00	400.00	400.00	setup	f	2025-08-12 06:05:33.586096
\.


--
-- Data for Name: hubspot_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hubspot_invoices (id, hubspot_invoice_id, hubspot_deal_id, hubspot_contact_id, sales_rep_id, invoice_number, status, total_amount, paid_amount, invoice_date, due_date, paid_date, company_name, is_processed_for_commission, created_at, updated_at) FROM stdin;
33	445842427800	\N	\N	3	INV-445842427800	paid	485.00	485.00	2025-07-21 00:00:00	\N	2025-07-21 00:00:00	Power 3 Financial	f	2025-08-12 06:05:32.116159	2025-08-12 06:05:32.116159
34	449606788189	\N	\N	5	INV-449606788189	paid	499.00	499.00	2025-08-04 00:00:00	\N	2025-08-04 00:00:00	Psychiatric Institute	f	2025-08-12 06:05:33.376251	2025-08-12 06:05:33.376251
32	445245437317	\N	\N	3	INV-445245437317	paid	950.00	950.00	2025-07-18 00:00:00	\N	2025-07-18 00:00:00	Louisiana Senior Advisors	f	2025-08-12 06:04:21.512705	2025-08-12 06:04:21.512705
\.


--
-- Data for Name: hubspot_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hubspot_subscriptions (id, hubspot_subscription_id, hubspot_contact_id, hubspot_deal_id, sales_rep_id, status, monthly_amount, start_date, end_date, last_invoice_date, next_invoice_date, company_name, service_description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: kb_article_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kb_article_versions (id, article_id, version, title, content, author_id, change_note, created_at) FROM stdin;
\.


--
-- Data for Name: kb_articles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kb_articles (id, title, slug, excerpt, content, category_id, author_id, status, featured, tags, view_count, search_vector, ai_summary, last_reviewed_at, last_reviewed_by, published_at, created_at, updated_at) FROM stdin;
17	Common Objections + Killer Rebuttals	common-objections-killer-rebuttals	Transform sales objections into opportunities with proven scripts and the CLARA method. Turn 90% of rejections into closed deals.	<h1>Master Client Objections: Your Complete Rebuttal Playbook</h1>\n<p><strong>Internal Sales &amp; Service Guide</strong></p>\n<p><em>Last Reviewed: December 2024 | Approval Required: Sales Director, Compliance Officer</em></p>\n<h2>The Truth About Objections</h2>\n<p>Here's what separates top performers from the rest: <strong>objections aren't rejection&mdash;they're engagement</strong>. When prospects push back, they're telling you they're interested enough to negotiate. People don't object to things they've already dismissed.</p>\n<p>The psychology is simple: change feels risky, even when it's beneficial. Your prospects aren't questioning your value&mdash;they're protecting themselves from potential regret. This mindset shift changes everything about how you handle resistance.</p>\n<p>Consider this reality check: <strong>90% of sales happen after the fifth "no,"</strong> yet most salespeople give up after the first objection. That's leaving serious money on the table.</p>\n<h3>Your Biggest Challenge</h3>\n<p>Picture this scenario: You're deep in conversation with a promising prospect. They're engaged, asking good questions, nodding along. Then it hits:</p>\n<p><em>"Your prices seem really high compared to our current accountant."</em></p>\n<p>Your confidence wavers. You consider discounting or&mdash;worse&mdash;agreeing with them. Sound familiar?</p>\n<p>These pressure points hit us all:</p>\n<ul>\n<li><strong>Price objections</strong> that trigger immediate discount reflex</li>\n<li><strong>"We're happy" responses</strong> that feel like conversation killers</li>\n<li><strong>"We need to think about it"</strong> disguised rejections</li>\n<li><strong>Budget excuses</strong> that make you question your worth</li>\n</ul>\n<p>Remember: <strong>confidence matters more than perfect answers</strong>. Prospects sense when you believe in what you're selling. Hesitation breeds hesitation. Confidence creates confidence.</p>\n<h3>The Seed Financial Advantage</h3>\n<p>We're not just another accounting firm&mdash;that's your secret weapon. When objections arise, lean into our differentiators:</p>\n<ul>\n<li><strong>Technology-forward approach</strong> that saves time and money</li>\n<li><strong>Proactive advisory services</strong> versus reactive number-crunching</li>\n<li><strong>Transparent pricing</strong> with clear value propositions</li>\n<li><strong>Personal attention</strong> without big-firm bureaucracy</li>\n</ul>\n<p>Every objection becomes a chance to highlight these advantages.</p>\n<h2>Your Objection-Handling Framework</h2>\n<h3>Primary Goals</h3>\n<p>Your mission with every objection:</p>\n<ul>\n<li><strong>Transform resistance into curiosity</strong>&mdash;Turn "no" into "tell me more"</li>\n<li><strong>Build unshakeable confidence</strong>&mdash;Own your value proposition completely</li>\n<li><strong>Maintain relationship integrity</strong>&mdash;Never win arguments but lose clients</li>\n</ul>\n<h3>Success Indicators</h3>\n<p>You're mastering objection handling when:</p>\n<ul>\n<li><strong>Conversion rates climb above 35%</strong> after initial objections</li>\n<li><strong>Sales cycles shorten</strong> because concerns get addressed upfront</li>\n<li><strong>Client satisfaction scores stay high</strong> throughout the process</li>\n<li><strong>Objection frequency drops</strong> as prevention skills improve</li>\n</ul>\n<h3>Essential Mindset Shifts</h3>\n<p>Make these mental pivots:</p>\n<ul>\n<li><strong>From defensive to curious</strong>&mdash;"Why are they saying this?"</li>\n<li><strong>From selling to consulting</strong>&mdash;"How can I help them see clearly?"</li>\n<li><strong>From talking to listening</strong>&mdash;"What's the real concern here?"</li>\n</ul>\n<p>You're not overcoming objections&mdash;you're understanding and addressing legitimate concerns.</p>\n<h2>The CLARA Method</h2>\n<p>Use this proven framework for every objection:</p>\n<ul>\n<li><strong>C</strong>larify the real concern ("Help me understand what you mean by 'expensive'")</li>\n<li><strong>L</strong>isten without interrupting (resist the urge to jump in)</li>\n<li><strong>A</strong>cknowledge their perspective ("I can see why that would be concerning")</li>\n<li><strong>R</strong>espond with evidence (facts, not opinions)</li>\n<li><strong>A</strong>dvance the conversation ("Given that information, what makes sense as a next step?")</li>\n</ul>\n<h3>Pre-Objection Preparation</h3>\n<p><strong>Know Your Numbers</strong></p>\n<p>Keep these ready:</p>\n<ul>\n<li>ROI calculations for typical clients (average 3:1 return in first year)</li>\n<li>Industry benchmarks showing cost of poor financial management</li>\n<li>Cost-benefit analysis templates for common scenarios</li>\n</ul>\n<p><strong>Objection Probability Matrix</strong></p>\n<ul>\n<li>Price concerns: 70% of prospects</li>\n<li>Current provider satisfaction: 60% of prospects</li>\n<li>Timing issues: 45% of prospects</li>\n<li>Decision authority questions: 30% of prospects</li>\n</ul>\n<h2>Top 10 Objections &amp; Killer Rebuttals</h2>\n<h3>1. "Your prices are too high"</h3>\n<p><strong>The Setup:</strong> They're comparing price, not value.</p>\n<p><strong>The Rebuttal:</strong><br>"I understand price is a consideration. Let me ask you this&mdash;what's it costing you right now to handle your financials the current way? Most business owners spend 5-10 hours monthly on bookkeeping alone. At your hourly rate, that's already $[X] per month, not counting the opportunity cost of what else you could accomplish with that time."</p>\n<p><strong>Follow-up Questions:</strong></p>\n<ul>\n<li>"What would staying with your current situation cost you over the next year?"</li>\n<li>"How do you typically measure ROI on services that save time and reduce risk?"</li>\n</ul>\n<p><strong>Seed Advantage:</strong> Highlight our cloud-based technology platform that eliminates manual data entry and provides real-time financial insights.</p>\n<h3>2. "We're happy with our current accountant"</h3>\n<p><strong>The Setup:</strong> Status quo bias is strong, but "happy" is often relative.</p>\n<p><strong>The Rebuttal:</strong><br>"That's great to hear! Happy clients make the best clients, which tells me you value good service. I'm curious&mdash;when you say 'happy,' are you getting proactive advice that helps you save on taxes and grow your business, or are they primarily handling compliance and looking backward?"</p>\n<p><strong>Example Response:</strong><br>"Even happy clients benefit from second opinions. Think of it like getting a physical when you feel fine&mdash;sometimes you discover opportunities you didn't know existed."</p>\n<p><strong>Seed Advantage:</strong> Emphasize our proactive advisory services and monthly strategy calls versus the reactive approach of traditional firms.</p>\n<h3>3. "We need to think about it"</h3>\n<p><strong>The Setup:</strong> This usually means unaddressed concerns.</p>\n<p><strong>The Rebuttal:</strong><br>"Absolutely, this is an important decision and I want you to feel completely confident. To help you think through this effectively, what specific aspects would be most helpful to discuss? Is it the investment, the timing, or something about our approach?"</p>\n<p><strong>Time-Bound Follow-Up Framework:</strong></p>\n<ul>\n<li><strong>Immediate:</strong> "How about I send you a summary of our conversation and three client case studies similar to your situation?"</li>\n<li><strong>48 Hours:</strong> "Let me follow up Thursday to answer any questions that came up during your thinking process."</li>\n<li><strong>One Week:</strong> "If you haven't decided by next Tuesday, I'll assume this isn't the right timing and will check back in three months."</li>\n</ul>\n<h3>4. "We don't have the budget right now"</h3>\n<p><strong>The Setup:</strong> Budget versus priority distinction.</p>\n<p><strong>The Rebuttal:</strong><br>"I hear you, and cash flow timing matters. Here's what I've learned&mdash;when business owners say 'no budget,' it usually means the return isn't clear yet. What if I could show you how this investment pays for itself within 90 days? Would that change how you think about the budget?"</p>\n<p><strong>Alternative Approaches:</strong></p>\n<ul>\n<li>Monthly payment plans that spread the investment</li>\n<li>Phased implementation starting with highest-impact services</li>\n<li>Performance-based pricing tied to measurable results</li>\n</ul>\n<p><strong>Seed Advantage:</strong> Reference our flexible pricing models and tax savings opportunities through strategic tax planning services.</p>\n<h3>5. "I need to talk to my partner/spouse/board"</h3>\n<p><strong>The Setup:</strong> Identify and address the real decision-maker.</p>\n<p><strong>The Rebuttal:</strong><br>"Of course, that makes perfect sense. Important decisions should involve everyone affected. What concerns do you think they'll have? That way, I can make sure you have everything you need to present this effectively."</p>\n<p><strong>Next Steps:</strong></p>\n<ul>\n<li>"Would it be helpful if I joined that conversation?"</li>\n<li>"What has their experience been with professional services like ours?"</li>\n</ul>\n<h3>6. "We tried outsourcing before and it didn't work"</h3>\n<p><strong>The Setup:</strong> Address past negative experiences directly.</p>\n<p><strong>The Rebuttal:</strong><br>"I'm sorry to hear that. Bad experiences really stick with us, don't they? What specifically went wrong? Understanding what didn't work helps me explain how our approach is different and why you won't have the same issues."</p>\n<p><strong>Credibility Builders:</strong></p>\n<ul>\n<li>Share specific client testimonials from similar situations</li>\n<li>Explain your quality control processes</li>\n<li>Offer references who had similar concerns initially</li>\n</ul>\n<h3>7. "We can handle this internally"</h3>\n<p><strong>The Setup:</strong> Challenge the cost-effectiveness of internal solutions.</p>\n<p><strong>The Rebuttal:</strong><br>"That's definitely an option many business owners consider. Help me understand&mdash;when you factor in salary, benefits, training, software licenses, and the time to manage that person, what does your internal solution actually cost annually? And more importantly, what expertise gaps might you have in areas like tax strategy and compliance updates?"</p>\n<h3>8. "This isn't the right time"</h3>\n<p><strong>The Rebuttal:</strong><br>"I understand timing matters. In my experience, there's rarely a 'perfect' time for any business decision. What I'm curious about is&mdash;what would need to change for the timing to feel right? And what's the cost of waiting another six months or a year?"</p>\n<h3>9. "We need to see references first"</h3>\n<p><strong>The Rebuttal:</strong><br>"Absolutely, that's smart due diligence. I'd want the same thing. Let me connect you with three clients in similar situations who'd be happy to share their experience. What specific aspects of our service are you most interested in hearing about from them?"</p>\n<h3>10. "Your firm seems too small for our needs"</h3>\n<p><strong>The Rebuttal:</strong><br>"I appreciate you bringing that up. Size is interesting&mdash;big firms often mean you're a small fish in a big pond, working with junior staff while paying senior partner rates. Our size means you get direct access to senior expertise and personalized attention. What specific capabilities are you concerned we might not have?"</p>\n<h2>Advanced Techniques</h2>\n<h3>The Feel, Felt, Found Method</h3>\n<p>Structure: "I understand how you <strong>feel</strong>. Other clients have <strong>felt</strong> the same way. Here's what they <strong>found</strong>..."</p>\n<p><strong>Example:</strong><br>"I understand how you feel about the investment. Other business owners have felt the same way initially. What they found was that the tax savings alone in the first quarter more than justified the cost."</p>\n<h3>The Boomerang Technique</h3>\n<p>Turn objections into selling points:</p>\n<p><strong>Objection:</strong> "You're too expensive."<br><strong>Boomerang:</strong> "That's exactly why you should work with us. We're more expensive because we deliver results that more than pay for the investment. Cheap accounting often costs more in the long run."</p>\n<h2>Body Language &amp; Communication Tips</h2>\n<p><strong>Your Non-Verbals Matter:</strong></p>\n<ul>\n<li>Maintain open posture (no crossed arms)</li>\n<li>Use calm, confident voice tone</li>\n<li>Make appropriate eye contact (don't stare down)</li>\n<li>Mirror their communication style and pace</li>\n<li>Lean slightly forward to show engagement</li>\n</ul>\n<h2>Action Items</h2>\n<p><strong>This Week:</strong></p>\n<ul>\n<li>Practice the CLARA method with three common objections</li>\n<li>Memorize the top 5 rebuttals most relevant to your prospects</li>\n<li>Update your CRM with objection tracking fields</li>\n</ul>\n<p><strong>This Month:</strong></p>\n<ul>\n<li>Record yourself handling objections and review for improvement</li>\n<li>Collect three new client success stories for social proof</li>\n<li>Create your personal objection probability matrix</li>\n</ul>\n<p><strong>Ongoing:</strong></p>\n<ul>\n<li>Track objection patterns to identify prevention opportunities</li>\n<li>Role-play objection scenarios during team meetings</li>\n<li>Share successful rebuttals with the team for collective learning</li>\n</ul>\n<h2>Key Reminders</h2>\n<blockquote>\n<p><strong>Important:</strong> The scripts and strategies in this guide are for internal training purposes. Always ensure any client communications comply with our professional standards and applicable regulations. This content is not intended as legal or compliance advice.</p>\n</blockquote>\n<p><strong>Remember:</strong> Every objection is an opportunity to demonstrate value, build trust, and advance the relationship. Master these techniques, and you'll transform resistance into revenue.</p>\n<p><em>Questions about these strategies? Reach out to the Sales Director or schedule time during our next team meeting.</em></p>	21	3	draft	f	{sales-objections,sales-scripts,sales-training,client-conversion,objection-handling}	0	\N	\N	\N	\N	\N	2025-07-31 04:16:00.717482	2025-07-31 04:16:00.717482
14	How to Sound Dangerous About Taxes (Without Being a CPA)	how-to-sound-dangerous-about-taxes-without-being-a-cpa-1753931218129	Transform from tax-conversation-avoider to strategic advisor with scripts and strategies that build credibility without overstepping professional boundaries.	<h1>How to Sound Dangerous About Taxes (Without Being a CPA)</h1>\n<p><em>Last Reviewed: 7/31/2025 | Approved By: Randall Hall</em></p>\n<hr>\n<h2>The Credibility Challenge Every Non-CPA Faces</h2>\n<p>Picture this: You're in a client meeting, everything's flowing smoothly, and then someone mentions their tax situation. Suddenly, you feel like you're walking through a minefield wearing clown shoes. Sound familiar?</p>\n<p>Here's the reality, our clients don't always distinguish between different types of financial expertise. They see "Seed Financial" on your business card and assume you can tackle any money-related challenge that walks through their door. The question isn't whether you'll encounter tax conversations; it's whether you'll handle them with confidence or create awkward silence.</p>\n<p>This playbook transforms you from tax-conversation-avoider to strategic tax conversation starter, all while staying squarely within your professional lane.</p>\n<hr>\n<h2>Understanding the Challenge</h2>\n<h3>What We're Up Against</h3>\n<p><strong>Non-CPA team members feel intimidated discussing tax matters</strong></p>\n<ul>\n<li>Fear of overstepping professional boundaries creates hesitation</li>\n<li>Uncertainty about what you can and cannot say leads to missed opportunities</li>\n<li>Qualified leads slip away because competitors sound more confident</li>\n</ul>\n<p><strong>Client expectations vs. reality</strong></p>\n<ul>\n<li>Clients assume all financial services staff understand tax implications</li>\n<li>They expect informed perspectives, not just referrals to "someone else"</li>\n<li>Building credibility without misrepresenting qualifications requires finesse</li>\n</ul>\n<p><strong>Competitive landscape pressure</strong></p>\n<ul>\n<li>Other firms leverage tax knowledge as differentiators</li>\n<li>We need sophisticated positioning without credentials</li>\n<li>Clients value advisors who understand the complete financial picture</li>\n</ul>\n<h3>What "Sounding Dangerous" Actually Means</h3>\n<p><strong>Let's be clear, we're not talking about reckless behavior or practicing without a license.</strong> "Dangerous" in this context means:</p>\n<p><strong>Demonstrating sophisticated understanding without giving advice</strong><br>Instead of saying "I don't know anything about taxes," you'll say "Based on what our tax team sees with similar businesses, there are usually three key areas to evaluate..."</p>\n<p><strong>Asking questions that reveal expertise</strong><br>The right questions prove you understand the landscape better than someone asking "Do you need help with taxes?"</p>\n<p><strong>Positioning as a strategic thinking partner</strong><br>You become someone who sees patterns, identifies risks, and recognizes opportunities&mdash;then connects clients with the right expertise.</p>\n<p><strong>Creating urgency through informed observations</strong><br>"Companies at your revenue level often hit important thresholds that create both opportunities and deadlines" sounds much more compelling than "You should probably talk to an accountant."</p>\n<hr>\n<h2>Your Key Objectives</h2>\n<h3>Primary Goals</h3>\n<p><strong>Build immediate credibility in tax conversations</strong><br>Sound like someone who works closely with tax professionals and understands strategic implications, not someone reading from a generic script.</p>\n<p><strong>Identify high-value opportunities for Seed Financial</strong><br>Tax conversations often reveal the largest financial opportunities. Missing them means missing major relationship-building moments.</p>\n<p><strong>Create urgency for professional tax services</strong><br>Help clients understand that tax strategy timing matters&mdash;procrastination costs money.</p>\n<p><strong>Position yourself as a strategic advisor, not just a service provider</strong><br>Transform from "someone who can get you connected" to "someone who understands what you're facing and can help you navigate it."</p>\n<h3>Essential Boundaries</h3>\n<p><strong>Stay within legal and ethical limits</strong><br>Never provide specific tax advice, calculations, or compliance guidance. Your role is pattern recognition and strategic questioning.</p>\n<p><strong>Know when to escalate to CPAs</strong><br>Some conversations require immediate professional involvement. Recognizing these moments protects everyone involved.</p>\n<p><strong>Maintain professional integrity</strong><br>Always clarify your role and qualifications. Clients respect honesty about boundaries.</p>\n<p><strong>Protect both client and company interests</strong><br>Proper positioning protects clients from inappropriate advice and protects Seed Financial from liability issues.</p>\n<hr>\n<h2>Your Action Plan</h2>\n<h3>Before the Conversation: Preparation Phase</h3>\n<h4>Research That Matters</h4>\n<p><strong>Stay current on tax law changes affecting your client's industry</strong></p>\n<ul>\n<li>Subscribe to <a href="placeholder-irs-newsletter">IRS Small Business Newsletter</a> for updates</li>\n<li>Follow industry publications for sector-specific changes</li>\n<li>Check state department of revenue websites for local updates</li>\n<li>Monitor <a href="placeholder-tax-updates">Seed Financial Tax Update Portal</a> for internal briefings</li>\n</ul>\n<p><strong>Client background essentials</strong></p>\n<ul>\n<li>Review business structure (LLC, S-Corp, Partnership, etc.)</li>\n<li>Note previous tax-related conversations in CRM</li>\n<li>Identify revenue ranges and growth patterns</li>\n<li>Research industry-specific tax considerations</li>\n</ul>\n<blockquote>\n<p><strong>Example:</strong> Before meeting with a growing e-commerce client, research sales tax nexus laws, inventory accounting methods, and recent changes to online business taxation.</p>\n</blockquote>\n<h4>Build Your Question Arsenal</h4>\n<p>Create personalized question banks for different client types:</p>\n<p><strong>Service-based businesses:</strong> Focus on entity structure optimization, estimated tax planning, business expense strategies</p>\n<p><strong>Product-based businesses:</strong> Emphasize inventory accounting, equipment depreciation, sales tax compliance</p>\n<p><strong>Growing companies:</strong> Concentrate on tax threshold management, entity structure evolution, succession planning implications</p>\n<h3>During the Conversation: Strategic Execution</h3>\n<h4>Opening With Authority</h4>\n<p>Always establish your role clearly from the beginning:</p>\n<ul>\n<li>"I work closely with our tax team and see these situations regularly..."</li>\n<li>"Based on what our CPAs tell me about businesses like yours..."</li>\n<li>"Our tax specialists often find that companies at your stage..."</li>\n<li>"I'm not a CPA myself, but I coordinate with our tax team daily, and here's what we typically see..."</li>\n</ul>\n<h4>Strategic Question Sequence</h4>\n<p><strong>Current state assessment</strong></p>\n<ul>\n<li>"How would you describe your current tax planning approach?"</li>\n<li>"When do you typically start thinking about tax implications for business decisions?"</li>\n<li>"What's your relationship like with your current tax preparer?"</li>\n</ul>\n<p><strong>Pain point identification</strong></p>\n<ul>\n<li>"What's the most frustrating aspect of your current tax situation?"</li>\n<li>"Where do you feel like you might be leaving money on the table?"</li>\n<li>"What keeps you up at night about potential tax issues?"</li>\n</ul>\n<p><strong>Opportunity exploration</strong></p>\n<ul>\n<li>"If you could change one thing about how you handle taxes, what would it be?"</li>\n<li>"What business goals do you have that might have tax implications?"</li>\n<li>"How do tax considerations factor into your growth planning?"</li>\n</ul>\n<p><strong>Risk evaluation</strong></p>\n<ul>\n<li>"What would happen if your revenue doubled next year from a tax perspective?"</li>\n<li>"How prepared would you be for a tax audit?"</li>\n<li>"What tax positions are you taking that make you nervous?"</li>\n</ul>\n<h4>Power Observation Statements</h4>\n<p><strong>Pattern recognition</strong></p>\n<ul>\n<li>"We're seeing a lot of [industry] businesses discover they're missing out on [specific opportunity] because their tax preparer focuses only on compliance..."</li>\n<li>"Three clients this month have saved five figures by addressing [specific timing issue] before year-end..."</li>\n<li>"Companies at your revenue level typically face [specific challenge], and the ones who address it proactively usually save significantly..."</li>\n</ul>\n<p><strong>Industry trend connections</strong></p>\n<ul>\n<li>"The new regulations around [specific area] are creating both opportunities and risks for businesses like yours..."</li>\n<li>"We're tracking some changes that could significantly impact [client's industry] starting next year..."</li>\n<li>"Based on what we're seeing with similar companies, this is actually perfect timing to evaluate..."</li>\n</ul>\n<p><strong>Timing opportunity alerts</strong></p>\n<ul>\n<li>"You're approaching some revenue thresholds that create important decision points..."</li>\n<li>"The window for [specific strategy] typically closes at [specific timing], so this conversation is well-timed..."</li>\n<li>"Most businesses miss this opportunity because they don't realize the timing requirements..."</li>\n</ul>\n<h3>After the Conversation: Follow-Through Excellence</h3>\n<h4>Internal Escalation Process</h4>\n<p><strong>When to involve CPAs immediately</strong></p>\n<ul>\n<li>Complex entity structure questions</li>\n<li>Specific compliance concerns</li>\n<li>Multi-state tax issues</li>\n<li>Legal implications present</li>\n<li>Time-sensitive opportunities identified</li>\n</ul>\n<p><strong>How to brief the tax team effectively</strong><br>Use our best process to pass on:</p>\n<ul>\n<li>Client background and business structure</li>\n<li>Specific opportunities or concerns identified</li>\n<li>Urgency level and timing considerations</li>\n<li>Client's current tax professional relationships</li>\n<li>Next steps committed to client</li>\n<li>Circulate a calendar time for next discussion</li>\n</ul>\n<h4>Client Communication Excellence</h4>\n<p><strong>Follow-up messaging that maintains momentum</strong><br>"Based on our conversation about [specific topic], I've connected with our tax specialist who works with businesses like yours. They've identified three specific areas that typically provide significant value for companies at your stage. Would Thursday or Friday work better for a brief call to explore these opportunities?"</p>\n<p><strong>Resource sharing that adds value</strong><br>Share relevant <a href="placeholder-tax-resources">client one sheet</a> materials that demonstrate expertise without providing advice.</p>\n<p><strong>Next steps that advance the relationship</strong><br>Always provide specific next steps with timelines, ownership, and expected outcomes.</p>\n<hr>\n<h2>Scripts That Work</h2>\n<h3>Credibility-Building Openers</h3>\n<h4>Industry Pattern Recognition</h4>\n<p><strong>For service businesses:</strong><br>"We're seeing a lot of consulting firms miss out on the 20% pass-through deduction because they're not structuring their businesses optimally. Most tax preparers focus on last year's numbers, but our team looks at structuring for next year's opportunities."</p>\n<p><strong>For product businesses:</strong><br>"Three manufacturing clients this month have discovered they've been paying significantly more in taxes than necessary because they weren't optimizing their equipment depreciation strategies. The timing of these decisions makes a huge difference."</p>\n<p><strong>For growing companies:</strong><br>"Companies experiencing growth like yours often hit tax thresholds that create both opportunities and requirements they weren't expecting. We've found that proactive planning at your stage typically saves companies 15-30% compared to reactive tax preparation."</p>\n<h4>Informed Observations</h4>\n<p><strong>Business structure insights:</strong><br>"Your LLC structure suggests you might be missing out on some significant tax advantages. Companies at your revenue level often benefit from evaluating S-Corp elections, but the timing and implementation details are critical."</p>\n<p><strong>Growth pattern observations:</strong><br>"Based on your growth trajectory, you're likely approaching some important tax decision points. We typically see companies at your stage face challenges with estimated tax payments, entity structure optimization, and strategic timing for major expenses."</p>\n<p><strong>Risk identification statements:</strong><br>"The IRS has been particularly focused on [specific area] for businesses like yours. Our tax team helps clients navigate these areas proactively rather than reactively."</p>\n<h3>Questions That Create Urgency</h3>\n<h4>Entity Structure Evaluation</h4>\n<p><strong>Structure optimization:</strong><br>"When did you last evaluate whether your current business structure is still optimal for your tax situation? Most businesses choose their initial structure based on startup needs, but optimal structures often change as companies grow."</p>\n<p><strong>Strategic timing:</strong><br>"How are you currently handling the 20% pass-through deduction requirements? We're finding that many businesses are missing significant opportunities because their structure doesn't optimize for this benefit."</p>\n<p><strong>Future planning:</strong><br>"What's your strategy for potential changes in tax rates? Companies that plan for various scenarios typically have more flexibility and better outcomes."</p>\n<h4>Planning vs. Preparation Assessment</h4>\n<p><strong>Strategic approach:</strong><br>"Are you planning for taxes or just preparing them? Most business owners we meet are surprised by the difference&mdash;and the potential savings."</p>\n<p><strong>Decision timing:</strong><br>"How far in advance are you making tax-impacting business decisions? We find that businesses making these decisions quarterly rather than annually typically save significantly more."</p>\n<p><strong>Growth scenarios:</strong><br>"What would happen to your tax liability if your revenue increased by 50% this year? Understanding these scenarios helps us prepare strategies rather than just react to results."</p>\n<h3>Escalation and Handoff Language</h3>\n<h4>Natural Transitions to CPAs</h4>\n<p><strong>Expertise positioning:</strong><br>"This is exactly the type of situation our tax strategists love to analyze. They specialize in optimizing structures for growing businesses and typically find opportunities that more than pay for their services."</p>\n<p><strong>Specialist introduction:</strong><br>"Let me connect you with Sarah, our CPA who focuses specifically on businesses like yours. She's helped dozens of companies at your stage optimize their tax strategies, and I think you'd find her insights valuable."</p>\n<p><strong>Value proposition setup:</strong><br>"Based on what you've shared, I think a deeper tax analysis would be valuable. Our specialists typically identify opportunities worth several times their fee, and they can give you specific strategies rather than general observations."</p>\n<h4>ROI Positioning</h4>\n<p><strong>Investment perspective:</strong><br>"The potential savings here could easily pay for comprehensive tax planning several times over. Most clients are surprised by how quickly the investment pays for itself."</p>\n<p><strong>Risk cost analysis:</strong><br>"Missing these opportunities could cost significantly more than addressing them proactively. We typically see companies save 10-30% of their tax liability through proper planning."</p>\n<p><strong>Strategic advantage:</strong><br>"This is where having a proactive tax strategy really pays off. Companies that plan quarterly rather than annually typically have much better outcomes and fewer surprises."</p>\n<hr>\n<h2>Measuring Success</h2>\n<h3>Conversation Quality Indicators</h3>\n<p><strong>Client engagement measurement</strong></p>\n<ul>\n<li>Conversation length increases when tax topics arise</li>\n<li>Client asks follow-up questions rather than changing subjects</li>\n<li>Client takes notes or asks for recommendations to be repeated</li>\n<li>Body</li>\n</ul>	21	3	published	t	{"tax conversations","client credibility","non-CPA strategies","professional boundaries","strategic positioning"}	0	\N	\N	\N	\N	\N	2025-07-31 03:06:58.783476	2025-07-31 23:10:22.106
19	Client Journey: What Happens After They Sign (Internal)	client-journey-what-happens-after-they-sign-internal-1753937472704	Complete SOP defining client onboarding from contract signature to service activation, ensuring consistent exceptional experiences that build relationships.	<h1>Client Journey: What Happens After They Sign</h1>\n<p><em>Standard Operating Procedure</em></p>\n<h2>Overview</h2>\n<h3>Purpose &amp; Scope</h3>\n<p>The client onboarding process transforms promises into reality. This SOP defines our complete client journey from contract signature to full service activation, ensuring every new client receives the exceptional experience that builds long-term relationships and generates referrals.</p>\n<p><strong>This procedure will:</strong></p>\n<ul>\n<li>Define the complete client onboarding process from contract signature to full service activation</li>\n<li>Establish consistent expectations across all client touchpoints</li>\n<li>Provide sales teams with confidence-building talking points for post-sale conversations</li>\n</ul>\n<h3>Key Stakeholders</h3>\n<ul>\n<li><strong>Sales representatives</strong> - Initial client relationship and expectation setting</li>\n<li><strong>Client Success Manager</strong> - Primary relationship owner and process coordinator</li>\n<li><strong>Accounting team leads</strong> - Service delivery and technical implementation</li>\n<li><strong>Technology/systems administrators</strong> - Platform setup and integration</li>\n<li><strong>Compliance officer</strong> - Risk assessment and regulatory adherence</li>\n</ul>\n<h3>Timeline Summary</h3>\n<ul>\n<li><strong>Week 1:</strong> Complete visibility into next steps</li>\n<li><strong>Weeks 2-3:</strong> Data transformation into actionable intelligence</li>\n<li><strong>Week 4:</strong> First transformative deliverables</li>\n<li><strong>Ongoing:</strong> Seamless service delivery excellence</li>\n</ul>\n<h2>Prerequisites</h2>\n<h3>Required Documentation</h3>\n<p>Before initiating the onboarding process, ensure these items are complete:</p>\n<ul>\n<li>Executed service agreement with clearly defined scope</li>\n<li>Client contact sheet with primary and secondary contacts</li>\n<li>Initial questionnaire responses (business structure, current systems, pain points)</li>\n<li>Access credentials to existing financial systems/platforms</li>\n</ul>\n<h3>Internal Setup Requirements</h3>\n<ul>\n<li>Client folder created in document management system</li>\n<li>Project assigned in workflow management platform</li>\n<li>Team member assignments confirmed</li>\n<li>Initial service calendar established</li>\n</ul>\n<h3>Sales Handoff Checklist</h3>\n<p>The sales-to-delivery handoff is critical. Verify these items are documented:</p>\n<ul>\n<li>Client expectations documented and communicated to delivery team</li>\n<li>Special requests or custom arrangements noted</li>\n<li>Relationship history and client personality notes transferred</li>\n<li>Payment terms and billing setup confirmed</li>\n</ul>\n<h2>Step-by-Step Process</h2>\n<h3>Days 1-2: Immediate Professional Response</h3>\n<h4>Internal Actions</h4>\n<p><strong>Contract Processing</strong></p>\n<ul>\n<li>Legal team review for any custom terms</li>\n<li>Service agreement filed in client management system</li>\n<li>Billing setup initiated with payment terms</li>\n</ul>\n<p><strong>Team Notification &amp; Assignment</strong></p>\n<ul>\n<li>Client Success Manager assigned and notified</li>\n<li>Service delivery team members identified</li>\n<li>Internal kickoff meeting scheduled</li>\n</ul>\n<h4>Client-Facing Actions</h4>\n<p><strong>Welcome Communication</strong></p>\n<ul>\n<li>Personalized welcome email from Client Success Manager including detailed timeline infographic and service roadmap</li>\n<li>Welcome packet with next steps checklist, team contact cards, and platform access guide</li>\n<li>Calendar link for onboarding call with Calendly integration for immediate scheduling</li>\n</ul>\n<blockquote>\n<p><strong>Sales Rep Talking Points:</strong><br><em>"Within 24 hours of signing, [Client Name] receives a welcome email from their dedicated Client Success Manager, [Name]. This email includes a clear timeline and their direct contact information. No waiting, no confusion&mdash;just immediate action."</em></p>\n</blockquote>\n<h3>Week 1: Complete Visibility Into Next Steps</h3>\n<h4>Internal Actions</h4>\n<p><strong>System Setup</strong></p>\n<ul>\n<li>Client portal access created using SharePoint Online with customized dashboard</li>\n<li>Document sharing folders established with automated backup to Azure cloud storage</li>\n<li>Workflow tracking initiated in Monday.com project management platform</li>\n</ul>\n<p><strong>Initial Analysis</strong></p>\n<ul>\n<li>Current state assessment of client's financial systems using QuickBooks, Xero, or NetSuite data extraction</li>\n<li>Gap analysis against service agreement scope using proprietary assessment framework</li>\n<li>Risk assessment and compliance review via automated scanning tools</li>\n</ul>\n<h4>Client-Facing Actions</h4>\n<p><strong>Discovery &amp; Documentation</strong></p>\n<ul>\n<li>Onboarding call with Client Success Manager (30-45 minutes) including screen share walkthrough of their new client portal</li>\n<li>Document collection process initiated via secure DocuSign portal with progress tracking</li>\n<li>System access requests submitted through encrypted channels with MFA setup</li>\n</ul>\n<p><strong>Expectation Alignment</strong></p>\n<ul>\n<li>Service timeline confirmation with milestone calendar sent via Google Calendar integration</li>\n<li>Communication preferences established (Slack channel, email, or phone priority)</li>\n<li>Key milestone dates scheduled with automated reminders</li>\n</ul>\n<blockquote>\n<p><strong>Sales Rep Talking Points:</strong><br><em>"By the end of Week 1, we conduct a comprehensive discovery call and begin collecting necessary documentation. We're thorough here because it means smoother sailing ahead."</em></p>\n</blockquote>\n<h3>Weeks 2-3: Data Becomes Actionable Intelligence</h3>\n<h4>Internal Actions</h4>\n<p><strong>Technical Implementation</strong></p>\n<ul>\n<li>Chart of accounts review and cleanup using AI-powered categorization tools</li>\n<li>Historical data migration (if applicable) with 99.5% accuracy verification through automated reconciliation</li>\n<li>Integration setup with existing business systems via API connections (Salesforce, HubSpot, banking platforms)</li>\n</ul>\n<p><strong>Process Documentation</strong></p>\n<ul>\n<li>Current workflow mapping using process visualization software</li>\n<li>Recommended process improvements identified through efficiency analysis algorithms</li>\n<li>Custom reporting requirements documented in Power BI dashboard templates</li>\n</ul>\n<h4>Client-Facing Actions</h4>\n<p><strong>Progress Updates</strong></p>\n<ul>\n<li>Weekly progress emails with specific accomplishments including data migration percentages and system integration status</li>\n<li>Additional information requests sent via client portal with secure upload functionality</li>\n<li>Preliminary findings discussion with data visualization previews</li>\n</ul>\n<p><strong>Training Preparation</strong></p>\n<ul>\n<li>User access setup for client team members with role-based permissions</li>\n<li>Training materials customized to client needs using interactive video modules</li>\n<li>Training sessions scheduled via Zoom with recorded sessions for future reference</li>\n</ul>\n<blockquote>\n<p><strong>Sales Rep Talking Points:</strong><br><em>"Weeks 2 and 3 involve heavy lifting behind the scenes. While [Client Name] continues running their business, our team imports data, sets up systems, and prepares their customized financial infrastructure. They receive weekly updates, but the real magic happens in the background."</em></p>\n</blockquote>\n<h3>Week 4: First Transformative Deliverables</h3>\n<h4>Internal Actions</h4>\n<p><strong>Quality Review</strong></p>\n<ul>\n<li>All setup work reviewed by senior team member using standardized quality checklist</li>\n<li>Initial deliverables prepared and reviewed through multi-tier approval process</li>\n<li>Performance metrics baseline established using KPI dashboard tracking</li>\n</ul>\n<p><strong>Training Delivery</strong></p>\n<ul>\n<li>Client team training sessions conducted via interactive webinar platform</li>\n<li>Process documentation delivered through searchable knowledge base</li>\n<li>Support resources provided including video tutorials and quick-reference guides</li>\n</ul>\n<h4>Client-Facing Actions</h4>\n<p><strong>First Deliverables</strong></p>\n<ul>\n<li>Initial financial reports delivered including:\n<ul>\n<li>13-week cash flow analysis</li>\n<li>Expense categorization review with variance analysis</li>\n<li>3-month financial projections with scenario modeling</li>\n<li>Custom KPI dashboard with real-time data feeds</li>\n</ul>\n</li>\n<li>System access credentials and training provided with step-by-step setup guides and video walkthroughs</li>\n<li>30-day check-in meeting scheduled with agenda including performance review and optimization opportunities</li>\n</ul>\n<p><strong>Feedback Collection</strong></p>\n<ul>\n<li>Client satisfaction survey deployed via automated email with Net Promoter Score tracking</li>\n<li>Process feedback and adjustment requests collected through structured feedback form</li>\n<li>Success metrics review including baseline comparisons and improvement measurements</li>\n</ul>\n<blockquote>\n<p><strong>Sales Rep Talking Points:</strong><br><em>"By Week 4, [Client Name] sees their first concrete deliverables. These aren't just reports&mdash;they're the actual insights they'll receive ongoing. The 30-day check-in ensures everything works perfectly and gives them a chance to fine-tune anything."</em></p>\n</blockquote>\n<h3>Ongoing: Seamless Service Delivery Excellence</h3>\n<h4>Internal Actions</h4>\n<p><strong>Regular Delivery Cadence</strong></p>\n<ul>\n<li>Monthly/quarterly deliverables as per service agreement including automated report generation and distribution</li>\n<li>Proactive communication of deadline changes or issues through automated alert system</li>\n<li>Continuous process improvement implementation using client feedback analytics</li>\n</ul>\n<p><strong>Relationship Management</strong></p>\n<ul>\n<li>Regular Client Success Manager check-ins via scheduled video calls with structured agendas</li>\n<li>Annual service reviews and optimization using comprehensive performance analytics</li>\n<li>Expansion opportunity identification through automated usage pattern analysis</li>\n</ul>\n<h4>Client-Facing Actions</h4>\n<p><strong>Consistent Communication</strong></p>\n<ul>\n<li>Regular delivery confirmations with performance metrics and insights summary</li>\n<li>Proactive updates on regulation changes affecting their business via targeted email alerts</li>\n<li>Strategic insights and recommendations delivered through monthly business intelligence reports</li>\n</ul>\n<blockquote>\n<p><strong>Sales Rep Talking Points:</strong><br><em>"After the first month, [Client Name] enters our standard service rhythm. They know exactly when to expect deliverables, who to call with questions, and can count on proactive communication about anything that affects their business."</em></p>\n</blockquote>\n<h2>Quality Checks</h2>\n<h3>Week 1 Quality Gates</h3>\n<ul>\n<li>Client Success Manager introduction completed within 24 hours</li>\n<li>All required documentation requested and timeline communicated</li>\n<li>Internal team assignments confirmed and communicated</li>\n<li>Client portal access tested and credentials delivered</li>\n</ul>\n<h3>Weeks 2-3 Quality Gates</h3>\n<ul>\n<li>Data migration accuracy verified (minimum 99.5% accuracy rate)</li>\n<li>System integrations tested and functioning</li>\n<li>Client feedback on process incorporated</li>\n<li>Weekly progress updates delivered on schedule</li>\n</ul>\n<h3>Week 4 Quality Gates</h3>\n<ul>\n<li>All initial deliverables reviewed and approved by senior team member</li>\n<li>Client training completed with recorded sessions archived</li>\n<li>30-day check-in meeting scheduled and confirmed</li>\n<li>Client satisfaction survey responses reviewed and addressed</li>\n</ul>\n<h2>Compliance Notes</h2>\n<p><strong>Important:</strong> This SOP contains internal processes for service delivery. All client communications must include appropriate disclaimers regarding financial advice and comply with applicable state and federal regulations. Ensure proper handling of all personally identifiable information (PII) and protected health information (PHI) throughout the onboarding process.</p>\n<p><strong>Last Reviewed:</strong> [Insert Date]<br><strong>Next Review:</strong> [Insert Date + 6 months]<br><strong>Approved By:</strong> [Leadership Team]</p>\n<h2>Action Items</h2>\n<p><strong>For immediate implementation:</strong></p>\n<ul>\n<li>Review current client onboarding processes against this SOP</li>\n<li>Update team training materials to reflect these standards</li>\n<li>Schedule team meeting to discuss implementation timeline</li>\n<li>Create tracking mechanisms for quality gates compliance</li>\n</ul>	21	3	draft	f	{"client onboarding","standard operating procedure","client success","process management","service delivery",internal}	0	\N	\N	\N	\N	\N	2025-07-31 04:51:13.165408	2025-07-31 04:52:44.765
11	Qualifying a Lead in Under 3 Minutes	how-to-sound-dangerous-about-taxes-without-being-a-cpa-1753928224280	Master the art of qualifying sales leads in 3 minutes or less with this systematic framework that increases conversion rates by 40%.	<h1>Sales/Service Playbook: Master Lead Qualification in Under 3 Minutes</h1>\n<h2>The Challenge: Time Is Money in Lead Qualification</h2>\n<p>Here's the harsh reality: your sales team handles 50+ leads weekly with barely 5-10 minutes for initial contact. Prospects demand immediate responses but have microscopic attention spans. The math doesn't lie&mdash;most qualification calls stretch 15-20 minutes, burning precious selling time while missing critical disqualifying factors.</p>\n<p>Our recent team audit uncovered three efficiency killers:</p>\n<ul>\n<li>Spending 30+ minutes on prospects lacking budget or authority</li>\n<li>Missing obvious red flags within the first two minutes</li>\n<li>Inconsistent questioning leading to misqualified pipeline leads</li>\n</ul>\n<p>The result? Conversion rates suffer, and top performers waste time on prospects who should never survive initial screening.</p>\n<h3>The 3-Minute Framework: Proven Results</h3>\n<p>Early adopters report game-changing improvements:</p>\n<ul>\n<li><strong>40% increase</strong> in qualified lead conversion rates</li>\n<li><strong>25% faster</strong> pipeline velocity from contact to proposal</li>\n<li><strong>Superior resource allocation</strong> focusing on high-probability prospects</li>\n</ul>\n<p>The secret isn't asking fewer questions&mdash;it's asking the <em>right</em> questions in the <em>right</em> order.</p>\n<h2>Your Mission: Binary Decision in 180 Seconds</h2>\n<p>Every qualification call has one goal: qualify or disqualify within three minutes, then act decisively. You're not conducting therapy sessions&mdash;you're surgical in your approach.</p>\n<h3>Primary Objectives</h3>\n<ul>\n<li><strong>Identify qualified prospects</strong> in 180 seconds maximum</li>\n<li><strong>Determine readiness timeline</strong> for moving forward</li>\n<li><strong>Classify leads</strong> into Hot/Warm/Cold/Pass categories</li>\n</ul>\n<h3>Secondary Objectives</h3>\n<ul>\n<li>Capture essential contact and business information</li>\n<li>Set appropriate follow-up expectations</li>\n<li>Document qualification criteria for CRM tracking</li>\n</ul>\n<h2>The 3-Minute Qualification Framework</h2>\n<h3>Pre-Call Preparation (30 Seconds Maximum)</h3>\n<p>Before dialing, spend exactly 30 seconds reviewing:</p>\n<ul>\n<li>Lead source (website form, referral, trade show)</li>\n<li>Form submissions or downloaded content</li>\n<li>Company website About page and services</li>\n<li>Previous CRM touchpoints or notes</li>\n</ul>\n<p><strong>Pro tip:</strong> Set a timer. Research paralysis kills momentum and eats into your qualification time.</p>\n<h3>Phase 1: Opening &amp; Rapport (45 Seconds)</h3>\n<blockquote>\n<p><strong>Professional Introduction:</strong><br>"Hi [Name], this is [Your Name] from Seed Financial. I see you reached out about our bookkeeping services. Do you have 3-4 minutes to discuss your needs?"</p>\n</blockquote>\n<p><strong>Listen for these signals:</strong></p>\n<ul>\n<li><strong>Tone:</strong> Rushed, interested, or confused?</li>\n<li><strong>Environment:</strong> Office background vs. personal setting</li>\n<li><strong>Engagement:</strong> Willingness to continue the conversation</li>\n</ul>\n<p><strong>Always request permission:</strong> "Is now a good time, or should I call back later?"</p>\n<p><em>Green light response:</em> "Perfect timing! I was just thinking about this."<br><em>Reschedule immediately:</em> "Well, I'm between meetings..."</p>\n<h3>Phase 2: Core Qualification Questions (90 Seconds)</h3>\n<h4>Business Profile Questions (30 Seconds)</h4>\n<blockquote>\n<p><strong>Opening question:</strong> "Help me understand your business&mdash;what industry are you in, and what does your company do?"</p>\n</blockquote>\n<p><strong>What their response reveals:</strong></p>\n<ul>\n<li><strong>Clear, confident explanation</strong> = Established business</li>\n<li><strong>Vague or overly complex description</strong> = Potential red flag</li>\n<li><strong>Passion in their voice</strong> = Engaged business owner</li>\n</ul>\n<blockquote>\n<p><strong>Follow-up:</strong> "How long have you been in business, and do you have employees?"</p>\n</blockquote>\n<p>This reveals business maturity, payroll complexity, and growth trajectory.</p>\n<blockquote>\n<p><strong>Revenue qualifier:</strong> "Just to make sure we're a good fit service-wise, what's your approximate annual revenue range?"</p>\n</blockquote>\n<p><strong>Classification signals:</strong></p>\n<ul>\n<li><strong>Hot:</strong> Specific number or confident range</li>\n<li><strong>Warm:</strong> Rough estimate with growth projections</li>\n<li><strong>Cold:</strong> "It varies" or very vague response</li>\n<li><strong>Pass:</strong> Below your minimum service threshold</li>\n</ul>\n<h4>Pain Point Identification (30 Seconds)</h4>\n<blockquote>\n<p><strong>Critical question:</strong> "What's happening right now that made you decide to look for accounting help?"</p>\n</blockquote>\n<p><strong>Response classification:</strong></p>\n<ul>\n<li><strong>Hot signals:</strong> "My bookkeeper quit," "I'm behind on taxes," "Growing too fast to handle internally"</li>\n<li><strong>Warm signals:</strong> "Looking to upgrade," "Want to be more strategic"</li>\n<li><strong>Cold signals:</strong> "Just exploring options," "Curious about costs"</li>\n</ul>\n<blockquote>\n<p><strong>Follow-up:</strong> "How are you handling your books and taxes currently?"</p>\n</blockquote>\n<p><strong>Listen for opportunity indicators:</strong></p>\n<ul>\n<li>DIY approach with frustration = Prime opportunity</li>\n<li>Current provider issues = Competitive situation</li>\n<li>No current process = Either huge opportunity or chaos</li>\n</ul>\n<h4>Decision-Making Authority (15 Seconds)</h4>\n<blockquote>\n<p><strong>Authority question:</strong> "Are you the person who makes decisions about financial services, or is there someone else I should be speaking with?"</p>\n</blockquote>\n<p><strong>Authority classification:</strong></p>\n<ul>\n<li><strong>Hot:</strong> "Yes, it's my decision"</li>\n<li><strong>Warm:</strong> "I make the decision with my partner"</li>\n<li><strong>Cold:</strong> "I need to run it by several people"</li>\n<li><strong>Pass:</strong> "I'm just gathering information for my boss"</li>\n</ul>\n<h4>Budget Reality Check (15 Seconds)</h4>\n<blockquote>\n<p><strong>Budget question:</strong> "Have you set aside budget for professional accounting services this year?"</p>\n</blockquote>\n<p><strong>Budget readiness signals:</strong></p>\n<ul>\n<li><strong>Hot:</strong> "Yes, we budgeted $X" or "We know we need to invest"</li>\n<li><strong>Warm:</strong> "We're willing to pay for the right solution"</li>\n<li><strong>Cold:</strong> "We need to see what it costs first"</li>\n<li><strong>Pass:</strong> "We're hoping to find something really cheap"</li>\n</ul>\n<h3>Phase 3: Qualification Assessment (45 Seconds)</h3>\n<blockquote>\n<p><strong>Summarize understanding:</strong> "Let me make sure I understand: You're a [business type] that's been operating for [timeframe], currently doing [revenue range], and you're looking for help because [pain point]. You're the decision-maker and you've allocated budget for this. Did I get that right?"</p>\n</blockquote>\n<h4>Next Steps by Classification</h4>\n<p><strong>Hot Leads:</strong> Schedule discovery call immediately</p>\n<blockquote>\n<p>"Based on what you've shared, I think we can definitely help. I'd like to schedule 30 minutes to dive deeper into your specific situation. Are you available tomorrow at 2 PM or Thursday at 10 AM?"</p>\n</blockquote>\n<p><strong>Warm Leads:</strong> Send information and follow up</p>\n<blockquote>\n<p>"It sounds like we could be a good fit. Let me send you our service overview and a couple of case studies. I'll follow up Friday to answer any questions. What's the best email?"</p>\n</blockquote>\n<p><strong>Cold Leads:</strong> Add to nurture sequence</p>\n<blockquote>\n<p>"I appreciate you taking the time. It sounds like you're still in the early research phase. I'll add you to our monthly newsletter with business tips, and feel free to reach out when you're ready to move forward."</p>\n</blockquote>\n<p><strong>Pass:</strong> Polite disqualification with alternatives</p>\n<blockquote>\n<p>"I appreciate your time. Based on your current situation, you might be better served by [alternative solution]. If your needs change, please don't hesitate to call."</p>\n</blockquote>\n<h2>Lead Classification Criteria</h2>\n<h3>HOT Lead Profile (Schedule Discovery Call Immediately)</h3>\n<p><strong>All indicators present:</strong></p>\n<ul>\n<li><strong>Immediate need:</strong> "I need help by month-end" or "My bookkeeper just quit"</li>\n<li><strong>Budget confirmed:</strong> Specific dollar amount or "We've allocated budget"</li>\n<li><strong>Clear authority:</strong> "It's my decision" or "I decide with one partner"</li>\n<li><strong>Perfect fit pain:</strong> Problems we solve directly and completely</li>\n<li><strong>Ideal client profile:</strong> Revenue and business type match our sweet spot</li>\n</ul>\n<p><strong>Example Hot Lead:</strong><br><em>"I run a construction company doing about $800K annually. My bookkeeper retired last month and I'm drowning in paperwork. I need someone to take over immediately. I'm the owner, I make the decisions, and I know I need to budget $1,500-2,000 monthly for this."</em></p>\n<h3>WARM Lead Profile (Send Information, Follow Up in 3-5 Days)</h3>\n<p><strong>Most indicators present:</strong></p>\n<ul>\n<li><strong>Planning ahead:</strong> "Looking to make a change in the next quarter"</li>\n<li><strong>Budget aware:</strong> "We know we need to invest more in accounting"</li>\n<li><strong>Growth trajectory:</strong> "We're expanding and need more support"</li>\n<li><strong>Provider shopping:</strong> Comparing multiple options systematically</li>\n<li><strong>Influence in decision:</strong> Key input even if not final authority</li>\n</ul>\n<p><strong>Example Warm Lead:</strong><br><em>"We're a marketing agency doing about $400K. We're growing and our current bookkeeper is overwhelmed. We want to upgrade to someone more strategic. I'll be making the decision with my business partner. We haven't set a specific budget but we know good service costs money."</em></p>\n<h3>COLD Lead Profile (Add to Nurture Sequence)</h3>\n<p><strong>Few indicators present:</strong></p>\n<ul>\n<li><strong>No timeline:</strong> "Someday" or "when we get bigger"</li>\n<li><strong>Price focused:</strong> Primary concern is finding cheapest option</li>\n<li><strong>Limited authority:</strong> Many people involved in decision</li>\n<li><strong>Unclear needs:</strong> Can't articulate specific problems or goals</li>\n<li><strong>Very early stage:</strong> Just starting out with minimal revenue</li>\n</ul>\n<h3>PASS Criteria (Politely Disqualify)</h3>\n<p><strong>Disqualifying factors:</strong></p>\n<ul>\n<li><strong>Outside service area:</strong> Beyond our geographic coverage</li>\n<li><strong>Below minimum revenue:</strong> Under our profitability threshold</li>\n<li><strong>Unrealistic expectations:</strong> Wants enterprise service at startup prices</li>\n<li><strong>Personality red flags:</strong> Rude, demanding, or difficult communication</li>\n<li><strong>Wrong services:</strong> Needs investment management, insurance, etc.</li>\n</ul>\n<h2>Handling Common Objections</h2>\n<h3>"I'm just looking around"</h3>\n<blockquote>\n<p><strong>Response:</strong> "I understand&mdash;it's smart to explore your options. What's prompting you to look at accounting services right now? Even if you're just researching, I can share some insights about what businesses like yours typically need to consider."</p>\n</blockquote>\n<p><strong>Listen for:</strong> Specific pain points or genuine curiosity vs. price shopping</p>\n<h3>"I need to think about it"</h3>\n<blockquote>\n<p><strong>Response:</strong> "Absolutely, this is an important decision. What specific aspects do you need to think through? Maybe I can address some of those considerations now."</p>\n</blockquote>\n<p><strong>Follow-up:</strong> "Is it budget, timing, or something about our services specifically?"</p>\n<h3>"I'm happy with my current accountant"</h3>\n<blockquote>\n<p><strong>Response:</strong> "That's great to hear. What made you reach out to us then? Sometimes people contact us when they're looking for additional services or a second opinion on something specific."</p>\n</blockquote>\n<p><strong>Listen for:</strong> Hidden dissatisfaction or growing needs their current provider can't meet</p>\n<h2>Success Metrics &amp; Tracking</h2>\n<h3>Qualification Efficiency Targets</h3>\n<ul>\n<li><strong>Average call duration:</strong> 3 minutes or less</li>\n<li><strong>Information capture rate:</strong> 90% of required data points</li>\n<li><strong>Same-day classification:</strong> 100% of leads categorized within 24 hours</li>\n</ul>\n<h3>Conversion Benchmarks</h3>\n<ul>\n<li><strong>Hot lead to discovery call:</strong> 70%+ conversion rate</li>\n<li><strong>Discovery call attendance:</strong> 85%+ show rate</li>\n<li><strong>Discovery to proposal:</strong> 60%+ conversion rate</li>\n</ul>\n<h2>Quick Reference: The 7 Must-Ask Questions</h2>\n<ol>\n<li><strong>"What industry are you in, and what does your company do?"</strong></li>\n<li><strong>"How long have you been in business?"</strong></li>\n<li><strong>"What's your approximate annual revenue range?"</strong></li>\n<li><strong>"What's happening that made you look for accounting help now?"</strong></li>\n<li><strong>"How do you handle your books and taxes currently?"</strong></li>\n<li><strong>"Are you the decision-maker for financial services?"</strong></li>\n<li><strong>"Have you allocated budget for professional accounting?"</strong></li>\n</ol>\n<h2>Implementation Action Plan</h2>\n<h3>&nbsp;</h3>	21	3	draft	t	{"lead qualification","sales process","3-minute framework","conversion optimization","sales efficiency"}	0	\N	\N	\N	\N	\N	2025-07-31 02:17:04.670495	2025-07-31 02:59:41.056
16	Seed’s Ideal Client Profiles (ICPs)	seeds-ideal-client-profiles-icps-1753932026812	Strategic playbook defining Seed's three ideal client profiles with qualification frameworks, discovery questions, and conversion metrics to optimize sales and service delivery.	<h1>Seed's Ideal Client Profiles: Your Strategic Sales and Service Playbook</h1>\n<p><em>Last reviewed: [Current Date] | Internal Sales/Service Document | Requires management approval for external distribution</em></p>\n<h2>Executive Summary</h2>\n<p>Seed Financial has evolved beyond traditional compliance-focused accounting to become the strategic CFO-level partner that scaling businesses need but can't afford full-time. This playbook defines our three primary Ideal Client Profiles (ICPs) and provides actionable frameworks for identifying, attracting, and serving these high-value segments.</p>\n<p><strong>Our competitive advantage:</strong> We fill the crucial gap between commodity accounting services and Big Four complexity&mdash;and we do it with the technology-forward solutions our target market demands.</p>\n<h2>Why ICPs Drive Everything We Do</h2>\n<p>Without clear ideal client profiles, we're shooting arrows in the dark. Every minute spent on an unqualified prospect costs us an hour we could invest in a client destined to become a long-term strategic partner.</p>\n<h3>The Business Impact</h3>\n<p><strong>Resource Efficiency:</strong> Laser-focused business development efforts improve close rates and eliminate wasted prospecting time.</p>\n<p><strong>Client Success:</strong> When we serve businesses whose needs align perfectly with our capabilities, satisfaction soars. Happy clients pay faster, stay longer, and refer consistently.</p>\n<p><strong>Premium Positioning:</strong> ICP-specific messaging speaks directly to real pain points, making our value proposition immediately obvious to qualified prospects.</p>\n<p><strong>Team Alignment:</strong> Everyone speaks the same language and delivers consistent experiences when we all understand exactly who we serve best.</p>\n<h2>Our Three Primary ICPs</h2>\n<p>After analyzing our most successful client relationships, three distinct profiles emerged&mdash;each with specific characteristics, pain points, and growth trajectories that align with our service capabilities:</p>\n<ul>\n<li><strong>Tech Founders &amp; Startup Executives:</strong> Specialized expertise in equity compensation, investor reporting, and scaling financial systems</li>\n<li><strong>Real Estate Investors &amp; Developers:</strong> Entity structuring, 1031 exchanges, and multi-property tax optimization</li>\n<li><strong>Small Business Owners:</strong> Growth-focused financial strategy and scalable systems for service-based and e-commerce companies</li>\n</ul>\n<h2>Strategic Objectives</h2>\n<h3>Team Alignment Goals</h3>\n<p><strong>Standardize Qualification:</strong> Eliminate subjective "gut feelings" with consistent, objective criteria that anyone can apply.</p>\n<p><strong>Accelerate Sales Cycles:</strong> Target 30% reduction in average sales cycle length for ICP-aligned prospects through precise messaging and relevant solutions.</p>\n<p><strong>Enhance Service Consistency:</strong> Clients within the same ICP should receive remarkably similar experiences, regardless of team interaction points.</p>\n<h3>Business Development Targets</h3>\n<ul>\n<li>Increase qualified lead conversion by 35%</li>\n<li>Reduce client acquisition cost for ICP segments</li>\n<li>Improve average client lifetime value</li>\n<li>Strengthen referral pipeline within target industries</li>\n</ul>\n<h3>Service Excellence Benchmarks</h3>\n<ul>\n<li>95% client satisfaction within ICP segments</li>\n<li>90%+ retention rate for ideal clients</li>\n<li>Premium pricing capability through specialized expertise</li>\n</ul>\n<h2>Client Qualification Framework</h2>\n<h3>Primary Qualification Criteria</h3>\n<p><strong>Revenue Range:</strong> $500K - $10M annually<br><em>Sweet spot for businesses past survival mode but not yet requiring enterprise-level complexity</em></p>\n<p><strong>Growth Stage:</strong> Scaling phase or established with expansion plans<br><em>Look for hiring, geographic expansion, new products, or capital raising activities</em></p>\n<p><strong>Complexity Indicators:</strong></p>\n<ul>\n<li>Multi-entity structures</li>\n<li>Equity compensation plans</li>\n<li>Investment portfolios</li>\n<li>Multi-state operations</li>\n</ul>\n<p><strong>Geographic Focus:</strong> States where we maintain licensing and regulatory expertise</p>\n<h3>Secondary Success Indicators</h3>\n<p><strong>Technology Adoption:</strong> Modern software solutions, professional web presence, digital tool embrace</p>\n<p><strong>Forward-Thinking Approach:</strong> Asks strategic questions about tax implications, growth strategies, and financial optimization</p>\n<p><strong>Partnership Mentality:</strong> Values strategic guidance over commodity services and invests accordingly</p>\n<p><strong>Professional Communication:</strong> Prompt responses, meeting preparation, timely information provision</p>\n<h2>ICP Deep Dive: Tech Founders &amp; Startup Executives</h2>\n<h3>Profile Characteristics</h3>\n<p><strong>Company Stage:</strong> Seed to Series B funding rounds</p>\n<p><strong>Key Indicators:</strong></p>\n<ul>\n<li>Stock option plans or equity compensation structures</li>\n<li>R&amp;D tax credit opportunities</li>\n<li>Multi-state sales tax obligations</li>\n<li>VC or angel investor relationships requiring sophisticated reporting</li>\n</ul>\n<h3>Primary Pain Points</h3>\n<ul>\n<li>409A valuations and constantly evolving equity compliance</li>\n<li>Personal tax complexity from stock options and equity events</li>\n<li>Financial reporting that satisfies GAAP and investor expectations</li>\n<li>Cash flow management during high-growth phases</li>\n</ul>\n<h3>Discovery Questions</h3>\n<blockquote>\n<p>"What stage is your company in, and what are your next 12-18 month milestones?"</p>\n<p>"How are you currently handling your 409A valuations and equity reporting?"</p>\n<p>"What financial reporting requirements do your investors have?"</p>\n</blockquote>\n<h3>Example Opener</h3>\n<p><em>"I noticed [Company] just announced Series A funding&mdash;congratulations! Many tech founders we work with find this growth stage brings new complexities around investor reporting and personal tax planning. Are you experiencing similar challenges?"</em></p>\n<h3>Value Proposition</h3>\n<ul>\n<li><strong>Startup-Specific Expertise:</strong> R&amp;D credits, equity compensation, investor-ready reporting</li>\n<li><strong>Strategic CFO Guidance:</strong> Fractional expertise that scales with growth</li>\n<li><strong>Integrated Tax Strategy:</strong> Coordinated personal and business optimization</li>\n</ul>\n<h2>ICP Deep Dive: Real Estate Investors &amp; Developers</h2>\n<h3>Profile Characteristics</h3>\n<p><strong>Portfolio Size:</strong> 5+ properties or $2M+ in real estate assets</p>\n<p><strong>Key Indicators:</strong></p>\n<ul>\n<li>Multiple LLC structures for holdings</li>\n<li>1031 exchange activity or planning</li>\n<li>Short-term rental income streams</li>\n<li>Real estate professional status considerations</li>\n</ul>\n<h3>Primary Pain Points</h3>\n<ul>\n<li>Entity structure optimization for protection and tax efficiency</li>\n<li>Depreciation and cost segregation strategy maximization</li>\n<li>Multi-state tax compliance as portfolios expand</li>\n<li>Cash flow tracking across multiple properties and entities</li>\n</ul>\n<h3>Discovery Questions</h3>\n<blockquote>\n<p>"How many properties are in your portfolio, and what's your acquisition timeline?"</p>\n<p>"Are you taking advantage of cost segregation studies for depreciation benefits?"</p>\n<p>"How are you structuring entities for liability protection and tax efficiency?"</p>\n</blockquote>\n<h3>Example Opener</h3>\n<p><em>"I see you're active in the [City] real estate market. Many successful investors we work with discover significant tax savings through cost segregation and strategic entity structuring. Have you explored these strategies?"</em></p>\n<h3>Value Proposition</h3>\n<ul>\n<li><strong>Real Estate Tax Specialization:</strong> Cost segregation, bonus depreciation, 1031 exchanges</li>\n<li><strong>Entity Structuring Expertise:</strong> Liability protection with tax optimization</li>\n<li><strong>Multi-State Compliance:</strong> Seamless expansion support</li>\n</ul>\n<h2>ICP Deep Dive: Small Business Owners</h2>\n<h3>Profile Characteristics</h3>\n<p><strong>Business Type:</strong> Service-based or e-commerce companies with higher margins</p>\n<p><strong>Key Indicators:</strong></p>\n<ul>\n<li>$500K+ annual revenue with growth trajectory</li>\n<li>5-50 employees in scaling phase</li>\n<li>Multiple revenue streams or market expansion plans</li>\n<li>Technology-forward operations</li>\n</ul>\n<h3>Primary Pain Points</h3>\n<ul>\n<li>Scalable financial systems that grow with the business</li>\n<li>Tax planning for growth and owner compensation optimization</li>\n<li>Employee vs. contractor classification compliance</li>\n<li>Multi-state sales tax compliance for e-commerce</li>\n</ul>\n<h3>Discovery Questions</h3>\n<blockquote>\n<p>"What systems track your financial performance, and how often do you review them?"</p>\n<p>"What financial challenges have become more complex as you've grown?"</p>\n<p>"What are your scaling plans for the next 2-3 years?"</p>\n</blockquote>\n<h3>Example Opener</h3>\n<p><em>"I noticed [Business] has been expanding rapidly. Many business owners at your stage find their accounting needs have outgrown current solutions. Are you experiencing any growing pains with financial systems?"</em></p>\n<h3>Value Proposition</h3>\n<ul>\n<li><strong>Growth-Focused Systems:</strong> Technology solutions that scale with success</li>\n<li><strong>Strategic Tax Planning:</strong> Optimization strategies beyond basic compliance</li>\n<li><strong>Business Advisory Services:</strong> CFO-level guidance for growth decisions</li>\n</ul>\n<h2>Success Metrics &amp; Benchmarks</h2>\n<h3>Target Conversion Metrics by ICP</h3>\n<p><strong>Tech Founders:</strong></p>\n<ul>\n<li>45-day average sales cycle</li>\n<li>35% conversion rate</li>\n<li>Rationale: Growth urgency drives faster decisions</li>\n</ul>\n<p><strong>Real Estate Investors:</strong></p>\n<ul>\n<li>30-day average sales cycle</li>\n<li>40% conversion rate</li>\n<li>Rationale: Numbers-driven, decisive decision makers</li>\n</ul>\n<p><strong>Small Business Owners:</strong></p>\n<ul>\n<li>60-day average sales cycle</li>\n<li>30% conversion rate</li>\n<li>Rationale: More deliberate evaluation process</li>\n</ul>\n<h3>Quality Benchmarks</h3>\n<ul>\n<li><strong>Lead Quality Score:</strong> 70% of leads align with ICP criteria</li>\n<li><strong>Client Satisfaction:</strong> 95% within ICP segments</li>\n<li><strong>Retention Rate:</strong> 90%+ for ideal clients</li>\n<li><strong>Referral Generation:</strong> 2+ referrals per satisfied ICP client annually</li>\n</ul>\n<h2>Implementation Action Items</h2>\n<h3>Immediate Actions (Next 30 Days)</h3>\n<ol>\n<li><strong>CRM Setup:</strong> Configure lead scoring based on ICP criteria</li>\n<li><strong>Team Training:</strong> Conduct ICP workshop with all client-facing staff</li>\n<li><strong>Content Audit:</strong> Review existing materials for ICP alignment</li>\n<li><strong>Referral Partner Education:</strong> Brief current partners on ideal client profiles</li>\n</ol>\n<h3>Ongoing Activities</h3>\n<ol>\n<li><strong>Weekly Pipeline Review:</strong> Assess lead quality against ICP criteria</li>\n<li><strong>Monthly Conversion Analysis:</strong> Track metrics by ICP segment</li>\n<li><strong>Quarterly Strategy Refinement:</strong> Adjust profiles based on market feedback</li>\n<li><strong>Semi-Annual Profile Review:</strong> Validate ICPs against business results</li>\n</ol>\n<h2>Compliance Notes</h2>\n<p><strong>Disclaimer:</strong> This document contains internal strategic guidance and should not be shared with clients or prospects without management approval. All client examples and case studies referenced must comply with confidentiality agreements and privacy requirements.</p>\n<p><strong>Data Protection:</strong> When implementing CRM tracking and lead scoring, ensure all prospect and client information handling complies with applicable privacy regulations and Seed Financial data protection policies.</p>\n<p><strong>State Licensing:</strong> Always verify current licensing status before engaging prospects in states where specialized knowledge is claimed. Refer to current licensing matrix for geographic service boundaries.</p>\n<hr>\n<p><em>Questions about ICP implementation or need clarification on specific scenarios? Contact the Business Development team or your direct supervisor for guidance.</em></p>	21	3	draft	f	{ideal-client-profiles,sales-strategy,client-qualification,business-development,target-market}	0	\N	\N	\N	\N	\N	2025-07-31 03:20:27.826467	2025-07-31 03:20:27.826467
18	What Makes Seed Financial Different?	what-makes-seed-financial-different-1753936284810	Complete sales framework for positioning Seed Financial's tech-forward approach against traditional accounting firms, with proven scripts and objection handling.	<h1>Sales Guide: Positioning Seed Financial Against Traditional Accounting Firms</h1>\n<p><strong>Target Prospect:</strong> Business owners currently working with traditional accounting firms who are experiencing growth friction or service limitations.</p>\n<h2>The Sales Conversation Framework</h2>\n<h3>Opening Value Proposition</h3>\n<p>"Most accounting firms are still operating like it's 2005&mdash;relying on desktop software, email chains, and reactive number-crunching. But your prospects need a financial partner that moves at the speed of modern commerce. That's exactly what we deliver at Seed Financial."</p>\n<h3>The Core Differentiation Message</h3>\n<p>We're not just accountants&mdash;we're financial growth partners who happen to be really good with numbers. While competitors shuffle paper and email spreadsheets, we've built our entire practice on technology that delivers real-time visibility and lightning-fast processes that keep pace with business decisions.</p>\n<h2>Four Key Selling Points (The Pillars)</h2>\n<h3>1. Tech-Forward Foundation</h3>\n<p><strong>What to emphasize:</strong> Real-time financial visibility vs. month-old historical data</p>\n<p><strong>Client pain points this solves:</strong></p>\n<ul>\n<li>"I never know where I stand financially until it's too late"</li>\n<li>"Getting answers from my accountant takes forever"</li>\n<li>"My financial data is scattered across different systems"</li>\n</ul>\n<p><strong>Proof point:</strong> E-commerce client caught 40% spike in returns during Black Friday weekend through our integrated dashboard&mdash;adjusted marketing spend same day, preventing cash flow crunch that traditional reporting would have missed for weeks.</p>\n<p><strong>Objection handling:</strong></p>\n<ul>\n<li><em>"We already have QuickBooks"</em> &rarr; "Perfect! We integrate seamlessly with QB and 50+ other platforms you're probably already using. Instead of replacing what works, we connect everything together."</li>\n<li><em>"Cloud-based makes me nervous"</em> &rarr; "Bank-level security with 24/7 access. Most clients find it more reliable than desktop software that crashes or gets corrupted."</li>\n</ul>\n<h3>2. Speed Advantage</h3>\n<p><strong>What to emphasize:</strong> 5-7 day month-end close vs. industry standard 15-30 days</p>\n<p><strong>Client pain points this solves:</strong></p>\n<ul>\n<li>"By the time I get my financials, they're useless for decision-making"</li>\n<li>"I can't respond quickly to opportunities or problems"</li>\n<li>"Cash flow surprises keep blindsiding me"</li>\n</ul>\n<p><strong>Proof point:</strong> SaaS client needed investor-ready financials for unexpected funding opportunity. Previous firm would have needed two weeks&mdash;we delivered in 48 hours, helping close $2M Series A ahead of schedule.</p>\n<h3>3. White-Glove Onboarding</h3>\n<p><strong>What to emphasize:</strong> 30-day seamless transition with zero business downtime</p>\n<p><strong>Client pain points this solves:</strong></p>\n<ul>\n<li>"Switching accountants is too much hassle"</li>\n<li>"I can't afford to lose historical data or have gaps"</li>\n<li>"My team doesn't have time to learn new systems"</li>\n</ul>\n<p><strong>Objection handling:</strong></p>\n<ul>\n<li><em>"We don't want to disrupt our current processes"</em> &rarr; "That's exactly why we built this onboarding system. No disruption, no lost data, no learning curve for your team."</li>\n<li><em>"What if something goes wrong during transition?"</em> &rarr; "Dedicated onboarding specialist, parallel processing for accuracy verification, and detailed documentation. Plus, we've never had a client lose data during our 30+ successful transitions."</li>\n</ul>\n<h3>4. Strategic Partnership</h3>\n<p><strong>What to emphasize:</strong> Forward-looking financial planning vs. reactive tax-season conversations</p>\n<p><strong>Client pain points this solves:</strong></p>\n<ul>\n<li>"My accountant only talks to me during tax season"</li>\n<li>"I get no strategic guidance, just compliance work"</li>\n<li>"I feel like I'm flying blind on financial decisions"</li>\n</ul>\n<p><strong>Proof point:</strong> During routine monthly review, we noticed client's profit margins tightening due to rising material costs. Helped implement dynamic pricing and renegotiate supplier terms, protecting $180K in annual profit before the squeeze became critical.</p>\n<h2>Objection Handling Guide</h2>\n<h3>Price Concerns</h3>\n<p><strong>Objection:</strong> "Your service sounds expensive"</p>\n<p><strong>Response:</strong> "Let me show you the real math. Traditional firms charge you for accounting, then you buy software separately, then you still need someone to connect the dots strategically. Our transparent pricing includes everything&mdash;technology access, integrations, strategic guidance."</p>\n<h3>Switching Concerns</h3>\n<p><strong>Objection:</strong> "We've been with our current firm for years"</p>\n<p><strong>Response:</strong> "Loyalty is admirable, but is it costing you growth? The question isn't how long you've been together&mdash;it's whether they're equipped for where you're going."</p>\n<h3>Technology Skepticism</h3>\n<p><strong>Objection:</strong> "We prefer working with people, not computers"</p>\n<p><strong>Response:</strong> "So do we! That's exactly why we use technology&mdash;to eliminate the busy work so we can focus on strategic conversations that actually move your business forward."</p>\n<h2>Closing Strategies</h2>\n<h3>The Opportunity Cost Close</h3>\n<p>"The real question isn't whether you can afford to work with us&mdash;it's whether you can afford to keep making decisions with outdated information while your competitors move faster."</p>\n<h3>The Risk Reversal Close</h3>\n<p>"Let's schedule a 30-minute consultation where we assess your current setup and identify specific opportunities for improvement. No sales pressure, no obligation&mdash;just honest evaluation."</p>\n<h2>Package Positioning</h2>\n<h3>Entry Level (Under $1M Revenue)</h3>\n<ul>\n<li>Focus on automation and time-saving</li>\n<li>Emphasize growth preparation</li>\n<li>Position as "enterprise tools at startup prices"</li>\n</ul>\n<h3>Growth Stage ($1M-$5M Revenue)</h3>\n<ul>\n<li>Focus on strategic guidance and scalability</li>\n<li>Emphasize cash flow optimization</li>\n<li>Position as "fractional CFO capabilities"</li>\n</ul>\n<h3>Established ($5M+ Revenue)</h3>\n<ul>\n<li>Focus on sophisticated reporting and analysis</li>\n<li>Emphasize strategic partnership and network access</li>\n<li>Position as "complete financial leadership solution"</li>\n</ul>\n<p><strong>Key Takeaway:</strong> We're not competing on price&mdash;we're competing on value, speed, and strategic partnership. Every conversation should focus on the cost of status quo vs. the opportunity of upgrading to a modern financial partnership.</p>	21	3	published	f	{sales-guide,competitive-positioning,client-acquisition,value-proposition,objection-handling}	0	\N	\N	\N	\N	\N	2025-07-31 04:31:26.175021	2025-07-31 23:12:51.494
8	Bookkeeping 101 (For Salespeople)	bookkeeping-101-for-salespeople	Complete sales guide for positioning bookkeeping services, featuring proven objection handling, discovery questions, and value-based pricing strategies.	<h1>Bookkeeping 101: Your Complete Sales Guide</h1>\n<p><strong>Document Type:</strong> Internal Sales Training<br><strong>Target Team:</strong> Sales Team<br><strong>Last Reviewed:</strong> July 2025</p>\n<hr>\n<h2>What Bookkeeping Actually Is (And Why Every Client Needs It)</h2>\n<p>When prospects hear "bookkeeping," they picture dusty ledgers and endless spreadsheets. Here's the reality: bookkeeping is organized financial record-keeping that transforms business chaos into clarity.</p>\n<p><strong>The elevator pitch:</strong> "Imagine driving without a dashboard&mdash;no speedometer, fuel gauge, or warning lights. That's running your business without proper bookkeeping."</p>\n<h3>The Three Pillars of Bookkeeping</h3>\n<p>Every effective bookkeeping system delivers:</p>\n<ul>\n<li><strong>Transaction recording</strong> &ndash; Capturing every dollar in and out</li>\n<li><strong>Smart categorization</strong> &ndash; Organizing expenses for maximum tax benefit</li>\n<li><strong>Accuracy assurance</strong> &ndash; Reconciling accounts so everything balances</li>\n</ul>\n<h3>Why Small Businesses Struggle (And How We Help)</h3>\n<p>The "shoebox method" creates expensive problems:</p>\n<ul>\n<li><strong>Compliance nightmares:</strong> IRS requires organized records for 3-7 years</li>\n<li><strong>Lost money:</strong> Missed deductions average $3,000-$8,000 annually for small businesses</li>\n<li><strong>Decision paralysis:</strong> No visibility into real profitability or cash flow</li>\n</ul>\n<blockquote>\n<p><strong>Client Success Story:</strong> A contractor lost $5,000 in equipment deductions during an IRS audit&mdash;simply because he couldn't locate receipts. That single mistake cost $1,250 in additional taxes, more than our annual bookkeeping fee.</p>\n</blockquote>\n<h2>The Business Impact: Beyond Organized Records</h2>\n<p>Don't sell bookkeeping features. Sell the outcomes that transform businesses.</p>\n<h3>Financial Clarity That Drives Decisions</h3>\n<p><strong>Real-time profit visibility</strong> eliminates guesswork. A restaurant client discovered their most popular dish was actually losing money once we tracked true food costs and labor. They adjusted pricing and improved monthly profits by $2,000.</p>\n<p><strong>Predictable cash flow management</strong> prevents crises. Our construction client was heading toward seasonal bankruptcy until our books revealed payment patterns, enabling better supplier negotiations and cash flow planning.</p>\n<h3>Tax Benefits That Pay for Themselves</h3>\n<p><strong>Audit protection</strong> reduces IRS examination time by 60% and virtually eliminates penalties for poor record-keeping.</p>\n<p><strong>Maximum deductions</strong> often exceed service costs. A consulting client was missing $2,400 in home office deductions annually&mdash;our first month identified enough missed deductions to cover the entire year's fees.</p>\n<h3>Growth Enablement</h3>\n<p>Clean books enable <strong>strategic scaling</strong>. When clients know their true customer acquisition costs and most profitable services, they grow strategically instead of guessing.</p>\n<p><strong>Investor readiness</strong> becomes automatic. Banks and investors need financial statements, not shoeboxes. Proper bookkeeping means capitalizing on opportunities without scrambling to organize years of records.</p>\n<h3>The Peace of Mind Factor</h3>\n<p>Never underestimate psychological benefits. Business owners consistently report better sleep and reduced stress once their books are organized. There's professional credibility in answering financial questions immediately and accurately.</p>\n<h2>Our Process: Setting Client Expectations</h2>\n<p>Understanding our systematic approach helps you address concerns about financial control and set proper expectations.</p>\n<h3>The Monthly Cycle</h3>\n<ol>\n<li><strong>Automated import:</strong> Direct bank and credit card connections</li>\n<li><strong>Smart categorization:</strong> Client-specific chart of accounts</li>\n<li><strong>Precision reconciliation:</strong> Everything balances, discrepancies resolved</li>\n<li><strong>Actionable reporting:</strong> P&amp;L, balance sheet, and cash flow insights</li>\n</ol>\n<h3>Technology Integration</h3>\n<p>We integrate with <strong>QuickBooks Online and Xero</strong> for industry-standard access. <strong>Mobile receipt capture</strong> syncs photos directly to books. <strong>Bank automation</strong> eliminates manual entry while <strong>visual dashboards</strong> provide instant business insights.</p>\n<h3>Quality Assurance</h3>\n<p>Every client benefits from our <strong>double-entry verification system</strong>, <strong>senior bookkeeper reviews</strong>, and <strong>transparent approval processes</strong> for unusual transactions.</p>\n<h2>Sales Strategy: Positioning for Success</h2>\n<h3>Discovery Questions That Uncover Pain</h3>\n<p>Ask these to create urgency:</p>\n<ul>\n<li>"How do you currently track business expenses?" <em>(Often reveals chaos)</em></li>\n<li>"When did you last run a profit and loss report?" <em>(Many never have)</em></li>\n<li>"How long does tax preparation take you?" <em>(Usually weeks of stress)</em></li>\n<li>"Have you been surprised by your tax bill?" <em>(Creates emotional connection)</em></li>\n</ul>\n<h3>Value-Based Pricing Presentation</h3>\n<p><strong>Start with pain:</strong> "You spend 10 hours monthly organizing receipts. What's your hourly rate as a business owner?"</p>\n<p><strong>Use cost of inaction:</strong> "One missed equipment depreciation deduction often exceeds our entire annual fee."</p>\n<p><strong>Position as investment:</strong> Present monthly retainer as predictable investment versus hourly chaos.</p>\n<h3>Objection Handling</h3>\n<p><strong>"I can do it myself"</strong><br><em>"Absolutely, you can. The question is whether you should. Is spending 10 hours monthly on bookkeeping the best use of your $100+ hourly rate, or would those hours generate more revenue serving customers?"</em></p>\n<p><strong>"It's too expensive"</strong><br><em>"Have you ever missed a tax deduction because records weren't organized? One missed equipment or home office expense often pays for months of professional bookkeeping. This isn't an expense&mdash;it's an ROI-positive investment."</em></p>\n<p><strong>"I don't have many transactions"</strong><br><em>"It's about accuracy and strategic planning, not volume. Even with few transactions, improper categorization costs money. Plus, you'll have scalable systems in place as you grow instead of scrambling later."</em></p>\n<h2>Advanced Sales Tactics</h2>\n<h3>Positioning Strategies</h3>\n<ul>\n<li><strong>Lead with outcomes:</strong> Don't explain double-entry accounting; explain instant profitability insights</li>\n<li><strong>Leverage success stories:</strong> Use anonymized client examples demonstrating real results</li>\n<li><strong>Connect to goals:</strong> Show how clean books enable their expansion plans</li>\n<li><strong>Emphasize partnership:</strong> We provide strategic insights, not just data processing</li>\n</ul>\n<h3>Presentation Best Practices</h3>\n<p><strong>Visual demonstrations work:</strong> Show examples of messy versus organized books side-by-side.</p>\n<p><strong>Use their numbers:</strong> "Based on your revenue, you likely have 150 monthly transactions. Organizing those properly takes 8 hours&mdash;what's your time worth?"</p>\n<p><strong>Leverage timing:</strong> During tax season, emphasize stress reduction. During planning periods, focus on strategic deduction identification.</p>\n<h3>Follow-Up Excellence</h3>\n<ul>\n<li>Send anonymized sample reports from similar businesses</li>\n<li>Provide bookkeeping health assessment checklist</li>\n<li>Offer trial month for hesitant prospects&mdash;we're confident in our results</li>\n</ul>\n<h3>Cross-Selling Opportunities</h3>\n<p>Bookkeeping naturally leads to:</p>\n<ul>\n<li><strong>Payroll services</strong> (we know their financial capacity)</li>\n<li><strong>Tax planning</strong> (quarterly reviews using clean data)</li>\n<li><strong>Business advisory</strong> (strategic insights from organized financials)</li>\n</ul>\n<h2>Managing Expectations and Limitations</h2>\n<p>Setting realistic expectations prevents problems and builds trust.</p>\n<h3>Service Boundaries</h3>\n<ul>\n<li><strong>We organize and categorize</strong>&mdash;we don't audit business validity of transactions</li>\n<li><strong>Client responsibility</strong> includes providing complete information</li>\n<li><strong>Industry specialists</strong> may be needed for complex situations (we'll identify and refer)</li>\n</ul>\n<h3>Common Misconceptions to Address</h3>\n<p><strong>"Bookkeeping equals tax prep":</strong> We organize information; tax preparation uses that data for filing.</p>\n<p><strong>"Monthly books mean monthly taxes":</strong> Most businesses pay quarterly, but monthly books provide ongoing strategic insights.</p>\n<p><strong>"Perfect books prevent all tax issues":</strong> We minimize problems significantly but can't eliminate every possibility.</p>\n<h3>Red Flags and Referral Situations</h3>\n<p><strong>When to refer out:</strong></p>\n<ul>\n<li>Complex multi-state operations requiring specialized expertise</li>\n<li>Inventory-heavy businesses needing advanced systems</li>\n<li>High-volume operations requiring different pricing structures</li>\n</ul>\n<p><strong>Warning signs:</strong></p>\n<ul>\n<li>Cash-only businesses with unusual patterns</li>\n<li>Reluctance to provide bank access</li>\n<li>Unrealistic time or cost expectations</li>\n</ul>\n<h2>Action Items</h2>\n<h3>Immediate Next Steps</h3>\n<p><strong>For Sales Team:</strong></p>\n<ul>\n<li>Review client list for bookkeeping opportunities&mdash;focus on those spending significant time on financial organization</li>\n<li>Practice objection handling with your manager until responses feel natural</li>\n<li>Identify 3 current clients needing bookkeeping and schedule discovery calls this week</li>\n<li>Follow up with prospects who previously declined bookkeeping services</li>\n</ul>\n<p><strong>For Client Success:</strong></p>\n<ul>\n<li>Prepare streamlined onboarding checklist for smooth transitions</li>\n<li>Create expectation-setting document addressing common concerns</li>\n<li>Develop monthly communication templates for ongoing updates</li>\n</ul>\n<h2>Compliance and Legal Considerations</h2>\n<h3>Required Disclaimers</h3>\n<p><strong>This document is for internal training use only.</strong> All client examples must be anonymized and approved before external use. Sales manager approval required for specific client case studies in presentations.</p>\n<p><strong>Confidentiality reminder:</strong> Maintain strict confidentiality when discussing client situations, even internally. Always verify current pricing and service offerings before client presentations.</p>\n<p><strong>Professional boundaries:</strong> We provide bookkeeping services, not legal, tax, or investment advice. Refer clients to appropriate professionals when questions exceed our scope.</p>\n<hr>\n<p><strong>Need Support?</strong> Contact the Sales Training Team for objection handling practice or the Compliance Officer for case study approvals.</p>\n<p><strong>Related Resources:</strong></p>\n<ul>\n<li><a href="sales-playbook">Sales Playbook</a> for additional positioning strategies</li>\n<li><a href="client-success">Client Success Team</a> for onboarding best practices</li>\n<li><a href="compliance-guidelines">Compliance Guidelines</a> for boundary questions</li>\n</ul>\n<p><em>Document Owner: Sales Training Team | Next Review: March 2025 | Version 1.1</em></p>\n<p><strong>Internal Use Only - Confidential and Proprietary Information</strong></p>	21	3	published	t	{sales-training,bookkeeping-services,objection-handling,value-based-pricing,client-discovery}	0	\N	\N	\N	\N	\N	2025-07-30 04:59:10.857255	2025-07-31 22:38:50.061
20	The Seed Financial Winning Story	the-seed-financial-winning-story-1754004777261	Transform tax strategy from reactive annual chaos to proactive year-round partnerships with our proven TaaS sales methodology.	<h1>The Seed Financial Sales Playbook: Breaking the Groundhog Day Cycle</h1>\n<h2>I. The Market Reality</h2>\n<h3>A. The Traditional Accounting Problem</h3>\n<p><strong>Welcome to Annual Groundhog Day</strong></p>\n<p>Picture this: It's April again, and you're sitting across from your CPA with the same shocked expression as last year. They slide a tax bill across the desk, followed by their own invoice, and deliver the familiar refrain: "Here's what you did wrong, and here's what you owe."</p>\n<p>You nod politely, take mental notes about quarterly payments and expense tracking, promise to do better, and walk out determined to change. Fast-forward twelve months&mdash;same chair, same conversation, same surprised expression.</p>\n<p>This reactive approach creates a predictable cycle:</p>\n<ul>\n<li>Once-yearly meetings focused on past mistakes</li>\n<li>Bills, blame, and basic advice delivered too late to matter</li>\n<li>Clients forget guidance and repeat the same patterns</li>\n<li>Everyone stays frustrated, nothing fundamentally changes</li>\n</ul>\n<h3>B. Our Target Market's Pain Points</h3>\n<p>Our prospects live in this reactive nightmare:</p>\n<ul>\n<li><strong>Founders</strong> make equity decisions without understanding tax implications until filing season</li>\n<li><strong>Business owners</strong> execute financial moves in isolation, discovering consequences months later</li>\n<li><strong>High-income professionals</strong> overpay taxes due to lack of strategic planning</li>\n<li><strong>Everyone</strong> faces surprise tax bills and retroactive "advice" that arrives too late</li>\n</ul>\n<p>The common thread? They're all playing defense in a game that rewards offense.</p>\n<h3>C. Seed Financial's Strategic Position</h3>\n<p><strong>Founded in 2023 to solve this exact problem</strong></p>\n<p>We didn't create another accounting firm&mdash;we reimagined how tax strategy works.</p>\n<p><strong>The TaaS Revolution</strong>: Our Tax-as-a-Service (trademarked by the way) model transforms the traditional relationship from annual transactions to year-round partnerships.</p>\n<p><strong>Proactive vs. Reactive</strong>: Instead of filing what happened, we help shape what happens next. Instead of annual cleanup, we provide ongoing optimization.</p>\n<h2>II. Sales Objectives</h2>\n<h3>A. Primary Goals</h3>\n<ul>\n<li><strong>Position Seed Financial as the strategic partner</strong>, not just another service provider</li>\n<li><strong>Demonstrate clear ROI</strong> through measurable tax savings that exceed our fees</li>\n<li><strong>Convert cost-center thinking</strong> to investment mindset</li>\n</ul>\n<h3>B. Service Excellence Goals</h3>\n<ul>\n<li><strong>Establish year-round touchpoints</strong> that deliver consistent value beyond tax season</li>\n<li><strong>Build trust through transparent communication</strong> and proactive recommendations</li>\n<li><strong>Create measurable outcomes</strong> that justify our flat-rate pricing</li>\n</ul>\n<h3>C. Relationship Building Goals</h3>\n<ul>\n<li><strong>Transform clients from passive recipients</strong> to active participants in tax strategy</li>\n<li><strong>Position our team as trusted advisors</strong> who understand their business</li>\n<li><strong>Foster long-term partnerships</strong> that grow with their success</li>\n</ul>\n<h2>III. The Sales Process</h2>\n<h3>A. Discovery Phase</h3>\n<p><strong>Uncover Current Pain Points</strong></p>\n<ul>\n<li>Map their existing accounting relationship and satisfaction level</li>\n<li>Identify specific tax surprises or missed opportunities from the past</li>\n<li>Quantify current reactive costs (penalties, overpayments, stress, lost time)</li>\n</ul>\n<p><strong>Assess Strategic Opportunity</strong></p>\n<ul>\n<li>Review income sources and complexity level</li>\n<li>Evaluate investment portfolio and business structure</li>\n<li>Identify 2-3 immediate quick wins for credibility building</li>\n</ul>\n<p><em>Power Discovery Questions:</em></p>\n<ul>\n<li>"What was your biggest tax surprise last year?"</li>\n<li>"When did your CPA last call you with a proactive suggestion?"</li>\n<li>"How much time did you spend gathering documents for filing?"</li>\n<li>"What financial decision are you avoiding because you're unsure about tax implications?"</li>\n</ul>\n<h3>B. Presentation Phase</h3>\n<p><strong>Tell the Groundhog Day Story</strong></p>\n<ul>\n<li>Open with a relatable scenario from their specific industry</li>\n<li>Contrast their current reactive approach with our proactive model</li>\n<li>Present TaaS as the solution that breaks the cycle</li>\n</ul>\n<p><strong>Demonstrate Clear Value</strong></p>\n<ul>\n<li>Show specific examples of proactive strategies for similar clients</li>\n<li>Calculate potential savings compared to their current approach</li>\n<li>Explain how flat-rate transparency eliminates surprise billing</li>\n</ul>\n<p><em>Proven Presentation Flow:</em></p>\n<ol>\n<li>"Sound familiar?" (Share Groundhog Day story)</li>\n<li>"Here's what's possible instead..." (Introduce TaaS model)</li>\n<li>"This client saved $15,000 by implementing quarterly estimated payment strategy..." (Provide proof)</li>\n<li>"Here's exactly how it works..." (Explain process)</li>\n</ol>\n<h3>C. Closing Phase</h3>\n<p><strong>Address Implementation</strong></p>\n<ul>\n<li>Outline clear onboarding process and first 90-day plan</li>\n<li>Set realistic expectations for year-round engagement frequency</li>\n<li>Establish preferred communication methods and response times</li>\n</ul>\n<p><strong>Transition to Partnership</strong></p>\n<ul>\n<li>Position signing as the start of their strategic transformation</li>\n<li>Create urgency around timing: "The sooner we start, the more opportunities we'll catch"</li>\n<li>Reinforce investment mindset over cost mindset</li>\n</ul>\n<h2>IV. Proven Scripts and Templates</h2>\n<h3>A. Opening Hook Scripts</h3>\n<p><strong>For Founders:</strong></p>\n<blockquote>"Most founders I meet are brilliant at building companies but accidentally terrible at tax strategy. They make equity decisions in January that cost them thousands in April&mdash;and they never see it coming. Sound familiar?"</blockquote>\n<p><strong>For Business Owners:</strong></p>\n<blockquote>"Here's a question: When was the last time your accountant called YOU with an idea to save money? If the answer is never, you're paying for filing, not strategy."</blockquote>\n<p><strong>For High-Income Professionals:</strong></p>\n<blockquote>"You wouldn't manage your investments with annual check-ins, so why manage your taxes that way? Your CPA files returns&mdash;we build strategies."</blockquote>\n<h3>B. Value Proposition Framework</h3>\n<p><strong>The Four-Part Formula:</strong></p>\n<ul>\n<li><strong>Problem</strong>: "You're stuck in reactive mode, playing defense with your taxes..."</li>\n<li><strong>Solution</strong>: "TaaS gives you year-round strategic partnership that gets ahead of your liability..."</li>\n<li><strong>Proof</strong>: "Here's how we helped a similar client save $25,000 by implementing tax-loss harvesting..."</li>\n<li><strong>Process</strong>: "It works like this: quarterly strategy sessions, monthly check-ins, and immediate support for decisions..."</li>\n</ul>\n<h2>&nbsp;</h2>\n<h2>V. Objection Handling Mastery</h2>\n<h3>A. "My current CPA is fine"</h3>\n<p><strong>Response:</strong></p>\n<blockquote>"I'm sure they are&mdash;for filing returns. But let me ask: when did they last call you with a proactive strategy to reduce next year's taxes? Fine is the enemy of great, especially when it comes to keeping your money."</blockquote>\n<p><strong>Follow-up Questions:</strong></p>\n<ul>\n<li>How much did you pay in taxes last year?</li>\n<li>Were there any surprises in that number?</li>\n<li>What strategic advice did you receive for this year?</li>\n</ul>\n<h3>B. "Your pricing seems high"</h3>\n<p><strong>Response:</strong></p>\n<blockquote>"I understand the initial reaction&mdash;most people think of accounting as a cost, not an investment. But here's the reality: if we save you more than our fee (which we will), you're actually making money by working with us. Plus, our flat rate means no surprise bills in April."</blockquote>\n<p><strong>Proof Points to Share:</strong></p>\n<ul>\n<li>Client who saved $18,000 on a $6,000 annual fee</li>\n<li>Monthly cost breakdown versus potential penalties/overpayments</li>\n<li>Traditional hourly CPA costs plus missed opportunity costs</li>\n</ul>\n<h3>C. "I don't need year-round service"</h3>\n<p><strong>Response:</strong></p>\n<blockquote>"That's exactly what everyone thinks&mdash;until they make a business decision in June that costs them thousands in taxes they could have avoided. Tax strategy isn't seasonal; your financial decisions happen year-round. Our job is to be there when you make them."</blockquote>\n<p><strong>Real Examples:</strong></p>\n<ul>\n<li>Founder who sold stock without proper tax-loss harvesting setup (cost: $12,000)</li>\n<li>Business owner who missed estimated quarterly payment deadline (penalty: $3,500)</li>\n<li>Professional who took year-end bonus in wrong tax year (additional tax: $8,000)</li>\n</ul>\n<h3>D. "I can handle this myself with software"</h3>\n<p><strong>Response:</strong></p>\n<blockquote>"Software is excellent for simple returns, but it can't call you in November to suggest a Roth conversion or warn you about the tax implications of that equipment purchase. It files what you did&mdash;it doesn't help you do better."</blockquote>\n<p><strong>Key Differentiators:</strong></p>\n<ul>\n<li>Strategic planning versus basic compliance</li>\n<li>Proactive recommendations versus reactive reporting</li>\n<li>Human expertise for complex situations versus algorithms</li>\n</ul>\n<h2>VI. Powerful Call-to-Actions</h2>\n<h3>A. Discovery Call CTA</h3>\n<blockquote>"Let's spend 30 minutes reviewing your current situation. I'll show you at least one opportunity you're probably missing&mdash;no obligation, just insight."</blockquote>\n<h3>B. Follow-up CTA</h3>\n<blockquote>"Based on our conversation, I see a specific opportunity around [X]. Let me put together a brief analysis of what this could mean for your 2024 taxes. When works better&mdash;Tuesday or Thursday?"</blockquote>\n<h3>C. Closing CTA</h3>\n<blockquote>"Ready to break the Groundhog Day cycle? Let's get your TaaS strategy started. The sooner we begin, the more opportunities we'll catch this year."</blockquote>\n<h2>VII. Compliance Excellence</h2>\n<h3>A. Service Representations</h3>\n<ul>\n<li>✅ Include "potential" qualifiers in all savings projections</li>\n<li>✅ Avoid guarantees of specific tax outcomes</li>\n<li>✅ Explain that results depend on individual circumstances</li>\n<li>✅ Document assumptions behind savings calculations</li>\n</ul>\n<h3>B. Pricing Transparency</h3>\n<ul>\n<li>✅ Provide clear, written fee structure documentation</li>\n<li>✅ Explain included services versus additional charges</li>\n<li>✅ Clarify any performance-based components</li>\n<li>✅ Include termination and refund policies</li>\n</ul>\n<h3>C. Professional Standards</h3>\n<ul>\n<li>✅ Maintain CPA ethics guidelines in all communications</li>\n<li>✅ Document all client interactions properly</li>\n<li>✅ Follow state licensing requirements for tax advice</li>\n<li>✅ Include appropriate disclaimers in marketing materials</li>\n</ul>\n<h2>Your Next Steps</h2>\n<p><strong>Start Today:</strong></p>\n<ul>\n<li><strong>Practice your opening hooks</strong> until they feel natural and conversational</li>\n<li><strong>Customize industry examples</strong> for each prospect type in your pipeline</li>\n<li><strong>Set up tracking systems</strong> for all key metrics outlined above</li>\n<li><strong>Review current prospects</strong> and identify which objections you're likely to face</li>\n</ul>\n<p><strong>Ongoing Excellence:</strong></p>\n<ul>\n<li>Follow up all discovery calls within 24 hours</li>\n<li>Document all client interactions for compliance and improvement</li>\n<li>Review and refine objection responses based on real prospect feedback</li>\n<li>Update savings examples quarterly with fresh case studies</li>\n</ul>\n<p><strong>Essential Resources:</strong></p>\n<ul>\n<li><a href="case-studies">Client Case Studies Library</a></li>\n<li><a href="pricing-templates">Pricing Guide Templates</a></li>\n<li><a href="crm-setup">CRM Setup Instructions</a></li>\n<li><a href="compliance-docs">Compliance Documentation</a></li>\n</ul>\n<h2>The Bottom Line</h2>\n<p>We're not just selling accounting services&mdash;we're offering liberation from the Groundhog Day cycle that keeps successful people stuck in reactive tax mode. Every conversation presents an opportunity to transform how someone thinks about their financial future.</p>\n<p>Remember: People don't buy what you do; they buy why you do it. We exist to break the cycle of tax surprises and reactive</p>	21	4	published	f	{sales-playbook,tax-as-a-service,client-acquisition,objection-handling,proactive-tax-strategy}	0	\N	\N	\N	\N	\N	2025-07-31 23:32:59.663718	2025-07-31 23:32:59.663718
\.


--
-- Data for Name: kb_bookmarks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kb_bookmarks (id, user_id, article_id, created_at) FROM stdin;
\.


--
-- Data for Name: kb_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kb_categories (id, name, slug, description, icon, color, parent_id, sort_order, is_active, created_at, updated_at) FROM stdin;
16	Getting Started Hub	getting-started	Quick-start guides for clients, partners, and internal teams	compass	from-blue-500 to-cyan-500	\N	1	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
17	Tax-as-a-Service (TaaS)	taas	Playbooks, FAQs, and tax strategy explainers	calculator	from-green-500 to-emerald-500	\N	2	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
18	Bookkeeping Academy	bookkeeping	Best practices, QBO hacks, and monthly close checklists	book-open	from-purple-500 to-indigo-500	\N	3	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
19	Fractional CFO Vault	cfo-vault	Cash-flow templates, scenario planning tools, fundraising resources	trending-up	from-orange-500 to-red-500	\N	4	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
20	Automation & AI Center	automation-ai	n8n recipes, ClickUp templates, HubSpot workflows, AI prompts libraries	brain-circuit	from-violet-500 to-purple-500	\N	5	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
21	Sales Playbook	sales-playbook	ICP criteria, outreach cadences, HubSpot playbooks, Seed Stories	target	from-pink-500 to-rose-500	\N	6	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
22	Compliance + Legal	compliance-legal	Entity structuring, sales tax rules, R&D credit eligibility	shield	from-gray-500 to-slate-500	\N	7	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
23	Toolbox	toolbox	Scenario simulators, tax calendar, client case studies	wrench	from-yellow-500 to-orange-500	\N	8	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
24	Culture & Voice	culture-voice	Brand tone, style guides, meme library for internal use	heart	from-pink-500 to-purple-500	\N	9	t	2025-07-29 05:10:54.139389	2025-07-29 05:10:54.139389
\.


--
-- Data for Name: kb_search_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kb_search_history (id, user_id, query, results_count, clicked_article_id, created_at) FROM stdin;
\.


--
-- Data for Name: milestone_bonuses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.milestone_bonuses (id, sales_rep_id, milestone_type, total_clients, bonus_amount, bonus_description, achieved_at, is_paid, paid_at) FROM stdin;
\.


--
-- Data for Name: monthly_bonuses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.monthly_bonuses (id, sales_rep_id, month, year, clients_closed, bonus_level, bonus_amount, bonus_description, is_paid, paid_at, created_at) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotes (id, contact_email, monthly_transactions, industry, cleanup_months, cleanup_complexity, monthly_fee, setup_fee, created_at, updated_at, archived, cleanup_override, override_reason, approval_required, hubspot_contact_id, hubspot_deal_id, hubspot_quote_id, hubspot_contact_verified, company_name, owner_id, quote_type, entity_type, num_entities, states_filed, international_filing, num_business_owners, bookkeeping_quality, include_1040s, prior_years_unfiled, already_on_seed_bookkeeping, taas_monthly_fee, taas_prior_years_fee, includes_bookkeeping, includes_taas, custom_num_entities, custom_states_filed, custom_num_business_owners, qbo_subscription, contact_first_name, contact_first_name_locked, contact_last_name, contact_last_name_locked, industry_locked, company_address_locked, monthly_revenue_range, service_bookkeeping, service_taas, service_payroll, service_ap_ar_lite, service_fpa_lite, client_street_address, client_city, client_state, client_zip_code, client_country, company_name_locked, accounting_basis, business_loans) FROM stdin;
35	mpkeller135@gmail.com	100-300	E-commerce/Retail	7	0.50	338.00	1375.00	2025-07-21 06:52:18.010586	2025-07-21 06:52:21.428	f	f		f	139242088883	40553400603	22230361933	t	Lancaster Indoor Golf & Training Center	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
5	ryan@lifewize.io	2000+	Software/SaaS	7	1.00	3600.00	25200.00	2025-07-20 21:35:55.157837	2025-07-20 22:16:17.839	t	f	\N	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
1	jon@lifewize.io	<100	Real Estate	7	0.75	920.00	5070.00	2025-07-20 20:51:17.72163	2025-07-21 03:05:13.046	t	f	\N	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
2	caseythedollar@gmail.com	<100	Software/SaaS	7	0.50	150.00	525.00	2025-07-20 20:51:58.297128	2025-07-21 03:06:14.403	t	f	\N	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
4	randall@seedfinancial.io	100-300	Software/SaaS	7	0.50	400.00	1400.00	2025-07-20 20:59:40.657258	2025-07-21 03:06:18.05	t	f	\N	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
3	jwalls2111@gmail.com	100-300	Software/SaaS	7	1.00	400.00	2800.00	2025-07-20 20:56:31.634851	2025-07-21 03:06:20.215	t	f	\N	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
6	randallrhall@gmail.com	<100	Professional Services	3	0.75	525.00	1300.00	2025-07-21 00:11:05.096831	2025-07-21 03:06:22.579	t	t	Negotiated Rate	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
7	jonwalls.ins@gmail.com	300-600	Professional Services	4	0.75	650.00	2150.00	2025-07-21 00:16:52.620659	2025-07-21 03:06:24.663	t	t	Books Confirmed Current	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
9	test-slack@example.com	<100	Software/SaaS	0	0.50	150.00	150.00	2025-07-21 00:23:21.097431	2025-07-21 03:06:32.476	t	t	Brand New Business	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
10	test-final@example.com	300-600	Real Estate	2	0.75	812.00	1600.00	2025-07-21 00:32:43.010078	2025-07-21 03:06:37.979	t	t	Negotiated Rate	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
11	test-private-channel@example.com	100-300	Construction/Trades	1	0.75	430.00	425.00	2025-07-21 00:39:13.093427	2025-07-21 03:06:41.04	t	t	Books Confirmed Current	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
12	test-restart@example.com	<100	Professional Services	0	0.50	150.00	150.00	2025-07-21 00:39:22.307027	2025-07-21 03:06:43.855	t	t	Brand New Business	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
13	jonwalls.ins@gmail.com	300-600	Software/SaaS	4	1.00	650.00	2600.00	2025-07-21 00:40:55.716164	2025-07-21 03:06:48.511	t	t	Negotiated Rate	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
14	test@mail.com	600-1000	Professional Services	2	0.50	950.00	1050.00	2025-07-21 02:22:15.98505	2025-07-21 03:07:10.605	t	t	Brand New Business	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
15	approval-test@example.com	<100	Professional Services	0	0.50	150.00	150.00	2025-07-21 02:24:27.928258	2025-07-21 03:07:19.043	t	t	Brand New Business	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
16	standard-test@example.com	<100	Professional Services	7	0.75	150.00	800.00	2025-07-21 02:24:33.936092	2025-07-21 03:11:07.692	t	f		f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
17	jonwalls.ins@gmail.com	100-300	Professional Services	7	0.50	250.00	975.00	2025-07-21 03:13:22.141838	2025-07-21 03:13:25.139	t	f		f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
18	curtis@1800millers.com	100-300	Construction/Trades	7	0.75	375.00	2150.00	2025-07-21 03:39:55.111495	2025-07-21 03:46:07.697	t	f		f	139590309128	40547824543	deal_40547824543	t	Millers Restoration	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
19	curtis@1800millers.com	300-600	Construction/Trades	7	0.75	975.00	5550.00	2025-07-21 03:46:32.966074	2025-07-21 03:53:49.492	f	f		f	139590309128	40545414683	22182622771	t	Millers Restoration	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
20	jamescristy@comcast.net	100-300	Real Estate	7	0.50	313.00	1175.00	2025-07-21 04:52:26.849253	2025-07-21 04:52:28.636	f	f		f	139108816004	40547924520	22231755352	t	True Grit American Bistro	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
21	ordermyboards@gmail.com	100-300	E-commerce/Retail	7	0.50	581.00	2350.00	2025-07-21 05:04:11.227923	2025-07-21 05:04:15.331	f	f		f	136279476859	40548091020	deal_40548091020	t	Order My Board	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
37	lucas@fhdmfg.com	100-300	Automotive	7	0.50	486.00	2475.00	2025-07-22 04:14:15.250528	2025-07-22 04:14:19.176	f	f		f	139762349663	40628851813	22302006554	t	FHD electronic	3	bookkeeping	LLC	1	1	f	2	Self-managed	t	2	t	136.00	1000.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
22	ordermyboards@gmail.com	100-300	E-commerce/Retail	7	0.75	581.00	3525.00	2025-07-21 05:07:08.496805	2025-07-21 05:07:10.318	f	f		f	136279476859	40547633263	deal_40547633263	t	Order My Board	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
23	ordermyboards@gmail.com	<100	E-commerce/Retail	7	0.75	709.00	4300.00	2025-07-21 05:09:41.135832	2025-07-21 05:09:43.234	f	f		f	136279476859	40547891556	22115729199	t	Order My Board	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
24	kota@kotainvestment.com	100-300	Multi-entity/Holding Companies	7	0.75	338.00	2225.00	2025-07-21 05:20:23.058367	2025-07-21 05:20:24.782	f	f		f	139728237145	40548092253	deal_40548092253	t	Kota Capital Investment	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
25	kota@kotainvestment.com	<100	Multi-entity/Holding Companies	7	1.00	203.00	1800.00	2025-07-21 05:22:56.961058	2025-07-21 05:22:59.202	f	f		f	139728237145	40549178534	deal_40549178534	t	Kota Capital Investment	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
26	kota@kotainvestment.com	100-300	E-commerce/Retail	7	0.50	338.00	1375.00	2025-07-21 05:25:00.841618	2025-07-21 05:25:03.561	f	f		f	139728237145	40547140695	22234000510	t	Kota Capital Investment	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
27	mike.morley246@hotmail.com	<100	E-commerce/Retail	7	1.00	203.00	1650.00	2025-07-21 05:37:48.792847	2025-07-21 05:37:51.6	f	f		f	135710036314	40546712130	22227424320	t	Paul Morley & Sons llc	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
28	cpatstew410@gmail.com	100-300	Real Estate	7	0.75	313.00	1750.00	2025-07-21 05:45:23.747032	2025-07-21 05:45:26.626	f	f		f	139787473671	40550819919	22121571691	t	Stewart Diversified LLC	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
32	jalynnajones@gmail.com	100-300	Multi-entity/Holding Companies	7	1.00	338.00	2975.00	2025-07-21 06:24:55.384158	2025-07-21 06:24:58.549	f	f		f	139594428270	40553010759	22117609071	t	Black Pretty & Paid - Coaching & Consulting Agency	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
36	mt@vitalyoufm.com	300-600	Healthcare/Medical	12	0.75	910.00	10650.00	2025-07-21 17:11:41.868672	2025-07-21 17:15:01.628	f	f		f	139884956236	40589339969	22279905881	t	Vital You Functional Medicine	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
34	kota@kotainvestment.com	100-300	Multi-entity/Holding Companies	7	1.00	338.00	2975.00	2025-07-21 06:32:47.539558	2025-07-21 06:49:33.508	t	f		f	139728237145	40554544176	22237645986	t	Kota Capital Investment	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
33	lucas@fhdmfg.com	100-300	Multi-entity/Holding Companies	7	1.00	338.00	2975.00	2025-07-21 06:30:08.169977	2025-07-21 06:49:35.81	t	f		f	139762349663	40552799790	22126998099	t	FHD electronic	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
31	jalynnajones@gmail.com	<100	Professional Services	7	0.50	150.00	600.00	2025-07-21 06:22:48.918621	2025-07-21 06:49:38.837	t	f		f	139594428270	40546226588	deal_40546226588	t	Black Pretty & Paid - Coaching & Consulting Agency	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
30	lucas@fhdmfg.com	<100	Construction/Trades	7	0.75	495.00	2825.00	2025-07-21 06:07:44.506216	2025-07-21 06:49:42.821	t	f		f	139762349663	40552774411	22181843780	t	FHD electronic	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
29	cems245@gmail.com	100-300	Professional Services	7	0.50	250.00	975.00	2025-07-21 06:03:30.387639	2025-07-21 06:49:46.451	t	f		f	139320661139	40549849155	22232536350	t	creative event media	3	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
38	bradcerenzia@gmail.com	100-300	Entertainment/Events	7	0.25	542.00	1375.00	2025-07-22 04:22:12.266174	2025-07-22 04:22:16.806	f	f		f	140023987272	40630095633	22305567849	t	Outrage Onstage	3	bookkeeping	S-Corp	1	1	f	1	Outside CPA	t	1	t	167.00	500.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
39	info@wagsworthhotel.com	100-300	Property Management	7	0.25	780.00	6160.00	2025-07-22 04:30:44.342198	2025-07-22 04:30:48.933	f	f		f	139887326371	40629319761	22309755828	t	Wagsworth Hotel	3	bookkeeping	C-Corp	1	1	f	2	Outside CPA	t	2	t	455.00	5460.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
41	info@wagsworthhotel.com	100-300	Hospitality	7	0.25	400.00	1000.00	2025-07-22 05:02:48.9343	2025-07-22 05:02:53.005	f	f		f	139887326371	40616268823	22303864838	t	Wagsworth Hotel	5	bookkeeping	\N	1	1	f	1	\N	f	0	f	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
40	info@wagsworthhotel.com	N/A	Property Management	7	0.00	350.00	6300.00	2025-07-22 04:39:42.4353	2025-07-22 04:39:46.301	f	f		f	139887326371	40633329562	22295512660	t	Wagsworth Hotel	3	taas	C-Corp	1	1	f	1	Outside CPA	t	3	t	350.00	6300.00	f	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
8	test@example.com	<100	Software/SaaS	1	0.50	150.00	150.00	2025-07-21 00:16:52.99329	2025-07-21 03:06:28.491	t	t	Brand New Business	f	\N	\N	\N	f	\N	1	bookkeeping	\N	\N	\N	\N	\N	\N	\N	\N	\N	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	25K-75K	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
42	jimmy@crushthenarc.com	<100	Consulting	7	0.25	150.00	300.00	2025-07-24 18:10:42.275387	2025-07-24 19:35:50.591	t	f		f	138880130158	40757002303	22444076817	t	East Shore Coaching	3	bookkeeping	\N	1	1	f	1	\N	f	0	f	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
43	jimmy@crushthenarc.com	<100	Consulting	7	0.50	325.00	575.00	2025-07-24 19:37:39.080133	2025-07-24 19:37:39.080133	f	f		f	\N	\N	\N	f	East Shore Coaching	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	0	f	175.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
44	jimmy@crushthenarc.com	<100	Consulting	7	0.50	300.00	575.00	2025-07-24 19:43:11.2315	2025-07-24 19:43:15.249	f	f		f	138880130158	40767351223	22415239329	t	East Shore Coaching	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	0	t	150.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
45	jonwalls.ins@gmail.com	<100	Software/SaaS	7	0.50	300.00	525.00	2025-07-24 19:49:57.392548	2025-07-24 19:50:01.05	f	f		f	121998060312	40791994475	22446987682	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	0	t	150.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
46	jonwalls.ins@gmail.com	<100	Software/SaaS	7	0.50	300.00	1525.00	2025-07-24 19:51:17.113196	2025-07-24 19:51:21.923	f	f		f	121998060312	40798354750	22455455825	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	1	t	150.00	1000.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
47	jonwalls.ins@gmail.com	<100	Professional Services	7	0.50	400.00	600.00	2025-07-24 21:03:07.774808	2025-07-24 21:03:11.98	f	f		f	121998060312	40790147242	22453907473	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Outside CPA	t	0	f	250.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
48	jonwalls.ins@gmail.com	<100	Software/SaaS	7	0.50	325.00	525.00	2025-07-24 21:05:57.128308	2025-07-24 21:06:00.423	f	f		f	121998060312	40802404142	22454836510	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	0	f	175.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
49	jonwalls.ins@gmail.com	100-300	Property Management	7	0.25	555.00	700.00	2025-07-24 21:09:40.750917	2025-07-24 21:09:44.879	f	f		f	121998060312	40795578500	22460829068	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	0	f	230.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
50	jonwalls.ins@gmail.com	<100	Transportation/Logistics	0	0.25	735.00	400.00	2025-07-24 22:01:27.219103	2025-07-24 22:01:30.182	f	t	Other	t	121998060312	40802873190	22458506540	t	TPGRM	3	bookkeeping	\N	1	1	f	1	\N	f	0	f	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
51	jonwalls.ins@gmail.com	100-300	Accounting/Finance	7	0.50	275.00	410.00	2025-07-24 22:05:17.085137	2025-07-24 22:05:20.48	f	t	Other	f	121998060312	40797137928	22463016500	t	TPGRM	3	bookkeeping	\N	1	1	f	1	\N	f	0	f	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
52	jonwalls.ins@gmail.com	100-300	Marketing/Advertising	12	0.25	494.00	600.00	2025-07-24 22:09:43.89826	2025-07-24 22:09:47.484	f	t	Other	f	121998060312	40797288986	22454681675	t	TPGRM	3	bookkeeping	\N	1	1	f	1	\N	f	0	f	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
64	jonwalls.ins@gmail.com	100-300	Manufacturing	7	0.50	733.00	6040.00	2025-07-24 23:20:07.315736	2025-07-24 23:20:54.391	f	f		f	121998060312	40795461437	22463790696	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Outside CPA	t	2	t	370.00	4440.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
53	jonwalls.ins@gmail.com	2000+	Accounting/Finance	0	0.50	2848.00	4200.00	2025-07-24 22:13:55.198656	2025-07-24 22:14:57.866	f	t	Other	t	121998060312	40798536316	22460829086	t	TPGRM	3	bookkeeping	C-Corp	1	2	t	4	Clean (Seed)	t	2	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
56	jonwalls.ins@gmail.com	100-300	Technology/IT Services	1	0.50	913.00	2050.00	2025-07-24 22:41:39.171251	2025-07-24 22:42:52.181	f	t	Books Confirmed Current	t	121998060312	40791565999	22457887136	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	f	1	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
54	jonwalls.ins@gmail.com	100-300	Manufacturing	4	0.50	363.00	925.00	2025-07-24 22:25:05.463962	2025-07-24 22:26:21.112	f	t	Other	t	121998060312	40796522584	22458041982	t	TPGRM	3	bookkeeping	C-Corp	1	1	t	1	Clean (Seed)	t	3	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
55	jonwalls.ins@gmail.com	100-300	Accounting/Finance	4	0.50	688.00	1525.00	2025-07-24 22:31:24.593651	2025-07-24 22:32:33.263	f	t	Books Confirmed Current	t	121998060312	40804573222	22468576168	t	TPGRM	3	bookkeeping	LLC	2	1	f	1	Clean (Seed)	t	2	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
60	jonwalls.ins@gmail.com	600-1000	Transportation/Logistics	7	0.50	1685.00	14120.00	2025-07-24 23:02:28.755294	2025-07-24 23:02:44.514	f	f		f	121998060312	40804743687	22453133321	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Outside CPA	t	4	t	355.00	8520.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
57	jonwalls.ins@gmail.com	100-300	E-commerce/Retail	4	0.25	683.00	2470.00	2025-07-24 22:48:09.025306	2025-07-24 22:49:25.896	f	t	Brand New Business	t	121998060312	40791569519	22447297454	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Outside CPA	t	1	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
61	jonwalls.ins@gmail.com	300-600	Fitness/Wellness	9	0.25	1464.00	5110.00	2025-07-24 23:04:37.736989	2025-07-24 23:05:08.174	f	f		f	121998060312	40806257693	22451275181	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Outside CPA	t	1	t	385.00	2310.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
58	jonwalls.ins@gmail.com	300-600	Insurance	10	0.50	1704.00	12490.00	2025-07-24 22:55:48.660308	2025-07-24 22:56:15.664	f	f		f	121998060312	40796536462	22459900073	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Clean (Seed)	t	2	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
69	jonwalls.ins@gmail.com	<100	Agriculture	8	0.50	478.00	4170.00	2025-07-25 00:45:36.723358	2025-07-25 00:46:00.234	f	f		f	121998060312	40794544460	22459590492	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	2	t	260.00	3120.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
59	jonwalls.ins@gmail.com	300-600	Accounting/Finance	7	0.50	1108.00	4695.00	2025-07-24 22:57:38.637186	2025-07-24 22:58:20.023	f	f		f	121998060312	40799168904	22447607131	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	f	1	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
63	jonwalls.ins@gmail.com	100-300	Insurance	7	0.25	338.00	750.00	2025-07-24 23:10:14.845345	2025-07-24 23:11:20.606	f	f		f	121998060312	40801513057	22451275182	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Clean (Seed)	t	3	t	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
62	jonwalls.ins@gmail.com	600-1000	Manufacturing	7	0.50	1748.00	10490.00	2025-07-24 23:07:46.226622	2025-07-24 23:08:07.162	f	f		f	121998060312	40803979596	22461293635	t	TPGRM	3	bookkeeping	S-Corp	1	1	f	1	Outside CPA	t	2	t	370.00	4440.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
65	jonwalls.ins@gmail.com	<100	Education	7	0.25	373.00	2620.00	2025-07-24 23:22:19.020407	2025-07-24 23:22:36.156	f	f		f	121998060312	40797013175	22458042000	t	TPGRM	3	bookkeeping	S-Corp	1	1	f	1	Clean (Seed)	t	2	t	185.00	2220.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
67	jonwalls.ins@gmail.com	1000-2000	Law Firm	7	0.25	1755.00	4150.00	2025-07-25 00:34:39.867283	2025-07-25 00:34:55.649	f	f		f	121998060312	40806892345	22451894618	t	TPGRM	3	bookkeeping	\N	1	1	f	1	Outside CPA	t	4	t	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
66	jonwalls.ins@gmail.com	300-600	Education	7	0.25	225.00	1350.00	2025-07-24 23:24:04.369556	2025-07-24 23:24:51.278	f	f		f	121998060312	40806726315	22457577521	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	1	t	225.00	1350.00	f	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
68	jonwalls.ins@gmail.com	100-300	Insurance	7	0.25	578.00	3630.00	2025-07-25 00:41:31.405707	2025-07-25 00:42:16.174	f	f		f	121998060312	40805381304	22459745298	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	2	t	240.00	2880.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
70	jonwalls.ins@gmail.com	<100	Insurance	10	0.25	403.00	3050.00	2025-07-25 00:49:07.665924	2025-07-25 00:52:14.371	f	f		f	121998060312	40798885930	22460674351	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Clean (Seed)	t	2	t	200.00	2400.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
71	jonwalls.ins@gmail.com	100-300	Manufacturing	7	1.00	623.00	7880.00	2025-07-25 00:55:30.630285	2025-07-25 00:56:02.145	f	f		f	121998060312	40801684040	22461603361	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Clean (Seed)	t	3	t	260.00	4680.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
72	jonwalls.ins@gmail.com	300-600	Marketing/Advertising	9	0.50	952.00	7390.00	2025-07-25 00:58:19.175082	2025-07-25 00:58:45.789	f	f		f	121998060312	40800290140	22454526871	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	3	t	205.00	3690.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
79	jonwalls.ins@gmail.com	100-300	Law Firm	7	0.25	770.00	3165.00	2025-07-28 01:59:19.913101	2025-07-28 01:59:24.698	f	f		f	121998060312	40940733958	22487251039	t	TPGRM	3	bookkeeping	LLC	1	1	f	2	Outside CPA	t	1	t	365.00	2190.00	t	t	\N	\N	\N	t	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
73	jonwalls.ins@gmail.com	300-600	Restaurant/Food Service	9	0.50	410.00	2460.00	2025-07-25 02:58:25.925634	2025-07-25 02:59:46.103	f	f		f	121998060312	40797218857	22459900232	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Outside CPA	t	1	t	410.00	2460.00	f	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
80	jonwalls.ins@gmail.com	100-300	Property Management	12	0.50	1064.00	7055.00	2025-07-29 19:16:38.076933	2025-07-29 19:16:43.024	f	f		f	121998060312	41033467164	22660304031	t	TPGRM	3	bookkeeping	LLC	1	1	f	2	Outside CPA	t	1	t	505.00	3030.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
74	jonwalls.ins@gmail.com	100-300	Nonprofit	7	0.50	550.00	2725.00	2025-07-25 03:04:11.833797	2025-07-25 03:04:45.228	f	f		f	121998060312	40801561374	22462242414	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	t	1	f	250.00	1500.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
81	rickmyersfarrierservice@gmail.com	100-300	Professional Services	2	1.00	250.00	550.00	2025-07-30 21:31:47.260971	2025-07-30 21:31:50.863	f	t	Brand New Business	t	141768529206	41085156729	22716912003	t	Rick Myers Farrier Service LLC	5	bookkeeping	\N	1	1	f	1	\N	f	0	f	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
75	jonwalls.ins@gmail.com	100-300	Construction/Trades	7	0.50	1015.00	4670.00	2025-07-25 03:10:21.70131	2025-07-25 03:10:36.091	f	f		f	121998060312	40791002885	22456803394	t	TPGRM	3	bookkeeping	Partnership	1	1	f	1	Clean (Seed)	t	1	f	370.00	2220.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
82	saschaoffthemap@gmail.com	<100	Consulting	7	0.50	150.00	575.00	2025-07-31 17:36:50.606308	2025-07-31 17:36:54.129	f	f		f	141326646879	41109025157	22732054035	t	Sascha Altman DuBrul	5	bookkeeping	Sole Proprietorship	1	1	f	1	Outside CPA	t	1	t	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
96	test@example.com	300-600	Software/SaaS	3	0.75	830.00	850.00	2025-08-03 05:46:33.76379	2025-08-03 05:46:33.76379	f	f	\N	f	\N	\N	\N	f	\N	1	combined	LLC	1	1	f	2	Clean (Seed)	t	0	f	0.00	0.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	25K-75K	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
76	jonwalls.ins@gmail.com	100-300	Automotive	7	0.25	852.00	7275.00	2025-07-25 03:11:41.459795	2025-07-25 03:12:02.591	f	f		f	121998060312	40804643448	22463171442	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Clean (Seed)	f	4	t	250.00	6000.00	t	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
97	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.50	560.00	2855.00	2025-08-03 05:51:52.511646	2025-08-03 05:51:52.511646	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	S-Corp	1	1	f	1	Outside CPA	f	1	t	230.00	1380.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	t	10K-25K	t	t	f	f	f			CO		US	t	Cash	\N
98	jonwalls.ins@gmail.com	<100	Professional Services	8	0.25	230.00	525.00	2025-08-03 06:04:35.518193	2025-08-03 06:04:35.518193	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	\N
99	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.50	250.00	1100.00	2025-08-03 06:06:56.117997	2025-08-03 06:06:56.117997	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	S-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Cash	\N
100	jonwalls.ins@gmail.com	<100	Professional Services	8	0.25	150.00	350.00	2025-08-03 06:11:44.651934	2025-08-03 06:11:44.651934	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	\N	\N
77	jonwalls.ins@gmail.com	300-600	Nonprofit	7	0.25	305.00	3660.00	2025-07-25 03:16:48.629573	2025-07-25 03:17:42.803	f	f		f	121998060312	40810059369	22466113373	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Outside CPA	t	2	t	305.00	3660.00	f	t	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
106	jonwalls.ins@gmail.com	<100	Professional Services	8	0.25	150.00	350.00	2025-08-03 06:47:44.741018	2025-08-03 06:47:44.741018	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	\N	\N
107	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.25	250.00	550.00	2025-08-03 06:49:25.654547	2025-08-03 06:49:25.654547	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Cash	\N
108	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.50	250.00	1100.00	2025-08-03 06:51:56.397077	2025-08-03 06:51:56.397077	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	Cash	\N
109	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	250.00	500.00	2025-08-03 06:54:08.841461	2025-08-03 06:54:08.841461	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Accrual	\N
110	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	250.00	500.00	2025-08-03 07:06:47.934434	2025-08-03 07:06:47.934434	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	Cash	\N
111	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.50	250.00	1100.00	2025-08-03 07:08:34.906813	2025-08-03 07:08:34.906813	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Cash	\N
78	jonwalls.ins@gmail.com	1000-2000	Property Management	7	0.25	1755.00	3700.00	2025-07-25 03:20:29.898258	2025-07-25 03:22:15.77	f	f		f	121998060312	40796751940	22458506637	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	Clean (Seed)	t	2	t	0.00	0.00	t	f	\N	\N	\N	f	\N	t	\N	t	t	t	\N	f	f	f	f	f	\N	\N	\N	\N	US	t	\N	\N
112	jonwalls.ins@gmail.com	<100	Professional Services	8	0.50	150.00	675.00	2025-08-03 07:10:18.081363	2025-08-03 07:10:18.081363	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Accrual	\N
113	jonwalls.ins@gmail.com	<100	Software/SaaS	8	0.25	150.00	300.00	2025-08-03 07:13:05.442196	2025-08-03 07:13:05.442196	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	Cash	\N
114	jonwalls.ins@gmail.com	<100	Professional Services	8	0.50	150.00	675.00	2025-08-03 07:18:12.204379	2025-08-03 07:18:12.204379	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	Cash	\N
115	jonwalls.ins@gmail.com	<100	Professional Services	8	0.25	150.00	350.00	2025-08-03 07:20:47.887739	2025-08-03 07:20:47.887739	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	Cash	\N
116	jonwalls.ins@gmail.com	<100	Professional Services	8	0.50	330.00	1475.00	2025-08-03 07:22:46.467031	2025-08-03 07:22:46.467031	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	25K-75K	t	f	f	f	f			CO		US	t	Cash	\N
117	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.25	250.00	550.00	2025-08-03 07:26:21.303638	2025-08-03 07:26:21.303638	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Cash	\N
118	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.50	465.00	2290.00	2025-08-03 19:36:39.159996	2025-08-03 19:57:36.855	f	f		f	121998060312	41288732267	22719074175	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	Outside CPA	t	1	t	215.00	1290.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	t	f	f	f			CO		US	t	Cash	\N
119	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.25	250.00	550.00	2025-08-03 20:25:47.519309	2025-08-03 20:25:50.838	f	f		f	121998060312	41239159044	22715984290	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Cash	\N
120	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.50	250.00	1100.00	2025-08-03 20:34:40.768065	2025-08-03 20:34:44.392	f	f		f	121998060312	41289977122	22883799425	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	10K-25K	t	f	f	f	f			CO		US	t	Cash	\N
121	jonwalls.ins@gmail.com	100-300	Software/SaaS	12	0.50	250.00	1500.00	2025-08-03 20:38:16.330083	2025-08-03 20:38:54.913	f	f		f	121998060312	41292692256	22883644576	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	t	<$10K	t	f	f	f	f			CO		US	t	Cash	\N
122	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.25	585.00	3810.00	2025-08-03 20:53:37.473439	2025-08-03 20:53:42.666	f	f		f	121998060312	41291390548	22828354423	t	TPGRM	3	bookkeeping	S-Corp	1	1	f	1	Outside CPA	t	2	t	255.00	3060.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	t	10K-25K	t	t	f	f	f			CO		US	t	Cash	t
136	jormas@pangeaunitedgroup.com	<100	Professional Services	8	0.50	150.00	675.00	2025-08-05 16:45:12.480714	2025-08-05 16:45:17.051	f	f		f	142490699008	41363486474	22995212325	t	Pangea United Group	5	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	Jormas	t	Anassan Jr	t	f	f	<$10K	t	f	f	f	f	2929 Arch Street 	Philadelphia	PA	19104	US	t	Accrual	f
123	jonwalls.ins@gmail.com	100-300	Consulting	12	0.25	800.00	6690.00	2025-08-04 04:38:04.75729	2025-08-04 04:40:51.83	f	f		f	121998060312	41299943020	22876187570	t	TPGRM	3	bookkeeping	LLC	1	1	t	2	Self-Managed	t	2	t	470.00	5640.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	t	<$10K	t	t	f	f	f			CO		US	t	Cash	t
124	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.25	775.00	6090.00	2025-08-04 05:24:27.586496	2025-08-04 05:24:33.058	f	f		f	121998060312	41308612732	22804308144	t	TPGRM	3	bookkeeping	LLC	1	2	t	2	Outside CPA	t	2	t	445.00	5340.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	f	<$10K	t	t	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	t
125	jonwalls.ins@gmail.com	<100	Real Estate	12	0.50	558.00	6920.00	2025-08-04 17:01:31.71297	2025-08-04 17:01:36.187	f	f		f	121998060312	41308005133	deal_41308005133	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	2	Outside CPA	t	3	t	290.00	5220.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	t	<$10K	t	t	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	t
126	jonwalls.ins@gmail.com	<100	Software/SaaS	8	0.25	530.00	5875.00	2025-08-04 17:33:03.424683	2025-08-04 17:33:03.424683	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	2	Self-Managed	t	3	t	300.00	5400.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	f	<$10K	t	t	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	\N
127	jonwalls.ins@gmail.com	100-300	Professional Services	13	0.50	635.00	4205.00	2025-08-04 17:35:18.859219	2025-08-04 17:35:25.807	f	f		f	121998060312	41339551361	22795357839	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	3	Outside CPA	t	1	t	305.00	1830.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	f	10K-25K	t	t	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	t
128	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	545.00	3255.00	2025-08-05 04:09:41.25303	2025-08-05 04:09:41.25303	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	Outside CPA	t	2	t	215.00	2580.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	f	<$10K	t	t	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Accrual	t
129	jonwalls.ins@gmail.com	600-1000	Professional Services	8	0.25	1030.00	2275.00	2025-08-05 04:15:08.783841	2025-08-05 04:15:08.783841	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	f	10K-25K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	t
130	jonwalls.ins@gmail.com	100-300	Professional Services	8	0.25	330.00	750.00	2025-08-05 04:17:48.817737	2025-08-05 04:17:48.817737	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	t	John	t	Walsh	t	f	f	10K-25K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	\N
131	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	250.00	500.00	2025-08-05 04:20:58.360345	2025-08-05 04:20:58.360345	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	f	10K-25K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	\N
132	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	250.00	500.00	2025-08-05 04:24:02.553292	2025-08-05 04:24:02.553292	f	f		f	\N	\N	\N	f	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	f	<$10K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Accrual	\N
133	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.50	250.00	1000.00	2025-08-05 04:26:43.840977	2025-08-05 04:26:48.699	f	f		f	121998060312	41348370602	22937302343	t	TPGRM	3	bookkeeping	LLC	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	f	<$10K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	\N
134	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	250.00	500.00	2025-08-05 04:29:23.443711	2025-08-05 04:29:27.349	f	f		f	121998060312	41366191482	22932124490	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	f	10K-25K	t	f	f	f	f	4136 Del Rey Ave	Marina Del Rey	CA	90292	US	t	Cash	\N
135	jonwalls.ins@gmail.com	100-300	Software/SaaS	8	0.25	250.00	500.00	2025-08-05 08:13:33.074627	2025-08-05 08:13:37.504	f	f		f	121998060312	41350865962	22939160441	t	TPGRM	3	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	John	t	Walsh	t	f	f	<$10K	t	f	f	f	f	4136 Del Rey	Marina Del Rey	CA	90292	US	t	Cash	\N
140	ranchlogistics5150@gmail.com	<100	Transportation/Logistics	20	0.50	565.00	4655.00	2025-08-06 23:33:13.273772	2025-08-06 23:33:20.067	f	f		f	142511456029	41526255130	23099399169	t	the ranch logistics	5	bookkeeping	LLC	1	1	f	1	Self-Managed	f	1	t	355.00	2130.00	f	f	\N	\N	\N	f	Julie	t	Sparks	t	f	f	<$10K	t	t	f	f	f	13205 South Lightner Rd	Garden City	KS	67846	US	f	Cash	\N
137	thflattum@gmail.com	2000+	Construction/Trades	9	0.25	2625.00	6400.00	2025-08-05 19:45:38.072466	2025-08-05 19:45:59.173	f	f		f	141406040655	41443728216	23013693706	t	Built Strong Exteriors	4	bookkeeping	C-Corp	1	1	f	1	\N	f	0	f	0.00	0.00	f	f	\N	\N	\N	f	Tony	t	Flattum	t	f	f	10K-25K	t	f	f	f	f	8665 Hudson Blvd 	Lake Elmo	MN	55042	US	t	Accrual	f
138	850renovations@gmail.com	<100	Construction/Trades	20	0.50	225.00	2450.00	2025-08-06 19:58:56.895316	2025-08-06 19:59:02.101	f	f		f	144056528482	41490508830	23023004740	t	850 renovations llc	5	bookkeeping	LLC	1	1	f	1	Self-Managed	f	1	t	0.00	0.00	f	f	\N	\N	\N	f	Jamie	t	Tabisz-Smith	t	f	f	10K-25K	t	f	f	f	f	6412 WELANNEE BLVD	Laurel Hill	FL	32567	US	t	Cash	\N
139	reda@matrice.ai	<100	Software/SaaS	8	0.50	425.00	600.00	2025-08-06 21:07:44.855465	2025-08-06 21:07:50.396	f	f		f	144670171721	41511498147	23099863630	t	Matrice Ai	5	bookkeeping	C-Corp	1	1	f	1	Self-Managed	t	0	t	275.00	0.00	f	f	\N	\N	\N	f	Reda	t	Al-Bahrani	t	f	f	<$10K	t	t	f	f	f	8 The Green Ste A	Dover	DE	19901	US	t	Accrual	\N
141	info@e360mc.com	<100	Professional Services	8	0.50	485.00	1025.00	2025-08-07 14:17:07.51027	2025-08-07 14:17:14.628	f	f		f	137721509163	41527566112	23127585093	t	Elevate 360 Media Co, LLC	5	bookkeeping	LLC	1	1	f	1	Not Done / Behind	f	0	t	255.00	0.00	f	f	\N	\N	\N	t	Chris	t	Poarch	t	f	f	<$10K	t	t	f	f	f	2706 Cages Bend Road	Gallatin	TN	37066	US	t	Cash	\N
142	john.parkins@beyond-vivid.com	<100	Marketing/Advertising	8	0.50	603.00	1125.00	2025-08-07 21:44:47.049766	2025-08-07 21:44:53.516	f	f		f	141378498419	41571925252	23136620569	t	BeyondVivid LLC	5	bookkeeping	LLC	1	1	f	1	Self-Managed	f	0	t	350.00	0.00	f	f	\N	\N	\N	t	John	t	Parkins	t	f	f	10K-25K	t	t	f	f	f	1941 W Elm St	Lima	OH	45805	US	t	Cash	\N
143	tryceurban@kona-ice.com	100-300	Restaurant/Food Service	8	0.50	670.00	4020.00	2025-08-11 20:05:48.793354	2025-08-11 20:05:55.014	f	f		f	141629983130	41798434436	23329353871	t	Kona Ice of Boulder	5	bookkeeping	LLC	1	1	f	1	Self-Managed	f	1	f	670.00	4020.00	f	f	\N	\N	\N	f	Chris	t	Geurden	t	f	f	25K-75K	f	t	f	f	f	4506 Portofino Drive 	Longmont	CO	80503	US	t	Cash	\N
144	interpreters@edita-itr.com	300-600	Professional Services	8	0.50	830.00	3675.00	2025-08-12 16:06:29.774867	2025-08-12 16:06:35.849	f	f		f	145388227110	41872971701	23418811773	t	E.D.I.T.A.	5	bookkeeping	C-Corp	1	1	f	1	Self-Managed	f	1	t	0.00	0.00	f	f	\N	\N	\N	f	Edita	t	Habibic	t	f	f	25K-75K	t	f	f	f	f	1904 Harding St	Clearwater	FL	33765	US	t	Cash	\N
\.


--
-- Data for Name: sales_reps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_reps (id, email, first_name, last_name, hubspot_user_id, is_active, created_at, updated_at, user_id) FROM stdin;
8	jon@seedfinancial.io	Jon	Walls	76209082	t	2025-08-11 21:42:43.803368	2025-08-12 06:06:26.692475	\N
9	randall@seedfinancial.io	Randall	Hall	76209122	t	2025-08-11 21:42:44.026878	2025-08-12 06:06:26.902426	\N
10	amanda@seedfinancial.io	Amanda	Cooper	81797648	t	2025-08-11 21:42:44.23626	2025-08-12 06:06:27.112524	\N
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session (sid, sess, expire) FROM stdin;
43zUTMGGdN7q8jB_-fl8zEdAUhUrN77e	{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-23T01:59:39.017Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-07-23 06:12:32
anWXORBlQ1YiSvpPuYQGZ1EtUWsJV4_Y	{"cookie":{"originalMaxAge":86399999,"expires":"2025-07-25T00:24:04.313Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-07-25 00:24:56
4kiaES0DE5xXSdtNiLvZjhRc3BSRnRRo	{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-23T05:45:41.212Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-07-23 05:47:11
NRR_yAE0vk1dzKQoJCtYiF-mt9qVSxOn	{"cookie":{"originalMaxAge":86400000,"expires":"2025-07-23T05:00:50.260Z","secure":false,"httpOnly":true,"path":"/"},"passport":{"user":3}}	2025-07-23 05:06:04
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, password, first_name, last_name, hubspot_user_id, created_at, updated_at, email, profile_photo, phone_number, address, city, state, zip_code, country, latitude, longitude, last_weather_update, last_hubspot_sync, hubspot_sync_enabled, google_id, firebase_uid, auth_provider, role, role_assigned_by, role_assigned_at, default_dashboard, is_impersonating, original_admin_id) FROM stdin;
5	$2b$10$QYsy8C7ujq/81jtvDYdSOe/BbKC5wNNYoUsigo.ZG.uXsBXXxx8OS	Amanda	Cooper	\N	2025-07-22 04:56:41.260541	2025-08-05 12:55:06.561	amanda@seedfinancial.io	/uploads/profiles/photo-1754398459922-534864238.jfif		17207 Amelia Pines Ct	Conroe	TX	77302	US	\N	\N	2025-08-05 12:54:58.998	2025-08-05 12:55:06.561	t	105856302823474151138	\N	google	employee	3	2025-07-30 21:04:17.63	sales	f	\N
4	$2b$10$j3tJyBUd4Om5.QUXwkDmHuNhnqhi9mslH2UqeytzU9WZZZ0Hzs0BG	Randall	Hall	\N	2025-07-21 04:43:10.270673	2025-08-05 05:50:44.491	randall@seedfinancial.io	https://lh3.googleusercontent.com/a/ACg8ocJFKGv6dnToiPn99sVo047oUuRgKgUdm5uyAAO82vR9fgroCA=s96-c	\N	\N	\N	\N	\N	US	\N	\N	\N	2025-08-05 05:50:03.392	t	104198394681127683203	\N	google	admin	3	2025-07-30 21:04:20.816	admin	f	\N
3	$2b$12$tX8XG2.hwkCxNhDE/b7Ak.gO7E89KhI4r6suOp4mdY3k672CKGo/m	Jon	Walls	\N	2025-07-21 04:33:40.068586	2025-08-05 05:50:25.352	jon@seedfinancial.io	https://lh3.googleusercontent.com/a-/ALV-UjUpd4Wy8acQvMRkMgyqD1ogvb1DJetg-8K75SyOkjWCa6j3a7UXBpN8aRV6Eigj_m__XIhfpvyomQq-uyAVa1OHHpSJ2GHZk5dU1aH-d23yI693B1Rjq7ycTfBm36oaMyIyMgCpPkg1oKbIi2OLoR_np_Ul6LfoBI_DKlHZSAqP1dKnq4hXftjuQcBRN3UmRbrw7FePMYu0mnMjs5WPHEl8zpIbNni6xbjIam1MzjjVoDFsmveMQF0UjSeX1u9v_owGdDVKYu6nVlxm41hF3peP7ldBxNHHplsJgY9WO-Wapqulf9xHJ3-MyuqoQdXYwLX5I70zdIdwe4NTHrX7hZybPOlaa0gpvQ-66_NVh8xQo76RP2gfmZhaCrDpskUNlvD3brp9xOSwK5sO9lojM92WOTCAE3XyzkyytOT3GQzRVKwZDKYDWPkyjStHNqDI5F6jyUu9p1DTwb5qwYVoWOY4WFySy9YozHzuL7h718g__1mMga7-yqoX7nSycImthk3dF1Yder6PE33XXfvpKGCM5SnpZvTsikFF5gRKqOyLdsWSIZVvXXmx8Fp3UgUE88SZ1I8rP3gSMvFYicMbJXtWYlLkutaXB2x3gf1tXfkvPjfIhi0EaAxXNytiEepknQIMPDUfeb75Etv8tEkHnBtdFAQdBuEec1nkQRI89dblDJzxiv99XL0VO5whJt3j7EmwnebeWUSR8nwOf6jrppe9OV2Fcp3bB3F8MhBYD_sJRr2FCbvaZoVbs2UAJZMcmprDsgeCwFtT6RXnYwYmglYa8EUdGoQ72kV2c5cuL9ettA-5K0F0pA0P3VBRY5-bYjc90-_hsk7s493g5Cda5FBjIT2Udbn-1yWq9m6L4rD4wQ0zrSWeyC9kx_XGajq7w4aC5iGrncAZXOSP4jxM8ghlfCyYUIJ9ohWq7KBEDt_2LH2f5tFwa26FQEgc7wM64FPNkdfbMcrUVgRToBWQ61ZC36GTJHB6=s96-c	(310) 737-2067	4136 Del Rey Avenue	Los Angeles	California	90292	United States	37.33180000	-122.03120000	2025-07-28 07:00:24.597	2025-07-28 07:00:30.49	t	116944558111760433189	\N	google	admin	\N	\N	admin	f	\N
9	$2b$12$XmLfHjC/7vWWcH2ILH35k.fUbhP7NAMrODnHNc/L1thp6BZD7XJAS			\N	2025-08-05 07:30:52.161078	2025-08-05 07:30:52.161078	test@seedfinancial.io	\N	\N	\N	\N	\N	\N	US	\N	\N	\N	\N	t	\N	\N	local	employee	\N	\N	sales	f	\N
\.


--
-- Data for Name: workspace_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workspace_users (id, google_id, email, first_name, last_name, full_name, is_admin, suspended, org_unit_path, last_login_time, creation_time, thumbnail_photo_url, last_synced_at, sync_source, created_at, updated_at) FROM stdin;
\.


--
-- Name: approval_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.approval_codes_id_seq', 30, true);


--
-- Name: box_folders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.box_folders_id_seq', 1, false);


--
-- Name: client_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.client_activities_id_seq', 1, false);


--
-- Name: commission_adjustments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.commission_adjustments_id_seq', 1, false);


--
-- Name: commissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.commissions_id_seq', 130, true);


--
-- Name: deals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.deals_id_seq', 26, true);


--
-- Name: document_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_templates_id_seq', 1, false);


--
-- Name: hubspot_invoice_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.hubspot_invoice_line_items_id_seq', 74, true);


--
-- Name: hubspot_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.hubspot_invoices_id_seq', 34, true);


--
-- Name: hubspot_subscriptions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.hubspot_subscriptions_id_seq', 1, false);


--
-- Name: kb_article_versions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kb_article_versions_id_seq', 1, false);


--
-- Name: kb_articles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kb_articles_id_seq', 20, true);


--
-- Name: kb_bookmarks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kb_bookmarks_id_seq', 1, false);


--
-- Name: kb_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kb_categories_id_seq', 24, true);


--
-- Name: kb_search_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kb_search_history_id_seq', 1, false);


--
-- Name: milestone_bonuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.milestone_bonuses_id_seq', 1, true);


--
-- Name: monthly_bonuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.monthly_bonuses_id_seq', 3, true);


--
-- Name: quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quotes_id_seq', 144, true);


--
-- Name: sales_reps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_reps_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 9, true);


--
-- Name: workspace_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workspace_users_id_seq', 1, false);


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

