--
-- PostgreSQL database dump
--

\restrict 41qqQ7CTnNZ39IalPfh0nixxD81ZlzvqR10yrigjz7ooaaRWEisJ4hZlDpxvQzK

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: appointment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointment_history (
    id integer NOT NULL,
    appointment_id integer,
    action character varying(50),
    performed_by integer,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


ALTER TABLE public.appointment_history OWNER TO postgres;

--
-- Name: appointment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointment_history_id_seq OWNER TO postgres;

--
-- Name: appointment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointment_history_id_seq OWNED BY public.appointment_history.id;


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id integer NOT NULL,
    slot_id integer,
    client_id integer,
    status character varying(20),
    booked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cancelled_at timestamp with time zone,
    rescheduled_from integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    appointment_date date,
    start_time time without time zone,
    end_time time without time zone,
    duration_minutes integer,
    CONSTRAINT appointments_status_check CHECK (((status)::text = ANY ((ARRAY['BOOKED'::character varying, 'CANCELLED'::character varying, 'COMPLETED'::character varying, 'NO_SHOW'::character varying])::text[])))
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: appointments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appointments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.appointments_id_seq OWNER TO postgres;

--
-- Name: appointments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appointments_id_seq OWNED BY public.appointments.id;


--
-- Name: availability_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.availability_slots (
    id integer NOT NULL,
    provider_id integer,
    resource_id integer,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_booked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.availability_slots OWNER TO postgres;

--
-- Name: availability_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.availability_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.availability_slots_id_seq OWNER TO postgres;

--
-- Name: availability_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.availability_slots_id_seq OWNED BY public.availability_slots.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    type character varying(50) DEFAULT 'INFO'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: provider_leaves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provider_leaves (
    id integer NOT NULL,
    provider_id integer,
    leave_date date NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.provider_leaves OWNER TO postgres;

--
-- Name: provider_leaves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.provider_leaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.provider_leaves_id_seq OWNER TO postgres;

--
-- Name: provider_leaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.provider_leaves_id_seq OWNED BY public.provider_leaves.id;


--
-- Name: provider_working_hours; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.provider_working_hours (
    id integer NOT NULL,
    provider_id integer,
    start_date date NOT NULL,
    end_date date NOT NULL,
    daily_start time without time zone NOT NULL,
    daily_end time without time zone NOT NULL,
    slot_duration integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    resource_id integer
);


ALTER TABLE public.provider_working_hours OWNER TO postgres;

--
-- Name: provider_working_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.provider_working_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.provider_working_hours_id_seq OWNER TO postgres;

--
-- Name: provider_working_hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.provider_working_hours_id_seq OWNED BY public.provider_working_hours.id;


--
-- Name: providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.providers (
    id integer NOT NULL,
    user_id integer,
    specialization character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.providers OWNER TO postgres;

--
-- Name: providers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.providers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.providers_id_seq OWNER TO postgres;

--
-- Name: providers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.providers_id_seq OWNED BY public.providers.id;


--
-- Name: resource_waitlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource_waitlist (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    resource_id integer NOT NULL,
    requested_start_time timestamp with time zone NOT NULL,
    requested_end_time timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'WAITING'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.resource_waitlist OWNER TO postgres;

--
-- Name: resource_waitlist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resource_waitlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resource_waitlist_id_seq OWNER TO postgres;

--
-- Name: resource_waitlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resource_waitlist_id_seq OWNED BY public.resource_waitlist.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    is_available boolean DEFAULT true
);


ALTER TABLE public.resources OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO postgres;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100),
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'PROVIDER'::character varying, 'CLIENT'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waitlist (
    id integer NOT NULL,
    slot_id integer,
    client_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.waitlist OWNER TO postgres;

--
-- Name: waitlist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.waitlist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.waitlist_id_seq OWNER TO postgres;

--
-- Name: waitlist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.waitlist_id_seq OWNED BY public.waitlist.id;


--
-- Name: appointment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_history ALTER COLUMN id SET DEFAULT nextval('public.appointment_history_id_seq'::regclass);


--
-- Name: appointments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments ALTER COLUMN id SET DEFAULT nextval('public.appointments_id_seq'::regclass);


--
-- Name: availability_slots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_slots ALTER COLUMN id SET DEFAULT nextval('public.availability_slots_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: provider_leaves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_leaves ALTER COLUMN id SET DEFAULT nextval('public.provider_leaves_id_seq'::regclass);


--
-- Name: provider_working_hours id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_working_hours ALTER COLUMN id SET DEFAULT nextval('public.provider_working_hours_id_seq'::regclass);


--
-- Name: providers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.providers ALTER COLUMN id SET DEFAULT nextval('public.providers_id_seq'::regclass);


--
-- Name: resource_waitlist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_waitlist ALTER COLUMN id SET DEFAULT nextval('public.resource_waitlist_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: waitlist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist ALTER COLUMN id SET DEFAULT nextval('public.waitlist_id_seq'::regclass);


--
-- Data for Name: appointment_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointment_history (id, appointment_id, action, performed_by, "timestamp", notes) FROM stdin;
17	13	CREATED	9	2026-02-17 12:27:58.631851+05:30	\N
18	13	RESCHEDULED	9	2026-02-17 12:28:17.347611+05:30	\N
19	14	CREATED	18	2026-02-17 12:39:21.244831+05:30	\N
20	15	CREATED	18	2026-02-17 13:09:30.637106+05:30	\N
21	17	CREATED	9	2026-02-17 13:18:17.828167+05:30	\N
22	19	CREATED	9	2026-02-17 15:43:27.69783+05:30	\N
23	20	CREATED	9	2026-02-17 15:44:39.839201+05:30	\N
24	21	CREATED	19	2026-02-17 16:57:09.268144+05:30	\N
25	21	RESCHEDULED	19	2026-02-17 16:57:18.097563+05:30	\N
26	55	CREATED	9	2026-02-18 12:13:06.393947+05:30	\N
27	56	CREATED	9	2026-02-18 12:29:29.010845+05:30	\N
28	57	CREATED	18	2026-02-18 15:27:29.129362+05:30	\N
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appointments (id, slot_id, client_id, status, booked_at, cancelled_at, rescheduled_from, created_at, deleted_at, appointment_date, start_time, end_time, duration_minutes) FROM stdin;
13	185	9	CANCELLED	2026-02-17 12:27:58.631851+05:30	\N	\N	2026-02-17 12:27:58.631851+05:30	\N	\N	\N	\N	\N
14	184	18	CANCELLED	2026-02-17 12:39:21.244831+05:30	\N	\N	2026-02-17 12:39:21.244831+05:30	\N	\N	\N	\N	\N
15	183	18	CANCELLED	2026-02-17 13:09:30.637106+05:30	\N	\N	2026-02-17 13:09:30.637106+05:30	\N	\N	\N	\N	\N
17	194	9	CANCELLED	2026-02-17 13:18:17.828167+05:30	\N	\N	2026-02-17 13:18:17.828167+05:30	\N	\N	\N	\N	\N
18	194	11	BOOKED	2026-02-17 13:18:59.254522+05:30	\N	\N	2026-02-17 13:18:59.254522+05:30	\N	\N	\N	\N	\N
16	183	9	CANCELLED	2026-02-17 13:10:15.61729+05:30	\N	\N	2026-02-17 13:10:15.61729+05:30	\N	\N	\N	\N	\N
19	208	9	CANCELLED	2026-02-17 15:43:27.69783+05:30	\N	\N	2026-02-17 15:43:27.69783+05:30	\N	\N	\N	\N	\N
21	187	19	BOOKED	2026-02-17 16:57:09.268144+05:30	\N	\N	2026-02-17 16:57:09.268144+05:30	\N	\N	\N	\N	\N
20	204	9	CANCELLED	2026-02-17 15:44:39.839201+05:30	\N	\N	2026-02-17 15:44:39.839201+05:30	\N	\N	\N	\N	\N
55	195	9	BOOKED	2026-02-18 12:13:06.393947+05:30	\N	\N	2026-02-18 12:13:06.393947+05:30	\N	\N	\N	\N	\N
56	190	9	BOOKED	2026-02-18 12:29:29.010845+05:30	\N	\N	2026-02-18 12:29:29.010845+05:30	\N	\N	\N	\N	\N
22	204	11	CANCELLED	2026-02-17 17:10:51.056649+05:30	\N	\N	2026-02-17 17:10:51.056649+05:30	\N	\N	\N	\N	\N
57	208	18	CANCELLED	2026-02-18 15:27:29.129362+05:30	\N	\N	2026-02-18 15:27:29.129362+05:30	\N	\N	\N	\N	\N
58	208	11	BOOKED	2026-02-18 15:28:56.525402+05:30	\N	\N	2026-02-18 15:28:56.525402+05:30	\N	\N	\N	\N	\N
\.


--
-- Data for Name: availability_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.availability_slots (id, provider_id, resource_id, start_time, end_time, is_booked, created_at, deleted_at) FROM stdin;
186	6	1	2026-02-18 10:30:00+05:30	2026-02-18 11:00:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
188	6	1	2026-02-18 11:30:00+05:30	2026-02-18 12:00:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
189	6	1	2026-02-18 12:00:00+05:30	2026-02-18 12:30:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
191	6	1	2026-02-18 13:00:00+05:30	2026-02-18 13:30:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
192	6	1	2026-02-18 13:30:00+05:30	2026-02-18 14:00:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
193	6	1	2026-02-18 14:00:00+05:30	2026-02-18 14:30:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
185	6	1	2026-02-18 10:00:00+05:30	2026-02-18 10:30:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
184	6	1	2026-02-18 09:30:00+05:30	2026-02-18 10:00:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
196	5	4	2026-02-20 11:00:00+05:30	2026-02-20 12:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
197	5	4	2026-02-20 12:00:00+05:30	2026-02-20 13:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
198	5	4	2026-02-20 13:00:00+05:30	2026-02-20 14:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
199	5	4	2026-02-20 14:00:00+05:30	2026-02-20 15:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
200	5	4	2026-02-20 15:00:00+05:30	2026-02-20 16:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
201	5	4	2026-02-20 16:00:00+05:30	2026-02-20 17:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
202	5	4	2026-02-20 17:00:00+05:30	2026-02-20 18:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
203	5	4	2026-02-20 18:00:00+05:30	2026-02-20 19:00:00+05:30	f	2026-02-17 13:17:54.384925+05:30	\N
194	5	4	2026-02-20 09:00:00+05:30	2026-02-20 10:00:00+05:30	t	2026-02-17 13:17:54.384925+05:30	\N
205	4	3	2026-02-19 11:00:00+05:30	2026-02-19 12:00:00+05:30	f	2026-02-17 15:41:23.062585+05:30	\N
206	4	3	2026-02-19 12:00:00+05:30	2026-02-19 13:00:00+05:30	f	2026-02-17 15:41:23.062585+05:30	\N
207	4	3	2026-02-19 13:00:00+05:30	2026-02-19 14:00:00+05:30	f	2026-02-17 15:41:23.062585+05:30	\N
183	6	1	2026-02-18 09:00:00+05:30	2026-02-18 09:30:00+05:30	f	2026-02-17 12:17:32.282228+05:30	\N
187	6	1	2026-02-18 11:00:00+05:30	2026-02-18 11:30:00+05:30	t	2026-02-17 12:17:32.282228+05:30	\N
195	5	4	2026-02-20 10:00:00+05:30	2026-02-20 11:00:00+05:30	t	2026-02-17 13:17:54.384925+05:30	\N
190	6	1	2026-02-18 12:30:00+05:30	2026-02-18 13:00:00+05:30	t	2026-02-17 12:17:32.282228+05:30	\N
204	4	3	2026-02-19 10:00:00+05:30	2026-02-19 11:00:00+05:30	f	2026-02-17 15:41:23.062585+05:30	\N
208	5	2	2026-02-19 10:00:00+05:30	2026-02-19 11:00:00+05:30	t	2026-02-17 15:42:45.412922+05:30	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, is_read, type, created_at) FROM stdin;
28	15	Availability Creation Failed	You attempted to create availability for past dates. Only future dates are allowed.	f	DANGER	2026-02-18 12:31:24.443841
2	22	Account Updated	Your provider account has been updated by the admin. Name: srihari, Specialization: Senior surgeon.	f	INFO	2026-02-18 11:30:05.894432
29	15	Availability Creation Failed	You attempted to create availability for past dates. Only future dates are allowed.	f	DANGER	2026-02-18 12:32:26.970295
10	10	New Appointment Booked	A new appointment has been booked for 20/2/2026, 10:00:00 am to 20/2/2026, 11:00:00 am.	t	INFO	2026-02-18 12:13:06.743793
12	10	Login Successful	Welcome back! You logged in successfully as PROVIDER.	t	SUCCESS	2026-02-18 12:13:20.172702
30	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 12:32:50.712824
1	1	Login Successful	Welcome back! You logged in successfully as ADMIN.	t	SUCCESS	2026-02-18 11:29:44.838173
3	1	Provider Updated	Provider Dr. srihari (srihari@gmail.com) has been updated successfully.	t	SUCCESS	2026-02-18 11:30:05.895084
5	21	Account Updated	Your provider account has been updated by the admin. Name: Somu, Specialization: Surgeon.	f	INFO	2026-02-18 12:05:16.711935
4	1	Login Successful	Welcome back! You logged in successfully as ADMIN.	t	SUCCESS	2026-02-18 12:04:47.549835
6	1	Provider Updated	Provider Dr. Somu (somu@gmail.com) has been updated successfully.	t	SUCCESS	2026-02-18 12:05:16.712705
11	1	New Appointment	A new appointment was booked with Dr. Ram at 20/2/2026, 10:00:00 am.	t	INFO	2026-02-18 12:13:06.745051
13	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 12:26:28.119429
7	9	Login Successful	Welcome back! You logged in successfully as CLIENT.	t	SUCCESS	2026-02-18 12:06:49.176348
8	9	Booking Failed	Your booking attempt failed. Reason: Cannot book past time slot	t	DANGER	2026-02-18 12:07:05.812307
9	9	Appointment Booked!	Your appointment with Dr. Ram is confirmed from 20/2/2026, 10:00:00 am to 20/2/2026, 11:00:00 am.	f	SUCCESS	2026-02-18 12:13:06.741763
14	22	Account Updated	Your provider account has been updated by the admin. Name: srihari, Specialization: Senior Surgeon.	f	INFO	2026-02-18 12:26:41.031609
16	23	Account Created	Welcome Dr. dharshan! Your provider account has been created by the admin. Specialization: general.	f	SUCCESS	2026-02-18 12:27:21.518256
15	1	Provider Updated	Provider Dr. srihari (srihari@gmail.com) has been updated successfully.	t	SUCCESS	2026-02-18 12:26:41.032536
17	1	Provider Created	New provider Dr. dharshan (dharshan@gmail.com) with specialization "general" has been added.	t	SUCCESS	2026-02-18 12:27:21.519683
18	1	Resource Created	New resource "CT Scan" of type "Room" has been added.	t	SUCCESS	2026-02-18 12:27:56.566457
21	9	Login Successful	Welcome back! You logged in as CLIENT.	f	SUCCESS	2026-02-18 12:28:47.127501
22	9	Booking Failed	Your booking attempt failed. Reason: Cannot book past time slot	f	DANGER	2026-02-18 12:29:02.437574
23	9	Booking Failed	Your booking attempt failed. Reason: Cannot book past time slot	f	DANGER	2026-02-18 12:29:15.705224
24	9	Appointment Booked!	Your appointment with Dr. Gopal kumar is confirmed from 18/2/2026, 12:30:00 pm to 18/2/2026, 1:00:00 pm.	f	SUCCESS	2026-02-18 12:29:29.024384
25	15	New Appointment Booked	A new appointment has been booked for 18/2/2026, 12:30:00 pm to 18/2/2026, 1:00:00 pm.	f	INFO	2026-02-18 12:29:29.025055
27	15	Login Successful	Welcome back! You logged in as PROVIDER.	f	SUCCESS	2026-02-18 12:30:08.573005
32	11	Login Successful	Welcome back! You logged in as CLIENT.	t	SUCCESS	2026-02-18 12:53:39.951576
33	11	Booking Failed	Your booking attempt failed. Reason: Cannot book past time slot	t	DANGER	2026-02-18 12:53:57.201636
36	10	Login Successful	Welcome back! You logged in as PROVIDER.	t	SUCCESS	2026-02-18 13:05:13.176548
19	1	Resource Updated	Resource "CT ScaN" has been updated successfully.	t	SUCCESS	2026-02-18 12:28:06.232163
20	1	Resource Updated	Resource "CT Scan" has been updated successfully.	t	SUCCESS	2026-02-18 12:28:12.43419
26	1	New Appointment	A new appointment was booked with Dr. Gopal kumar at 18/2/2026, 12:30:00 pm.	t	INFO	2026-02-18 12:29:29.026038
31	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 12:50:39.205824
34	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 12:59:28.556813
35	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 13:04:33.586773
37	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 15:22:59.985099
38	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 15:23:21.580644
39	1	Login Successful	Welcome back! You logged in as ADMIN.	t	SUCCESS	2026-02-18 15:25:13.522647
40	22	Account Updated	Your provider account has been updated by the admin. Name: srihari, Specialization: Senior Surgeon.	f	INFO	2026-02-18 15:25:36.69758
41	1	Provider Updated	Provider Dr. srihari (srihari@gmail.com) has been updated successfully.	f	SUCCESS	2026-02-18 15:25:36.698836
42	22	Account Disabled	Your account has been disabled by the admin. Please contact support.	f	DANGER	2026-02-18 15:25:51.71793
43	1	Provider Disabled	Dr. srihari (srihari@gmail.com) has been disabled.	f	WARNING	2026-02-18 15:25:51.719093
44	22	Account Re-enabled	Your account has been re-enabled by the admin. You can now log in.	f	SUCCESS	2026-02-18 15:26:00.663846
45	1	Provider Enabled	Dr. srihari (srihari@gmail.com) has been re-enabled successfully.	f	SUCCESS	2026-02-18 15:26:00.665179
46	18	Login Successful	Welcome back! You logged in as CLIENT.	f	SUCCESS	2026-02-18 15:27:23.256377
47	18	Appointment Booked!	Your appointment with Dr. Ram is confirmed from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am.	f	SUCCESS	2026-02-18 15:27:29.14556
48	10	New Appointment Booked	A new appointment has been booked for 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am.	f	INFO	2026-02-18 15:27:29.146675
49	1	New Appointment	A new appointment was booked with Dr. Ram at 19/2/2026, 10:00:00 am.	f	INFO	2026-02-18 15:27:29.14741
50	11	Login Successful	Welcome back! You logged in as CLIENT.	f	SUCCESS	2026-02-18 15:27:52.310979
51	11	Booking Failed	Your booking attempt failed. Reason: You already have another appointment during this time	f	DANGER	2026-02-18 15:27:56.510899
52	11	Booking Failed	Your booking attempt failed. Reason: You already have another appointment during this time	f	DANGER	2026-02-18 15:28:21.650086
53	11	Appointment Cancelled	Your appointment with Dr. Alex kumar from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am has been cancelled.	f	WARNING	2026-02-18 15:28:30.520203
54	8	Appointment Cancelled	An appointment from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am was cancelled by the client.	f	WARNING	2026-02-18 15:28:30.523454
55	1	Appointment Cancelled	An appointment with Dr. Alex kumar at 19/2/2026, 10:00:00 am was cancelled.	f	WARNING	2026-02-18 15:28:30.524376
56	11	Appointment Booked!	Your appointment with Dr. Ram is confirmed from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am.	f	SUCCESS	2026-02-18 15:28:37.270641
57	10	New Appointment Booked	A new appointment has been booked for 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am.	f	INFO	2026-02-18 15:28:37.271579
58	1	New Appointment	A new appointment was booked with Dr. Ram at 19/2/2026, 10:00:00 am.	f	INFO	2026-02-18 15:28:37.272496
59	18	Login Successful	Welcome back! You logged in as CLIENT.	f	SUCCESS	2026-02-18 15:28:47.307429
60	18	Appointment Cancelled	Your appointment with Dr. Ram from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am has been cancelled.	f	WARNING	2026-02-18 15:28:56.67751
61	10	Appointment Cancelled	An appointment from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am was cancelled by the client.	f	WARNING	2026-02-18 15:28:56.68368
62	1	Appointment Cancelled	An appointment with Dr. Ram at 19/2/2026, 10:00:00 am was cancelled.	f	WARNING	2026-02-18 15:28:56.684887
63	11	🎉 Slot Available - You're Booked!	Great news! A slot with Dr. Ram from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am has been automatically booked for you from the waitlist.	f	SUCCESS	2026-02-18 15:28:56.687596
64	10	Waitlist Booking Confirmed	The cancelled slot from 19/2/2026, 10:00:00 am to 19/2/2026, 11:00:00 am has been assigned to the next person on the waitlist.	f	INFO	2026-02-18 15:28:56.688155
65	9	Login Successful	Welcome back! You logged in as CLIENT.	f	SUCCESS	2026-02-18 15:29:04.107461
66	10	Login Successful	Welcome back! You logged in as PROVIDER.	f	SUCCESS	2026-02-18 15:29:37.975331
67	1	Login Successful	Welcome back! You logged in as ADMIN.	f	SUCCESS	2026-02-18 15:34:52.223661
68	1	Login Successful	Welcome back! You logged in as ADMIN.	f	SUCCESS	2026-02-18 15:35:25.395692
69	1	Login Successful	Welcome back! You logged in as ADMIN.	f	SUCCESS	2026-02-18 15:35:46.723592
\.


--
-- Data for Name: provider_leaves; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.provider_leaves (id, provider_id, leave_date, reason, created_at) FROM stdin;
\.


--
-- Data for Name: provider_working_hours; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.provider_working_hours (id, provider_id, start_date, end_date, daily_start, daily_end, slot_duration, created_at, resource_id) FROM stdin;
12	6	2026-02-18	2026-02-18	09:00:00	14:30:00	30	2026-02-17 12:17:32.282228	1
15	5	2026-02-20	2026-02-20	09:00:00	19:00:00	60	2026-02-17 13:17:54.384925	4
16	4	2026-02-19	2026-02-19	10:00:00	14:00:00	60	2026-02-17 15:41:23.062585	3
17	5	2026-02-19	2026-02-19	10:00:00	11:30:00	60	2026-02-17 15:42:45.412922	2
\.


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.providers (id, user_id, specialization, created_at, deleted_at) FROM stdin;
5	10	Dermatology	2026-02-16 15:14:41.697674+05:30	\N
7	20	MS	2026-02-17 16:58:26.132899+05:30	\N
6	15	general	2026-02-17 09:46:30.230537+05:30	\N
4	8	ENT	2026-02-16 13:50:56.852601+05:30	\N
8	21	Surgeon	2026-02-18 10:10:04.905921+05:30	\N
10	23	general	2026-02-18 12:27:21.516535+05:30	\N
9	22	Senior Surgeon	2026-02-18 10:52:27.208754+05:30	\N
\.


--
-- Data for Name: resource_waitlist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resource_waitlist (id, provider_id, resource_id, requested_start_time, requested_end_time, status, created_at) FROM stdin;
6	6	1	2026-02-18 10:20:00+05:30	2026-02-18 14:20:00+05:30	WAITING	2026-02-17 12:18:13.210833+05:30
7	4	1	2026-02-18 09:20:00+05:30	2026-02-18 16:00:00+05:30	WAITING	2026-02-17 12:20:29.629069+05:30
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.resources (id, name, type, created_at, deleted_at, is_available) FROM stdin;
1	Room 100	Room	2026-02-14 17:54:04.401111+05:30	\N	t
2	Room 101	Room	2026-02-16 16:29:54.613103+05:30	\N	t
4	MRI Machine	Equipment	2026-02-16 16:38:07.286658+05:30	\N	t
3	Room 104	Room	2026-02-16 16:37:21.071705+05:30	\N	t
5	CT Scan	Room	2026-02-18 12:27:56.560735+05:30	\N	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, role, created_at, deleted_at) FROM stdin;
1	Admin User	admin@test.com	$2b$10$iKYIudpV9BZB6ZCx0DA.IOu0sCozd8fi/Bn9evcYzo/U7xj.OEdaS	ADMIN	2026-02-14 16:40:44.946479+05:30	\N
10	Ram	ram@gmail.com	$2b$10$N5A36YD0qC.Gfxjvuaxble46RTZ68E2Jqfph6brhNA90QrvXMGb9a	PROVIDER	2026-02-16 15:14:41.659846+05:30	\N
14	client5	client5@gmail.com	$2b$10$JYaZj2oWB8xuQ6P51tqute55YxSkO2sDWqCP14k5vFYHlfts39VNu	CLIENT	2026-02-16 15:50:02.7458+05:30	\N
13	client4	client4@gmail.com	$2b$10$Z9qLwTEMxq7.ZpqwA.C7yOy.7yh.uSV.WXnFsThhK0nu6FhNoQhzm	CLIENT	2026-02-16 15:48:02.412526+05:30	\N
9	client1	client1@gmail.com	$2b$10$C4ImEYwUSDuQ69KuxmQn9OmGTGER8CJzGZpqQM6ptxf/hk0DG/ip2	CLIENT	2026-02-16 14:01:09.697285+05:30	\N
12	client3	client3@gmail.com	$2b$10$NfwmOnDDkVTc9XSHzCtmweyYcbLkspfkg0CEWUxsIUkwviuAyvUG.	CLIENT	2026-02-16 15:46:09.193824+05:30	\N
11	client2	client2@gmail.com	$2b$10$cq1sQ7Gi1Za.VyLGQPZejelF9EQRTBGMavHXF0i05tDJOi73N2786	CLIENT	2026-02-16 15:40:53.199071+05:30	\N
16	client6	client6@test.com	$2b$10$1.Zd1g/hUtgZA.W.vFnptelhcK9aiqxXIVJgW4rqQPleGbaDEqHHu	CLIENT	2026-02-17 12:26:05.900692+05:30	\N
18	client7	client7@gmail.com	$2b$10$9FwwWmrX53QJjrTbla5ugO7Nv9khY/UwMa2WdDLzCfvtyxRv4rqnC	CLIENT	2026-02-17 12:38:59.378801+05:30	\N
19	client 10	client10@gmail.com	$2b$10$JQQ739OUPM/0j5.2Xd/.ju/GVkEpltT5S4vrWGnmfGgAUwakrOr9S	CLIENT	2026-02-17 16:56:10.939882+05:30	\N
20	john	john@gmail.com	$2b$10$9r80JYfSFIaE9SsnShZyGuAW4vW5fKWC30gRGMcbuCdQBfOG2WL8y	PROVIDER	2026-02-17 16:58:26.096132+05:30	\N
15	Gopal kumar	gopal@gmail.com	$2b$10$p/0.a15GDmIQVLqBeN.Fp.Q1W1W4LQekXcJWmkzRGmmJwFe683dUy	PROVIDER	2026-02-17 09:46:30.207633+05:30	\N
8	Alex kumar	alex1@gmail.com	$2b$10$kSjp.2T/Ft93xvO9sQiIpuKIQJX6D0q91IEkbyochOmNi9V2tT10C	PROVIDER	2026-02-16 13:50:56.83128+05:30	\N
21	Somu	somu@gmail.com	$2b$10$1WJ4F5VjiRG4D9YgjfeT8..DfEyIcvVSgfveQfZ1kl5N2Kd5psZfS	PROVIDER	2026-02-18 10:10:04.864791+05:30	\N
23	dharshan	dharshan@gmail.com	$2b$10$ficioU6PRlNVGpCdxbGJx.VSN1Dz45EhN8gqcKihECymqDAhEfYwC	PROVIDER	2026-02-18 12:27:21.51339+05:30	\N
22	srihari	srihari@gmail.com	$2b$10$9uDQ6Yhy6wMH2mdg9R.bGOwHBi1HrlzUFP/xoFfwDDEPa1rnYP9Fa	PROVIDER	2026-02-18 10:52:27.194536+05:30	\N
\.


--
-- Data for Name: waitlist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.waitlist (id, slot_id, client_id, created_at) FROM stdin;
\.


--
-- Name: appointment_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointment_history_id_seq', 28, true);


--
-- Name: appointments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appointments_id_seq', 58, true);


--
-- Name: availability_slots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.availability_slots_id_seq', 208, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 69, true);


--
-- Name: provider_leaves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.provider_leaves_id_seq', 1, false);


--
-- Name: provider_working_hours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.provider_working_hours_id_seq', 17, true);


--
-- Name: providers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.providers_id_seq', 10, true);


--
-- Name: resource_waitlist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resource_waitlist_id_seq', 7, true);


--
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.resources_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 23, true);


--
-- Name: waitlist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.waitlist_id_seq', 39, true);


--
-- Name: appointment_history appointment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: availability_slots availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: provider_leaves provider_leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_leaves
    ADD CONSTRAINT provider_leaves_pkey PRIMARY KEY (id);


--
-- Name: provider_working_hours provider_working_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_working_hours
    ADD CONSTRAINT provider_working_hours_pkey PRIMARY KEY (id);


--
-- Name: providers providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_pkey PRIMARY KEY (id);


--
-- Name: resource_waitlist resource_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_waitlist
    ADD CONSTRAINT resource_waitlist_pkey PRIMARY KEY (id);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);


--
-- Name: appointment_history appointment_history_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id);


--
-- Name: appointment_history appointment_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointment_history
    ADD CONSTRAINT appointment_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: appointments appointments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: appointments appointments_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.availability_slots(id);


--
-- Name: availability_slots availability_slots_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: availability_slots availability_slots_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.availability_slots
    ADD CONSTRAINT availability_slots_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: providers fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: provider_leaves provider_leaves_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_leaves
    ADD CONSTRAINT provider_leaves_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: provider_working_hours provider_working_hours_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_working_hours
    ADD CONSTRAINT provider_working_hours_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: provider_working_hours provider_working_hours_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.provider_working_hours
    ADD CONSTRAINT provider_working_hours_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: providers providers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: waitlist waitlist_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id);


--
-- Name: resource_waitlist waitlist_provider_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_waitlist
    ADD CONSTRAINT waitlist_provider_fk FOREIGN KEY (provider_id) REFERENCES public.providers(id);


--
-- Name: resource_waitlist waitlist_resource_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_waitlist
    ADD CONSTRAINT waitlist_resource_fk FOREIGN KEY (resource_id) REFERENCES public.resources(id);


--
-- Name: waitlist waitlist_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.availability_slots(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 41qqQ7CTnNZ39IalPfh0nixxD81ZlzvqR10yrigjz7ooaaRWEisJ4hZlDpxvQzK

