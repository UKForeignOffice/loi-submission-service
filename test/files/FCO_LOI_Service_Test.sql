--
-- PostgreSQL database dump
--

-- Dumped from database version 9.3.10
-- Dumped by pg_dump version 9.3.10
-- Started on 2016-01-22 14:36:06 GMT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
--END;

--close any connections to the test dat

select pg_terminate_backend(pid) from pg_stat_activity where datname='FCO-LOI-Service-Test';

DROP DATABASE IF EXISTS "FCO-LOI-Service-Test";
--
-- TOC entry 2130 (class 1262 OID 17007)
-- Name: FCO-LOI-Service-Test; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE "FCO-LOI-Service-Test" WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'en_GB.UTF-8' LC_CTYPE = 'en_GB.UTF-8';


ALTER DATABASE "FCO-LOI-Service-Test" OWNER TO postgres;

\connect "FCO-LOI-Service-Test"

--
-- PostgreSQL database dump
--

-- Dumped from database version 9.3.10
-- Dumped by pg_dump version 9.3.10
-- Started on 2016-02-10 11:45:49 GMT

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- TOC entry 203 (class 3079 OID 11787)
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- TOC entry 2155 (class 0 OID 0)
-- Dependencies: 203
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- TOC entry 216 (class 1255 OID 72297)
-- Name: dashboard_data(integer, integer, integer, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION dashboard_data(_user_id integer, _limit integer, _offset integer, _orderby text, _direction text, query_string text) RETURNS TABLE(createddate date, unique_app_id text, applicationtype text, doc_count integer, payment_amount numeric, user_ref text, result_count integer)
    LANGUAGE plpgsql
    AS $_$
  declare	result_count integer;
BEGIN

select count(*) into result_count
	from "Application" app inner join
	"ExportedApplicationData" ead
	on app.application_id = ead.application_id
	where app.user_id=_user_id
	and (
		(ead.unique_app_id ilike query_string)
	or
		(ead.user_ref ilike query_string)
	);


  RETURN QUERY EXECUTE '
	select
	app."createdAt" as "createdDate",
	ead.unique_app_id,
	ead."applicationType",
	ead.doc_count,
	ead.payment_amount,
	ead.user_ref, '
	|| result_count || ' as result_count
	from "Application" app inner join
	"ExportedApplicationData" ead
	on app.application_id = ead.application_id
	where app.user_id=$1
	and (
		(ead.unique_app_id ilike ' || quote_literal(query_string)  || ')
	or
		(ead.user_ref ilike ' || quote_literal(query_string)  || ')
	)
	order by ' ||  _orderby || ' ' || _direction || '
	LIMIT $2 OFFSET $3'
USING _user_id, _limit, _offset;
END;
$_$;


ALTER FUNCTION public.dashboard_data(_user_id integer, _limit integer, _offset integer, _orderby text, _direction text, query_string text) OWNER TO postgres;

--
-- TOC entry 217 (class 1255 OID 80484)
-- Name: populate_exportedapplicationdata(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION populate_exportedapplicationdata(_application_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
	rows_affected integer;
BEGIN
WITH rows AS (
    INSERT INTO "ExportedApplicationData" (
	    application_id,
	    "applicationType",
	    first_name,
	    last_name,
	    telephone,
	    email,
	    doc_count,
	    user_ref,
	    payment_reference,
	    payment_amount,
	    postage_return_title,
	    postage_return_price,
	    postage_send_title,
	    postage_send_price,
	    main_full_name,
	    main_house_name,
	    main_street,
	    main_town,
	    main_county,
	    main_country,
	    main_postcode,
	    alt_full_name,
	    alt_house_name,
	    alt_street,
	    alt_town,
	    alt_county,
	    alt_country,
	    alt_postcode,
	    total_docs_count_price,
	    feedback_consent,
	    unique_app_id
    )
    select app.application_id,
	aty."casebook_description" as "applicationType",
	ud.first_name,
	ud.last_name,
	ud.telephone,
	ud.email,
        udc.doc_count,
        aai.user_ref,
        pymt.payment_reference,
        pymt.payment_amount,
        (select pa.casebook_description as postage_return_title from "UserPostageDetails" upd
        join "PostagesAvailable" pa on upd.postage_available_id=pa.id
        where pa.type='return' and upd.application_id=_application_id),
        (select pa.price as postage_return_price  from "UserPostageDetails" upd
        join "PostagesAvailable" pa on upd.postage_available_id=pa.id
        where pa.type='return' and upd.application_id=_application_id),
        (select pa.title as postage_send_title  from "UserPostageDetails" upd
        join "PostagesAvailable" pa on upd.postage_available_id=pa.id
        where pa.type='send' and upd.application_id=_application_id),
        (select pa.price as postage_send_price from "UserPostageDetails" upd
        join "PostagesAvailable" pa on upd.postage_available_id=pa.id
        where pa.type='send' and upd.application_id=_application_id),
        (select full_name AS main_full_name from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select house_name AS main_house_name from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select street AS main_street from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select town AS main_town from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select county AS main_county from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select country AS main_country from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select postcode AS main_postcode from "AddressDetails" addd
        where addd.type='main' and addd.application_id=_application_id),
        (select full_name AS alt_full_name from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select house_name AS alt_house_name from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select street AS alt_street from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select town AS alt_town from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select county AS alt_county from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select country AS alt_country from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select postcode AS alt_postcode from "AddressDetails" addd
        where addd.type='alt' and addd.application_id=_application_id),
        (select price AS total_doc_count_price from "UserDocumentCount" where application_id=_application_id),
        (select feedback_consent AS feedback_consent from "Application" where application_id=_application_id),
        (select unique_app_id AS unique_app_id from "Application" where application_id=_application_id)
        from "Application" app
        join "ApplicationTypes" aty on aty.id=app."serviceType"
        join "UserDetails" ud on ud.application_id=app.application_id
        join "UserDocumentCount" udc on udc.application_id=app.application_id
        join "AdditionalApplicationInfo" aai on aai.application_id=app.application_id
        join "ApplicationPaymentDetails" pymt on aai.application_id=pymt.application_id
        where app.application_id=_application_id

        RETURNING 1
)

SELECT count(*) into rows_affected FROM Rows;
RETURN rows_affected;
END;
$$;


ALTER FUNCTION public.populate_exportedapplicationdata(_application_id integer) OWNER TO postgres;

--
-- TOC entry 170 (class 1259 OID 72015)
-- Name: useradditionalapplicationinfo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE useradditionalapplicationinfo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.useradditionalapplicationinfo_seq OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- TOC entry 171 (class 1259 OID 72017)
-- Name: AdditionalApplicationInfo; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "AdditionalApplicationInfo" (
    special_instructions text,
    user_ref text,
    application_id integer,
    "createdAt" date,
    "updatedAt" date,
    id integer DEFAULT nextval('useradditionalapplicationinfo_seq'::regclass) NOT NULL
);


ALTER TABLE public."AdditionalApplicationInfo" OWNER TO postgres;

--
-- TOC entry 202 (class 1259 OID 80449)
-- Name: AddressDetails; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "AddressDetails" (
    application_id integer,
    full_name text,
    postcode text,
    house_name text,
    street text,
    town text,
    county text,
    country text,
    type text,
    "updatedAt" timestamp without time zone,
    "createdAt" timestamp without time zone,
    id integer
);


ALTER TABLE public."AddressDetails" OWNER TO postgres;

--
-- TOC entry 2156 (class 0 OID 0)
-- Dependencies: 202
-- Name: TABLE "AddressDetails"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "AddressDetails" IS 'Temp';


--
-- TOC entry 172 (class 1259 OID 72036)
-- Name: Application; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "Application" (
    application_id integer NOT NULL,
    submitted text,
    "createdAt" date,
    "updatedAt" date,
    "serviceType" integer,
    unique_app_id text,
    feedback_consent boolean,
    application_reference text,
    case_reference text,
    user_id integer,
    application_guid text
);


ALTER TABLE public."Application" OWNER TO postgres;

--
-- TOC entry 173 (class 1259 OID 72042)
-- Name: userdocumentcount_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE userdocumentcount_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.userdocumentcount_seq OWNER TO postgres;

--
-- TOC entry 174 (class 1259 OID 72044)
-- Name: ApplicationPaymentDetails; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "ApplicationPaymentDetails" (
    application_id integer NOT NULL,
    payment_complete boolean DEFAULT false NOT NULL,
    payment_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    payment_reference text,
    id integer DEFAULT nextval('userdocumentcount_seq'::regclass) NOT NULL,
    "createdAt" date,
    "updatedAt" date,
    payment_status text,
    oneclick_reference text
);


ALTER TABLE public."ApplicationPaymentDetails" OWNER TO postgres;

--
-- TOC entry 175 (class 1259 OID 72053)
-- Name: ApplicationReference; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "ApplicationReference" (
    "lastUsedID" integer,
    "createdAt" date,
    "updatedAt" date,
    id integer
);


ALTER TABLE public."ApplicationReference" OWNER TO postgres;

--
-- TOC entry 176 (class 1259 OID 72056)
-- Name: applicationtype_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE applicationtype_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.applicationtype_seq OWNER TO postgres;

--
-- TOC entry 177 (class 1259 OID 72058)
-- Name: ApplicationTypes; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "ApplicationTypes" (
    "applicationType" text,
    id integer DEFAULT nextval('applicationtype_seq'::regclass) NOT NULL,
    casebook_description text
);


ALTER TABLE public."ApplicationTypes" OWNER TO postgres;

--
-- TOC entry 178 (class 1259 OID 72065)
-- Name: doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE doc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.doc_id_seq OWNER TO postgres;

--
-- TOC entry 179 (class 1259 OID 72067)
-- Name: AvailableDocuments; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "AvailableDocuments" (
    doc_id integer DEFAULT nextval('doc_id_seq'::regclass),
    "updatedAt" date,
    "createdAt" date,
    html_id text,
    certification_notes text,
    additional_notes text,
    legislation_allowed boolean,
    photocopy_allowed boolean,
    certification_required boolean,
    doc_type_id text,
    doc_title text
);


ALTER TABLE public."AvailableDocuments" OWNER TO postgres;

--
-- TOC entry 2157 (class 0 OID 0)
-- Dependencies: 179
-- Name: COLUMN "AvailableDocuments".additional_notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "AvailableDocuments".additional_notes IS '
';


--
-- TOC entry 180 (class 1259 OID 72074)
-- Name: DocumentTypes; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "DocumentTypes" (
    doc_type text,
    doc_type_title text,
    doc_type_id integer,
    "updatedAt" date,
    "createdAt" date
);


ALTER TABLE public."DocumentTypes" OWNER TO postgres;

--
-- TOC entry 2158 (class 0 OID 0)
-- Dependencies: 180
-- Name: COLUMN "DocumentTypes".doc_type_title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "DocumentTypes".doc_type_title IS '
';


--
-- TOC entry 2159 (class 0 OID 0)
-- Dependencies: 180
-- Name: COLUMN "DocumentTypes".doc_type_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "DocumentTypes".doc_type_id IS '
';


--
-- TOC entry 181 (class 1259 OID 72080)
-- Name: exported_data; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE exported_data
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.exported_data OWNER TO postgres;

--
-- TOC entry 199 (class 1259 OID 72185)
-- Name: ExportedApplicationData; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "ExportedApplicationData" (
    application_id integer,
    "applicationType" text,
    first_name character varying(255),
    last_name character varying(255),
    telephone character varying(12),
    email character varying(255),
    doc_count integer,
    special_instructions text,
    user_ref text,
    postage_return_title text,
    postage_return_price numeric,
    postage_send_title text,
    postage_send_price numeric,
    main_house_name text,
    main_street text,
    main_town text,
    main_county text,
    main_country text,
    main_full_name text,
    alt_house_name text,
    alt_street text,
    alt_town text,
    alt_county text,
    alt_country text,
    alt_full_name text,
    feedback_consent boolean,
    total_docs_count_price numeric,
    unique_app_id text,
    id integer DEFAULT nextval('exported_data'::regclass),
    "createdAt" date,
    "updatedAt" date,
    payment_reference text,
    payment_amount numeric,
    "submittedJSON" json,
    main_postcode text,
    alt_postcode text
);


ALTER TABLE public."ExportedApplicationData" OWNER TO postgres;

--
-- TOC entry 2160 (class 0 OID 0)
-- Dependencies: 199
-- Name: COLUMN "ExportedApplicationData".telephone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "ExportedApplicationData".telephone IS '
';


--
-- TOC entry 182 (class 1259 OID 72089)
-- Name: postagesavailable_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE postagesavailable_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.postagesavailable_seq OWNER TO postgres;

--
-- TOC entry 183 (class 1259 OID 72091)
-- Name: PostagesAvailable; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "PostagesAvailable" (
    title text,
    price numeric,
    type text,
    "createdAt" date,
    "updatedAt" date,
    id integer DEFAULT nextval('postagesavailable_seq'::regclass) NOT NULL,
    casebook_description text
);


ALTER TABLE public."PostagesAvailable" OWNER TO postgres;

--
-- TOC entry 2161 (class 0 OID 0)
-- Dependencies: 183
-- Name: COLUMN "PostagesAvailable".type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "PostagesAvailable".type IS 'for sending or receiving';


--
-- TOC entry 184 (class 1259 OID 72098)
-- Name: SubmissionAttempts; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "SubmissionAttempts" (
    submission_id integer NOT NULL,
    application_id integer NOT NULL,
    retry_number integer NOT NULL,
    "timestamp" timestamp with time zone,
    submitted_json json,
    status text,
    response_status_code text,
    response_body text,
    "createdAt" date,
    "updatedAt" date
);


ALTER TABLE public."SubmissionAttempts" OWNER TO postgres;

--
-- TOC entry 185 (class 1259 OID 72104)
-- Name: SubmissionAttempts_submission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "SubmissionAttempts_submission_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."SubmissionAttempts_submission_id_seq" OWNER TO postgres;

--
-- TOC entry 2162 (class 0 OID 0)
-- Dependencies: 185
-- Name: SubmissionAttempts_submission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "SubmissionAttempts_submission_id_seq" OWNED BY "SubmissionAttempts".submission_id;


--
-- TOC entry 186 (class 1259 OID 72106)
-- Name: UserDetails; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "UserDetails" (
    id integer NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255),
    telephone character varying(12),
    email character varying(255),
    "createdAt" text,
    "updatedAt" text,
    application_id integer
);


ALTER TABLE public."UserDetails" OWNER TO postgres;

--
-- TOC entry 187 (class 1259 OID 72112)
-- Name: UserDocumentCount; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "UserDocumentCount" (
    doc_count integer,
    application_id integer,
    "createdAt" date,
    "updatedAt" date,
    id integer DEFAULT nextval('userdocumentcount_seq'::regclass) NOT NULL,
    price integer
);


ALTER TABLE public."UserDocumentCount" OWNER TO postgres;

--
-- TOC entry 188 (class 1259 OID 72116)
-- Name: UserDocuments; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "UserDocuments" (
    application_id integer NOT NULL,
    doc_id integer,
    user_doc_id integer NOT NULL,
    "updatedAt" date,
    "createdAt" date,
    certified boolean
);


ALTER TABLE public."UserDocuments" OWNER TO postgres;

--
-- TOC entry 189 (class 1259 OID 72119)
-- Name: UserDocuments_application_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE "UserDocuments_application_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."UserDocuments_application_id_seq" OWNER TO postgres;

--
-- TOC entry 2163 (class 0 OID 0)
-- Dependencies: 189
-- Name: UserDocuments_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE "UserDocuments_application_id_seq" OWNED BY "UserDocuments".application_id;


--
-- TOC entry 190 (class 1259 OID 72121)
-- Name: userpostagedetails_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE userpostagedetails_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.userpostagedetails_seq OWNER TO postgres;

--
-- TOC entry 191 (class 1259 OID 72123)
-- Name: UserPostageDetails; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE "UserPostageDetails" (
    postage_available_id integer,
    application_id integer,
    "createdAt" date,
    "updatedAt" date,
    id integer DEFAULT nextval('userpostagedetails_seq'::regclass) NOT NULL
);


ALTER TABLE public."UserPostageDetails" OWNER TO postgres;

--
-- TOC entry 192 (class 1259 OID 72127)
-- Name: application_application_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE application_application_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.application_application_id_seq OWNER TO postgres;

--
-- TOC entry 2164 (class 0 OID 0)
-- Dependencies: 192
-- Name: application_application_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE application_application_id_seq OWNED BY "Application".application_id;


--
-- TOC entry 193 (class 1259 OID 72129)
-- Name: application_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE application_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.application_id_seq OWNER TO postgres;

--
-- TOC entry 194 (class 1259 OID 72131)
-- Name: applicationpaymentdetails_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE applicationpaymentdetails_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.applicationpaymentdetails_seq OWNER TO postgres;

--
-- TOC entry 201 (class 1259 OID 80430)
-- Name: country; Type: TABLE; Schema: public; Owner: postgres; Tablespace:
--

CREATE TABLE country (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "in_EU" boolean DEFAULT false,
    casebook_mapping text
);


ALTER TABLE public.country OWNER TO postgres;

--
-- TOC entry 200 (class 1259 OID 80428)
-- Name: country_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE country_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.country_id_seq OWNER TO postgres;

--
-- TOC entry 2165 (class 0 OID 0)
-- Dependencies: 200
-- Name: country_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE country_id_seq OWNED BY country.id;


--
-- TOC entry 195 (class 1259 OID 72133)
-- Name: postages_available_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE postages_available_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.postages_available_seq OWNER TO postgres;

--
-- TOC entry 196 (class 1259 OID 72135)
-- Name: userdocuments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE userdocuments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.userdocuments_id_seq OWNER TO postgres;

--
-- TOC entry 2166 (class 0 OID 0)
-- Dependencies: 196
-- Name: userdocuments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE userdocuments_id_seq OWNED BY "UserDocuments".user_doc_id;


--
-- TOC entry 197 (class 1259 OID 72137)
-- Name: vw_ApplicationPrice; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW "vw_ApplicationPrice" AS
 SELECT udc.application_id,
    udc.price AS documents_price,
    upd.postage_available_id AS selected_postage_method,
    pa.price AS selected_postage_price,
    ((udc.price)::numeric + pa.price) AS total_price
   FROM (("UserDocumentCount" udc
     JOIN "UserPostageDetails" upd ON ((udc.application_id = upd.application_id)))
     JOIN "PostagesAvailable" pa ON (((upd.postage_available_id = pa.id) AND (pa.type = 'return'::text))));


ALTER TABLE public."vw_ApplicationPrice" OWNER TO postgres;

--
-- TOC entry 198 (class 1259 OID 72144)
-- Name: yourdetails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE yourdetails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.yourdetails_id_seq OWNER TO postgres;

--
-- TOC entry 2167 (class 0 OID 0)
-- Dependencies: 198
-- Name: yourdetails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE yourdetails_id_seq OWNED BY "UserDetails".id;


--
-- TOC entry 1968 (class 2604 OID 72147)
-- Name: application_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "Application" ALTER COLUMN application_id SET DEFAULT nextval('application_application_id_seq'::regclass);


--
-- TOC entry 1975 (class 2604 OID 72148)
-- Name: submission_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "SubmissionAttempts" ALTER COLUMN submission_id SET DEFAULT nextval('"SubmissionAttempts_submission_id_seq"'::regclass);


--
-- TOC entry 1976 (class 2604 OID 72149)
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "UserDetails" ALTER COLUMN id SET DEFAULT nextval('yourdetails_id_seq'::regclass);


--
-- TOC entry 1978 (class 2604 OID 72150)
-- Name: user_doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "UserDocuments" ALTER COLUMN user_doc_id SET DEFAULT nextval('userdocuments_id_seq'::regclass);


--
-- TOC entry 1981 (class 2604 OID 80433)
-- Name: id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY country ALTER COLUMN id SET DEFAULT nextval('country_id_seq'::regclass);


--
-- TOC entry 2117 (class 0 OID 72017)
-- Dependencies: 171
-- Data for Name: AdditionalApplicationInfo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "AdditionalApplicationInfo" (special_instructions, user_ref, application_id, "createdAt", "updatedAt", id) FROM stdin;
\N	ref	2482	2016-02-10	2016-02-10	740
\.


--
-- TOC entry 2147 (class 0 OID 80449)
-- Dependencies: 202
-- Data for Name: AddressDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "AddressDetails" (application_id, full_name, postcode, house_name, street, town, county, country, type, "updatedAt", "createdAt", id) FROM stdin;
2481	Mark Daunt	M22 4HL	26 	Allanson Rd	Manchester	Greater Manchester	United Kingdom	main	2016-02-10 10:13:39.967	2016-02-10 10:13:39.967	\N
2482	Mark Daunt	M22 4HL	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	main	2016-02-10 10:34:45.628	2016-02-10 10:34:45.628	\N
\.


--
-- TOC entry 2118 (class 0 OID 72036)
-- Dependencies: 172
-- Data for Name: Application; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "Application" (application_id, submitted, "createdAt", "updatedAt", "serviceType", unique_app_id, feedback_consent, application_reference, case_reference, user_id, application_guid) FROM stdin;
2481	draft	2016-02-10	2016-02-10	1	A-C-16-0210-0261-E173	\N	\N	\N	262	d92f3c66984edfd54ff528e0dfc9058d17641e09
2482	queued	2016-02-10	2016-02-10	1	A-C-16-0210-0262-FC72	f	\N	\N	263	0d3df069eae20f0d2a6ae634b2f1cb18ccbc0bbb
\.


--
-- TOC entry 2120 (class 0 OID 72044)
-- Dependencies: 174
-- Data for Name: ApplicationPaymentDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "ApplicationPaymentDetails" (application_id, payment_complete, payment_amount, payment_reference, id, "createdAt", "updatedAt", payment_status, oneclick_reference) FROM stdin;
2482	t	95.50	8814551006506994	974	2016-02-10	2016-02-10	AUTHORISED	0
2482	t	95.50	8814551006506994	975	2016-02-10	2016-02-10	AUTHORISED	0
\.


--
-- TOC entry 2121 (class 0 OID 72053)
-- Dependencies: 175
-- Data for Name: ApplicationReference; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "ApplicationReference" ("lastUsedID", "createdAt", "updatedAt", id) FROM stdin;
263	\N	2016-02-10	\N
\.


--
-- TOC entry 2123 (class 0 OID 72058)
-- Dependencies: 177
-- Data for Name: ApplicationTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "ApplicationTypes" ("applicationType", id, casebook_description) FROM stdin;
Standard	1	Postal Service
Premium	2	Premium Service
Drop-off	3	MK Drop Off Service
\.


--
-- TOC entry 2125 (class 0 OID 72067)
-- Dependencies: 179
-- Data for Name: AvailableDocuments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "AvailableDocuments" (doc_id, "updatedAt", "createdAt", html_id, certification_notes, additional_notes, legislation_allowed, photocopy_allowed, certification_required, doc_type_id, doc_title) FROM stdin;
196	\N	\N	acro-police-certificate	if there is no signature from police authority	Must always be the original document	t	f	t	9	ACRO Police Certificate
197	\N	\N	affidavit	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	3	Affidavit
198	\N	\N	articles-of-association	if photocopy, or if original but not signed by official from Companies House	Original - doesn't need certifying if signed by official from Companies House\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1	Articles of Association
199	\N	\N	bank-statement	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2,17	Bank Statement
200	\N	\N	baptism-certificate	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	13	Baptism Certificate
201	\N	\N	birth-certificate	\N	Must have signature of Registrar OR official seal of Registry Office\n\nMust be UK birth certificate (but can be issued by UK Embassy or HM Forces overseas)	t	f	f	5	Birth Certificate
202	\N	\N	certificate-of-freesale	if photocopy, or if original but not signed by official from issuing authority.	Original - doesn't need certifying if signed by official from issuing authority.\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1,3	Certificate of Freesale
203	\N	\N	certificate-of-incorporation	if photocopy, or if original but not signed by official from Companies House	Original - doesn't need certifying if signed by official from Companies House\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1,3	Certificate of Incorporation
204	\N	\N	certificate-of-memorandum	if photocopy, or if original but not signed by official from Companies House	Original - doesn't need certifying if signed by official from Companies House\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1,3	Certificate of Memorandum
205	\N	\N	certificate-of-naturalisation	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	4	Certificate of Naturalisation
206	\N	\N	certificate-of-no-impediment	\N	Must be original\n\nMust be signed by superintendent official of GRO	t	f	f	4	Certificate of No Impediment
207	\N	\N	change-of-name-deed	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	3	Change of Name Deed
208	\N	\N	civil-partnership-certificate	\N	Must have signature of Registrar OR official seal of Registry Office	t	f	f	5	Civil Partnership Certificate
209	\N	\N	companies-house-document	if photocopy, or if original but not signed by official from Companies House	Original - doesn't need certifying if signed by official from Companies House\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1,3	Companies House Document
210	\N	\N	conversion-of-civil-partnership	\N	Must have signature of Registrar OR official seal of Registry Office	t	f	f	5	Conversion of Civil Partnership to Marriage Certificate
211	\N	\N	coroners-report	if photocopy	Original - Must have signature of public official (named coroner)\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Coroners Report
212	\N	\N	county-court-document	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	County Court Document
213	\N	\N	court-of-bankruptcy-document	If not stamped/sealed\nor signed by court official	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Court Document
214	\N	\N	court-of-bancruptcy-document	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Court of Bankruptcy Document
215	\N	\N	cremation-certificate	if photocopy	Original from council-owned crematorium can be signed by council official.\n\nOR\n\nPhotocopies and originals issued by private crematoriums must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2	Cremation Certificate
216	\N	\N	criminal-records-bureau-crb-document	if there is no signature from police authority	Must always be the original document\n\nIf not signed by official from police authority, must always be signed, certified and dated by a practising UK solicitor or notary public. 	t	f	t	9	Criminal Records Bureau (CRB) Document
217	\N	\N	criminal-records-check	if there is no signature from police authority	Must always be the original document.\n\nIf not signed by official from police authority, must always be signed, certified and dated by a practising UK solicitor or notary public. \n\n	t	f	t	9	Criminal Records Check
218	\N	\N	death-certificate	\N	Must have signature of Registrar OR official seal of Registry Office\n\nMust be UK death certificate (but can be issued by UK Embassy or HM Forces overseas)	t	f	f	5	Death Certificate
219	\N	\N	decree-absolute	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Decree Absolute
220	\N	\N	decree-nisi	\nif photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Decree Nisi
221	\N	\N	degree-certificate-uk	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.\n\nMust be awarded by recognised/listed/accredited bodies (college, university, list on GOV.UK)\n                                                                                                                                                                        In some countries, local British Council Officers can verify the original document (however, the BC cant produce certified copies)	t	t	t	7	Degree Certificate or Transcript (UK)
222	\N	\N	department-of-business-innovation-and-skills-bis	if photocopy, or if original but not signed/validated (tick) by official from BIS	Original - doesn't need certifying if signed/validated (tick) by official from BIS\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1,3	Department of Business, Innovation and Skills (BIS) Document
223	\N	\N	department-of-health-document	\nif photocopy, or if original but not signed by government official	Original must be signed by government official or signed, certified and dated by a practising UK solicitor or notary public.\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	8	Department of Health Document
224	\N	\N	diploma	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.\n\nIn some countries, local British Council Officers can verify the original document (however, the BC cant produce certified copies)\n\nMust be awarded by recognised/listed/accredited bodies (college, university, list on GOV.UK)	t	t	t	7	Diploma
225	\N	\N	disclosure-scotland-document	\nif there is no signature from police authority	Must always be the original document signed by a Police official or signed, certified and dated by a practising UK solicitor or notary public.	t	f	t	9	Disclosure Scotland Document
226	\N	\N	doctors-medical	If photocopy	Original - Must have original signature of a Doctor registered with GMC\n\nPhotocopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	10	Doctor's Letter
227	\N	\N	driving-license	Accept photocopies only	Can't do original under any circumstances as this would invalidate the document\n\nNeed to make it clear that original can never be legalised\n\nMust always be signed, certified and dated by a practising UK solicitor or notary public.\n\nNeed clear guidance as to how many documents it counts as for the purpose of legalisation (e.g. photocard and paper counterpart)	f	t	t	15, 4	Driving Licence
228	\N	\N	educational-certificate-uk	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.\n\nIn some countries, local British Council Offices can verify the original document (BC cant produce certified copies)\n\nMust be awarded by recognised/listed/accredited bodies (college, university, list on GOV.UK)	t	t	t	7	Educational Certificate (UK)
229	\N	\N	export-certificate	if photocopy	Original must be signed by relevant government official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	1	Export Certificate
230	\N	\N	family-division-of-the-high-court-of-justice-document	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy- Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Family Division of the High Court of Justice Document
231	\N	\N	fingerprints-document	if issued by a private organisation	Must be issued by Police Force and signed by Police Authority\n\nOR\n\nIf issued by a private organisation then must be the original and must always be signed, certified and dated by a practising UK solicitor or notary public.	t	f	t	9	Fingerprints Document
232	\N	\N	fit-note	If photocopy	Must have original signature of a Doctor registered with GMC\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	10	Fit Note
233	\N	\N	government-issued-document	if photocopy	Original must be signed by relevant government official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	8	Government Issued Document
234	\N	\N	grant-of-probate	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Grant of Probate
235	\N	\N	high-court-of-justice-document	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	High Court of Justice Document
236	\N	\N	hm-revenue-and-customs-document	if photocopy	Original must have original ink signature of HMRC official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	8	HM Revenue and Customs Document
237	\N	\N	home-office-document	if photocopy	Original must have official stamp/seal OR have original ink signature of Home Office official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	8	Home Office Document
238	\N	\N	last-will-and-testament	if photocopy	Original - must be signed/stamped by court.\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	3	Last Will and Testament
239	\N	\N	letter-from-an-employer	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2,16	Letter from an Employer
240	\N	\N	letter-of-enrolment	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2,16	Letter of Enrolment
241	\N	\N	letter-of-invitation	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2	Letter of Invitation (to live in UK)
242	\N	\N	letter-of-no-trace	\N	Must be original\n\nMust be signed by official of GRO\n\n(Scottish equivalent of Certificate of No Impediment)	t	f	f	4	Letter of No Trace
243	\N	\N	marriage-certificate-gro	\N	Must have signature of Registrar OR official seal of Registry Office	t	f	f	5	Marriage Certificate\n(UK issued by GRO)
244	\N	\N	marriage-certificate-other	\N	Originals and Copies - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	13	Marriage Certificate\n(UK issued by someone other than GRO)
245	\N	\N	medical-report	\nif photocopy	Original - Must have original signature of a Doctor registered with GMC\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	10	Medical Report
246	\N	\N	medical-test-results	if photocopy	Original - Must have original signature of a Doctor registered with GMC\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	10	Medical Test Results
247	\N	\N	passport	\N	Can't do original under any circumstances as this would invalidate the document\n\nNeed to make it clear that original can never be legalised\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	f	t	t	4,11	Passport
248	\N	\N	Pet-export-document-from-defra	if photocopy	Original - Must have original signature of a Vet registered with the Royal College of Veterinary Surgeons.\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	12	Pet Export Document from the Department of Environment, Food and Rural Affairs (DEFRA)
249	\N	\N	police-disclosure-document	if there is no signature from police authority	Must always be the original document\n	t	f	t	10	Police Disclosure Document
250	\N	\N	power-of-attorney	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	3	Power of Attorney
251	\N	\N	professional-qualification	\N	Original and copy must always be signed, certified and dated by a practising UK solicitor or notary public.\n\nMust be awarded by recognised/listed/accredited bodies e.g. Royal Charter.\n\n	t	t	t	7	Professional Qualification Certificate\n\n(e.g. issued by Royal Chartered Body such as Institute of Architects)
252	\N	\N	reference-from-an-employer	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2,16	Reference from an Employer
253	\N	\N	religious-document	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	13	Religious Document
254	\N	\N	school-document	TRUE	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	7	School Document
255	\N	\N	sheriff-court-document	if photocopy	Original must have official stamp/seal OR be signed by a court official\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	6	Sheriff Court Document
256	\N	\N	sick-note	if photocopy	Original - Must have original signature of a Doctor registered with GMC\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	10	Sick Note
257	\N	\N	statutory-declaration	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	3	Statutory Declaration
258	\N	\N	translation	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.\n\nNo copies of crown copyrighted seals/logos allowed	t	t	t	14	Translation
259	\N	\N	utility-bill	\N	Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	2,17	Utility Bill
260	\N	\N	vet-document	if photocopy	Original - Must have original signature of a Vet registered with the Royal College of Veterinary Surgeons.\n\nCopy - Must always be signed, certified and dated by a practising UK solicitor or notary public.	t	t	t	12	Veterinary Document
\.


--
-- TOC entry 2126 (class 0 OID 72074)
-- Dependencies: 180
-- Data for Name: DocumentTypes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "DocumentTypes" (doc_type, doc_type_title, doc_type_id, "updatedAt", "createdAt") FROM stdin;
personal	Personal Documents	2	\N	\N
legal	Legal Documents	3	\N	\N
identity	Identity Documents	4	\N	\N
general	GRO (General Registry Office)	5	\N	\N
court	Court Documents	6	\N	\N
education	Educational Documents	7	\N	\N
government	Government Department Documents	8	\N	\N
police	Police Documents	9	\N	\N
medical	Medical Documents	10	\N	\N
passport	Passport	11	\N	\N
pet	Pet Export	12	\N	\N
religious	Religious Document	13	\N	\N
translation	Translation	14	\N	\N
driving	Driving Licence	15	\N	\N
employment	Employment Document	16	\N	\N
financial	Financial Document	17	\N	\N
business	Business Documents	1	\N	\N
\.


--
-- TOC entry 2144 (class 0 OID 72185)
-- Dependencies: 199
-- Data for Name: ExportedApplicationData; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "ExportedApplicationData" (application_id, "applicationType", first_name, last_name, telephone, email, doc_count, special_instructions, user_ref, postage_return_title, postage_return_price, postage_send_title, postage_send_price, main_house_name, main_street, main_town, main_county, main_country, main_full_name, alt_house_name, alt_street, alt_town, alt_county, alt_country, alt_full_name, feedback_consent, total_docs_count_price, unique_app_id, id, "createdAt", "updatedAt", payment_reference, payment_amount, "submittedJSON", main_postcode, alt_postcode) FROM stdin;
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	102	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	103	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	104	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	105	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	106	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	107	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	108	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	109	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	110	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
2482	Postal Service	Mark	Daunt	074440005555	mdaunt@example.com	3	\N	ref	Standard Royal Mail	5.50	I will use a courier to send my documents from the UK	0.00	26	Allanson Rd	Manchester	Greater Manchester	United Kingdom	Mark Daunt	\N	\N	\N	\N	\N	\N	f	90	A-C-16-0210-0262-FC72	111	\N	\N	8814551006506994	95.50	\N	M22 4HL	\N
\.


--
-- TOC entry 2129 (class 0 OID 72091)
-- Dependencies: 183
-- Data for Name: PostagesAvailable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "PostagesAvailable" (title, price, type, "createdAt", "updatedAt", id, casebook_description) FROM stdin;
Pre-paid stamped, addressed, A4-sized envelope	0.00	return	\N	\N	7	Pre-paid Envelope
Standard Royal Mail (including British Forces Post Office)	5.50	return	\N	\N	8	Standard Royal Mail
European Courier	14.50	return	\N	\N	9	European Courier
International Courier	25.00	return	\N	\N	10	International Courier
I will post my documents from the UK	0.00	send	\N	\N	4	\N
I will use a courier to send my documents from the UK	0.00	send	\N	\N	5	\N
I am overseas and will post or courier my documents to the UK	0.00	send	\N	\N	6	\N
\.


--
-- TOC entry 2130 (class 0 OID 72098)
-- Dependencies: 184
-- Data for Name: SubmissionAttempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "SubmissionAttempts" (submission_id, application_id, retry_number, "timestamp", submitted_json, status, response_status_code, response_body, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 2168 (class 0 OID 0)
-- Dependencies: 185
-- Name: SubmissionAttempts_submission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"SubmissionAttempts_submission_id_seq"', 7, true);


--
-- TOC entry 2132 (class 0 OID 72106)
-- Dependencies: 186
-- Data for Name: UserDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "UserDetails" (id, first_name, last_name, telephone, email, "createdAt", "updatedAt", application_id) FROM stdin;
1715	Mark	Daunt	074440005555	mdaunt@example.com	2016-02-10 10:11:44.559 +00:00	2016-02-10 10:11:44.559 +00:00	2481
1716	Mark	Daunt	074440005555	mdaunt@example.com	2016-02-10 10:34:15.697 +00:00	2016-02-10 10:34:15.697 +00:00	2482
\.


--
-- TOC entry 2133 (class 0 OID 72112)
-- Dependencies: 187
-- Data for Name: UserDocumentCount; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "UserDocumentCount" (doc_count, application_id, "createdAt", "updatedAt", id, price) FROM stdin;
3	2481	2016-02-10	2016-02-10	972	90
3	2482	2016-02-10	2016-02-10	973	90
\.


--
-- TOC entry 2134 (class 0 OID 72116)
-- Dependencies: 188
-- Data for Name: UserDocuments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "UserDocuments" (application_id, doc_id, user_doc_id, "updatedAt", "createdAt", certified) FROM stdin;
\.


--
-- TOC entry 2169 (class 0 OID 0)
-- Dependencies: 189
-- Name: UserDocuments_application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"UserDocuments_application_id_seq"', 1, false);


--
-- TOC entry 2137 (class 0 OID 72123)
-- Dependencies: 191
-- Data for Name: UserPostageDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "UserPostageDetails" (postage_available_id, application_id, "createdAt", "updatedAt", id) FROM stdin;
5	2482	2016-02-10	2016-02-10	1421
8	2482	2016-02-10	2016-02-10	1422
\.


--
-- TOC entry 2170 (class 0 OID 0)
-- Dependencies: 192
-- Name: application_application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('application_application_id_seq', 2482, true);


--
-- TOC entry 2171 (class 0 OID 0)
-- Dependencies: 193
-- Name: application_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('application_id_seq', 52, true);


--
-- TOC entry 2172 (class 0 OID 0)
-- Dependencies: 194
-- Name: applicationpaymentdetails_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('applicationpaymentdetails_seq', 1, false);


--
-- TOC entry 2173 (class 0 OID 0)
-- Dependencies: 176
-- Name: applicationtype_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('applicationtype_seq', 3, true);


--
-- TOC entry 2146 (class 0 OID 80430)
-- Dependencies: 201
-- Data for Name: country; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY country (id, name, "in_EU", casebook_mapping) FROM stdin;
1	Afghanistan	f	Afghanistan
2	Akrotiri	t	Cyprus
3	Albania	f	Albania
4	Algeria	f	Algeria
5	Andorra	f	Andorra
6	Angola	f	Angola
7	Anguilla	f	Anguilla
8	Antigua and Barbuda	f	Antigua and Barbuda
9	Argentina	f	Argentina
10	Armenia	f	Armenia
11	Australia	f	Australia
12	Austria	t	Austria
13	Azerbaijan	f	Azerbaijan
14	Bahamas, The	f	Bahamas
15	Bahrain	f	Bahrain
16	Bangladesh	f	Bangladesh
17	Barbados	f	Barbados
18	Belarus	f	Belarus
19	Belgium	t	Belgium
20	Belize	f	Belize
21	Benin	f	Benin
22	Bermuda	f	Bermuda
23	Bhutan	f	Bhutan
24	Bolivia	f	Bolivia
25	Bosnia and Herzegovina	f	Bosnia and Herzegovina
26	Botswana	f	Botswana
27	Brazil	f	Brazil
28	British Antarctic Territory	f	As there are no permanent residents, I suggest we take this out as an option on the front end but implement as a synonym for United Kingdom so UK comes up if you search for it
29	British Indian Ocean Territory	f	British Indian Ocean Territory
30	British Virgin Islands	f	British Virgin Islands
31	Brunei	f	Brunei
32	Bulgaria	t	Bulgaria
33	Burkina Faso	f	Burkina Faso
34	Burma	f	Burma
35	Burundi	f	Burundi
36	Cambodia	f	Cambodia
37	Cameroon	f	Cameroon
38	Canada	f	Canada
39	Cape Verde	f	Cape Verde
40	Cayman Islands	f	Cayman Islands
41	Central African Republic	f	Central African Republic
42	Chad	f	Chad
43	Chile	f	Chile
44	China	f	China
45	Colombia	f	Colombia
46	Comoros	f	Comoros
47	Congo	f	Congo, Republic
48	Congo (Democratic Republic)	f	Congo, Democratic Republic
49	Costa Rica	f	Costa Rica
50	Croatia	t	Croatia
51	Cuba	f	Cuba
52	Cyprus	t	Cyprus
53	Czech Republic	t	Czech Republic
54	Denmark	t	Denmark
55	Dhekelia	t	Cyprus
56	Djibouti	f	Djibouti
57	Dominica	f	Dominica
58	Dominican Republic	f	Dominican Republic
59	East Timor	f	East Timor
60	Ecuador	f	Ecuador
61	Egypt	f	Egypt
62	El Salvador	f	El Salvador
63	Equatorial Guinea	f	Equatorial Guinea
64	Eritrea	f	Eritrea
65	Estonia	t	Estonia
66	Ethiopia	f	Ethiopia
67	Falkland Islands	f	Falkland Islands
68	Fiji	f	Fiji
69	Finland	t	Finland
70	France	t	France
71	Gabon	f	Gabon
72	Gambia, The	f	Gambia, The
73	Georgia	f	Georgia
74	Germany	t	Germany
75	Ghana	f	Ghana
76	Gibraltar	t	Gibraltar
77	Greece	t	Greece
78	Grenada	f	Grenada
79	Guatemala	f	Guatemala
80	Guinea	f	Guinea
81	Guinea-Bissau	f	Guinea-Bissau
82	Guyana	f	Guyana
83	Haiti	f	Haiti
84	Honduras	f	Honduras
85	Hungary	t	Hungary
86	Iceland	f	Iceland
87	India	f	India
88	Indonesia	f	Indonesia
89	Iran	f	Iran
90	Iraq	f	Iraq
93	Ireland	t	Ireland
94	Israel	f	Israel
95	Italy	t	Italy
96	Ivory Coast	f	Ivory Coast
97	Jamaica	f	Jamaica
98	Japan	f	Japan
99	Jordan	f	Jordan
100	Kazakhstan	f	Kazakhstan
101	Kenya	f	Kenya
102	Kiribati 	f	Kiribati
103	Kosovo	f	Kosovo
104	Kuwait	f	Kuwait
105	Kyrgyzstan	f	Kyrgyzstan
106	Laos	f	Laos
107	Latvia	t	Latvia
108	Lebanon	f	Lebanon
109	Lesotho	f	Lesotho
110	Liberia 	f	Liberia
111	Libya	f	Libya
112	Liechtenstein	f	Liechtenstein
113	Lithuania	t	Lithuania
114	Luxembourg	t	Luxembourg
115	Macedonia	f	Macedonia
116	Madagascar	f	Madagascar
117	Malawi	f	Malawi
118	Malaysia	f	Malaysia
119	Maldives	f	Maldives
120	Mali	f	Mali
121	Malta	t	Malta
122	Marshall Islands 	f	Marshall Islands
123	Mauritania	f	Mauritania
124	Mauritius	f	Mauritius
125	Mexico	f	Mexico
126	Micronesia	f	Micronesia
127	Moldova	f	Moldova
128	Monaco	f	Monaco
129	Mongolia	f	Mongolia
130	Montenegro	f	Montenegro
91	Montserrat	f	Montserrat
131	Morocco	f	Morocco
132	Mozambique	f	Mozambique
133	Namibia	f	Namibia
134	Nauru	f	Nauru
135	Nepal	f	Nepal
136	Netherlands	t	Netherlands
137	New Zealand	f	New Zealand
138	Nicaragua	f	Nicaragua
139	Niger	f	Niger
140	Nigeria	f	Nigeria
141	North Korea	f	North Korea
142	Norway	f	Norway
143	Occupied Palestinian Territories	f	The Occupied Palestinian Territories
144	Oman	f	Oman
145	Pakistan	f	Pakistan
149	Palau	f	Palau
150	Panama	f	Panama
151	Papua New Guinea	f	Papua New Guinea
152	Paraguay	f	Paraguay
153	Peru	f	Peru
154	Philippines	f	Philippines
155	Pitcairn, Henderson, Ducie and Oeno Islands	f	Pitcairn Island
156	Poland	t	Poland
157	Portugal	t	Portugal
158	Qatar	f	Qatar
159	Romania	t	Romania
160	Russia	f	Russia
161	Rwanda	f	Rwanda
162	Samoa	f	Samoa
92	San Marino	f	San Marino
163	Sao Tome and Principe	f	São Tomé and Príncipe
164	Saudi Arabia	f	Saudi Arabia
165	Senegal	f	Senegal
146	Serbia	f	Serbia
147	Seychelles	f	Seychelles
148	Sierra Leone	f	Sierra Leone
166	Singapore	f	Singapore
167	Slovakia	t	Slovakia
168	Slovenia	t	Slovenia
169	Solomon Islands	f	Solomon Islands
170	Somalia	f	Somalia
171	South Africa	f	South Africa
172	South Georgia and South Sandwich Islands	f	South Georgia and South Sandwich Islands
173	South Korea	f	South Korea
174	South Sudan	f	South Sudan
175	Spain	t	Spain
176	Sri Lanka	f	Sri Lanka
177	St Helena, Ascension and Tristan da Cunha	f	Saint Helena, Ascension and Tristan da Cunha
178	St Kitts and Nevis	f	St Kitts and Nevis
179	St Lucia	f	St Lucia
180	St Vincent	f	Saint Vincent and the Grenadines
181	Sudan	f	Sudan
182	Suriname	f	Suriname
183	Swaziland	f	Swaziland
184	Sweden	t	Sweden
185	Switzerland	f	Switzerland
185	Syria	f	Syria
186	Taiwan	f	Taiwan
187	Tajikistan	f	Tajikistan
188	Tanzania	f	Tanzania
189	Thailand	f	Thailand
190	Togo	f	Togo
191	Tonga	f	Tonga
192	Trinidad and Tobago	f	Trinidad and Tobago
193	Tunisia	f	Tunisia
194	Turkey	f	Turkey
195	Turkmenistan	f	Turkmenistan
196	Turks and Caicos Islands	f	Turks and Caicos Islands
197	Tuvalu	f	Tuvalu
198	Uganda	f	Uganda
199	Ukraine	f	Ukraine
200	United Arab Emirates	f	United Arab Emirates
201	United Kingdom	t	United Kingdom
202	United States	f	United States
203	Uruguay 	f	Uruguay
204	Uzbekistan	f	Uzbekistan
205	Vanuatu	f	Vanuatu
206	Vatican City	f	Vatican City
207	Venezuela	f	Venezuela
208	Vietnam	f	Vietnam
209	Yemen	f	Yemen
210	Zambia	f	Zambia
211	Zimbabwe	f	Zimbabwe
\.


--
-- TOC entry 2174 (class 0 OID 0)
-- Dependencies: 200
-- Name: country_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('country_id_seq', 1, false);


--
-- TOC entry 2175 (class 0 OID 0)
-- Dependencies: 178
-- Name: doc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('doc_id_seq', 260, true);


--
-- TOC entry 2176 (class 0 OID 0)
-- Dependencies: 181
-- Name: exported_data; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('exported_data', 111, true);


--
-- TOC entry 2177 (class 0 OID 0)
-- Dependencies: 195
-- Name: postages_available_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('postages_available_seq', 1, false);


--
-- TOC entry 2178 (class 0 OID 0)
-- Dependencies: 182
-- Name: postagesavailable_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('postagesavailable_seq', 10, true);


--
-- TOC entry 2179 (class 0 OID 0)
-- Dependencies: 170
-- Name: useradditionalapplicationinfo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('useradditionalapplicationinfo_seq', 740, true);


--
-- TOC entry 2180 (class 0 OID 0)
-- Dependencies: 173
-- Name: userdocumentcount_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('userdocumentcount_seq', 975, true);


--
-- TOC entry 2181 (class 0 OID 0)
-- Dependencies: 196
-- Name: userdocuments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('userdocuments_id_seq', 1733, true);


--
-- TOC entry 2182 (class 0 OID 0)
-- Dependencies: 190
-- Name: userpostagedetails_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('userpostagedetails_seq', 1422, true);


--
-- TOC entry 2183 (class 0 OID 0)
-- Dependencies: 198
-- Name: yourdetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('yourdetails_id_seq', 1716, true);


--
-- TOC entry 1990 (class 2606 OID 72152)
-- Name: ApplicationPaymentDetails_pk; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "ApplicationPaymentDetails"
    ADD CONSTRAINT "ApplicationPaymentDetails_pk" PRIMARY KEY (id);


--
-- TOC entry 1986 (class 2606 OID 80486)
-- Name: Application_application_guid_key; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "Application"
    ADD CONSTRAINT "Application_application_guid_key" UNIQUE (application_guid);


--
-- TOC entry 1994 (class 2606 OID 72154)
-- Name: PostagesAvailable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "PostagesAvailable"
    ADD CONSTRAINT "PostagesAvailable_pkey" PRIMARY KEY (id);


--
-- TOC entry 1997 (class 2606 OID 72156)
-- Name: SubmissionAttempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "SubmissionAttempts"
    ADD CONSTRAINT "SubmissionAttempts_pkey" PRIMARY KEY (submission_id);


--
-- TOC entry 1984 (class 2606 OID 72158)
-- Name: UserAdditionalApplicationInfo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "AdditionalApplicationInfo"
    ADD CONSTRAINT "UserAdditionalApplicationInfo_pkey" PRIMARY KEY (id);


--
-- TOC entry 2001 (class 2606 OID 72160)
-- Name: UserDocumentCount_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "UserDocumentCount"
    ADD CONSTRAINT "UserDocumentCount_pkey" PRIMARY KEY (id);


--
-- TOC entry 2003 (class 2606 OID 72162)
-- Name: UserDocuments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "UserDocuments"
    ADD CONSTRAINT "UserDocuments_pkey" PRIMARY KEY (user_doc_id);


--
-- TOC entry 2005 (class 2606 OID 72164)
-- Name: UserPostageDetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "UserPostageDetails"
    ADD CONSTRAINT "UserPostageDetails_pkey" PRIMARY KEY (id);


--
-- TOC entry 1988 (class 2606 OID 72166)
-- Name: application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "Application"
    ADD CONSTRAINT application_pkey PRIMARY KEY (application_id);


--
-- TOC entry 1999 (class 2606 OID 72168)
-- Name: person_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "UserDetails"
    ADD CONSTRAINT person_pkey PRIMARY KEY (id);


--
-- TOC entry 1992 (class 2606 OID 72170)
-- Name: pk_application_id; Type: CONSTRAINT; Schema: public; Owner: postgres; Tablespace:
--

ALTER TABLE ONLY "ApplicationTypes"
    ADD CONSTRAINT pk_application_id PRIMARY KEY (id);


--
-- TOC entry 1995 (class 1259 OID 72173)
-- Name: FKI_SubmissionAttempts_Application; Type: INDEX; Schema: public; Owner: postgres; Tablespace:
--

CREATE INDEX "FKI_SubmissionAttempts_Application" ON "SubmissionAttempts" USING btree (application_id);


--
-- TOC entry 2006 (class 2606 OID 72174)
-- Name: ApplicationPaymentDetails_Application_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "ApplicationPaymentDetails"
    ADD CONSTRAINT "ApplicationPaymentDetails_Application_fk" FOREIGN KEY (application_id) REFERENCES "Application"(application_id);


--
-- TOC entry 2007 (class 2606 OID 72179)
-- Name: FK_SubmissionAttempts_Application; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "SubmissionAttempts"
    ADD CONSTRAINT "FK_SubmissionAttempts_Application" FOREIGN KEY (application_id) REFERENCES "Application"(application_id);


--
-- TOC entry 2154 (class 0 OID 0)
-- Dependencies: 6
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2016-02-10 11:45:50 GMT

--
-- PostgreSQL database dump complete
--

