CREATE TYPE "public"."content_type" AS ENUM('post', 'comment', 'article');--> statement-breakpoint
CREATE TYPE "public"."record_category" AS ENUM('discourse', 'article');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('arxiv', 'bluesky', 'hackernews', 'google_news', 'reddit', 'twitter', 'youtube', 'exa', 'webset');--> statement-breakpoint
CREATE TYPE "public"."signal_evidence_target" AS ENUM('record', 'entity', 'topic', 'narrative');--> statement-breakpoint
CREATE TYPE "public"."signal_severity" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."arc_status" AS ENUM('breaking', 'developing', 'ongoing', 'resolved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."citation_type" AS ENUM('internal', 'external');--> statement-breakpoint
CREATE TYPE "public"."content_variant_type" AS ENUM('summary_short', 'summary_medium', 'briefing_blurb', 'social_twitter', 'social_linkedin', 'email_teaser');--> statement-breakpoint
CREATE TYPE "public"."seo_page_type" AS ENUM('story', 'beat', 'entity', 'arc', 'static');--> statement-breakpoint
CREATE TYPE "public"."seo_source" AS ENUM('generation', 'enrichment', 'sentinel-auto', 'sentinel-revert', 'manual', 'page-health');--> statement-breakpoint
CREATE TYPE "public"."story_type" AS ENUM('lead_story', 'secondary_story', 'beat_story', 'dispatch', 'entity_story');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" "source_kind" NOT NULL,
	"category" "record_category" DEFAULT 'discourse' NOT NULL,
	"publisher" text,
	"source_config_id" integer,
	"content_type" "content_type" NOT NULL,
	"external_id" text NOT NULL,
	"content_text" text,
	"title" text,
	"url" text,
	"author" text,
	"published_at" timestamp with time zone,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"subreddit" text,
	"language" text DEFAULT 'en',
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"analysis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sentiment_label" text,
	"sentiment_score" numeric
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "source_kind" NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analysis_cursors" (
	"task" text PRIMARY KEY NOT NULL,
	"cursor" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "embeddings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"record_id" bigint NOT NULL,
	"model_name" text NOT NULL,
	"dimensions" integer NOT NULL,
	"vector" vector(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"indexability" text,
	"classified_at" timestamp with time zone,
	"classifier_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_mention_daily" (
	"date" date NOT NULL,
	"entity_id" integer NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_mention_daily_date_entity_id_pk" PRIMARY KEY("date","entity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_mentions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"record_id" bigint NOT NULL,
	"start_offset" integer,
	"end_offset" integer,
	"confidence" numeric(4, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"captured_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_source_counts" (
	"entity_id" integer NOT NULL,
	"kind" "source_kind" NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_source_counts_entity_id_kind_pk" PRIMARY KEY("entity_id","kind")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "record_sentiment_daily" (
	"date" date NOT NULL,
	"kind" "source_kind" NOT NULL,
	"avg_score" numeric(8, 6) NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_sentiment_daily_date_kind_pk" PRIMARY KEY("date","kind")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "record_source_daily" (
	"date" date NOT NULL,
	"kind" "source_kind" NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_source_daily_date_kind_pk" PRIMARY KEY("date","kind")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_kind_rollups" (
	"kind" "source_kind" PRIMARY KEY NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"last_24h_records" integer DEFAULT 0 NOT NULL,
	"last_7d_records" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"record_id" bigint NOT NULL,
	"topic_id" integer NOT NULL,
	"method" text NOT NULL,
	"confidence" numeric(4, 3),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic_record_counts" (
	"topic_id" integer PRIMARY KEY NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"active_story_count" integer DEFAULT 0 NOT NULL,
	"last_record_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"cluster" text,
	"keywords" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"active_story_count" integer DEFAULT 0 NOT NULL,
	"last_record_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signal_id" integer NOT NULL,
	"target" "signal_evidence_target" NOT NULL,
	"record_id" bigint,
	"entity_id" integer,
	"target_topic_id" integer,
	"narrative_id" uuid,
	"weight" numeric(6, 4),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"topic_id" integer,
	"severity" "signal_severity" DEFAULT 'medium' NOT NULL,
	"headline" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" numeric,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dedup_key" text,
	"acknowledged" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seo_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_type" "seo_page_type" NOT NULL,
	"page_id" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"source" "seo_source" NOT NULL,
	"source_detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"type" "story_type" NOT NULL,
	"topic_id" integer,
	"headline" text,
	"synopsis" text,
	"key_takeaways" text[],
	"arc_summary" text,
	"difficulty_level" text,
	"content" text NOT NULL,
	"sections" jsonb,
	"word_count" integer,
	"reading_time_seconds" integer,
	"faq" jsonb,
	"schema_org" jsonb,
	"arc_status" "arc_status" DEFAULT 'developing' NOT NULL,
	"generation_model" text DEFAULT 'claude-sonnet-4-6' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enriched_at" timestamp with time zone,
	"enrichment_version" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"entity_name" text,
	"source_record_ids" text[],
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_arc_membership" (
	"story_id" uuid NOT NULL,
	"arc_id" integer NOT NULL,
	"sequence_order" integer DEFAULT 0 NOT NULL,
	"arc_note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_arc_membership_story_id_arc_id_pk" PRIMARY KEY("story_id","arc_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_arcs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"topic_id" integer,
	"title" text NOT NULL,
	"summary" text,
	"tldr" text,
	"generation_model" text DEFAULT 'claude-sonnet-4-6' NOT NULL,
	"story_count" integer DEFAULT 0 NOT NULL,
	"first_story_at" timestamp with time zone,
	"last_story_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_arcs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_citations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"marker" integer,
	"citation_type" "citation_type" NOT NULL,
	"record_id" bigint,
	"external_url" text,
	"domain" text,
	"fetched_at" timestamp with time zone,
	"anchor_text" text,
	"title" text,
	"excerpt" text,
	"ai_claim" text,
	"fact_type" text,
	"platform" text,
	"inferred" boolean DEFAULT false NOT NULL,
	"confidence" numeric(4, 3),
	"credibility_score" numeric(4, 3),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_content_variants" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"variant_type" "content_variant_type" NOT NULL,
	"content" text NOT NULL,
	"generation_model" text DEFAULT 'claude-sonnet-4-6' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"ref_type" text NOT NULL,
	"ref_slug" text NOT NULL,
	"display_text" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"target_url" text,
	"target_headline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_related" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"related_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"ai_reason" text,
	"similarity_score" numeric(4, 3),
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_sync_checkpoints" (
	"kind" text PRIMARY KEY NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_sync_checkpoints_kind_check" CHECK ("search_sync_checkpoints"."kind" IN ('story', 'record', 'citation', 'entity', 'topic'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_sync_projection_state" (
	"kind" text NOT NULL,
	"entity_id" text NOT NULL,
	"chroma_id" text NOT NULL,
	"content_hash" text,
	"source_updated_at" timestamp with time zone,
	"last_pushed_at" timestamp with time zone,
	"last_deleted_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_sync_projection_state_kind_entity_id_pk" PRIMARY KEY("kind","entity_id"),
	CONSTRAINT "search_sync_projection_state_kind_check" CHECK ("search_sync_projection_state"."kind" IN ('story', 'citation', 'entity', 'topic')),
	CONSTRAINT "search_sync_projection_state_status_check" CHECK ("search_sync_projection_state"."status" IN ('pending', 'synced', 'deleted', 'failed'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "records" ADD CONSTRAINT "records_source_config_id_sources_id_fk" FOREIGN KEY ("source_config_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_mention_daily" ADD CONSTRAINT "entity_mention_daily_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_mentions" ADD CONSTRAINT "entity_mentions_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entity_source_counts" ADD CONSTRAINT "entity_source_counts_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "topic_record_counts" ADD CONSTRAINT "topic_record_counts_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_target_topic_id_topics_id_fk" FOREIGN KEY ("target_topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal_evidence" ADD CONSTRAINT "signal_evidence_narrative_id_stories_id_fk" FOREIGN KEY ("narrative_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signals" ADD CONSTRAINT "signals_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stories" ADD CONSTRAINT "stories_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_arc_membership" ADD CONSTRAINT "story_arc_membership_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_arc_membership" ADD CONSTRAINT "story_arc_membership_arc_id_story_arcs_id_fk" FOREIGN KEY ("arc_id") REFERENCES "public"."story_arcs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_arcs" ADD CONSTRAINT "story_arcs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_citations" ADD CONSTRAINT "story_citations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_citations" ADD CONSTRAINT "story_citations_record_id_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."records"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_content_variants" ADD CONSTRAINT "story_content_variants_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_references" ADD CONSTRAINT "story_references_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_related" ADD CONSTRAINT "story_related_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_related" ADD CONSTRAINT "story_related_related_id_stories_id_fk" FOREIGN KEY ("related_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_records_source_external_id" ON "records" USING btree ("kind","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_source_captured" ON "records" USING btree ("kind","captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_captured_at" ON "records" USING btree ("captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_captured_kind" ON "records" USING btree ("captured_at","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_content_type_captured_id" ON "records" USING btree ("content_type","captured_at","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_published" ON "records" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_sentiment" ON "records" USING btree ("sentiment_label","captured_at") WHERE "records"."sentiment_label" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_sentiment_score_captured_kind" ON "records" USING btree ("captured_at","kind") WHERE "records"."sentiment_score" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_sentiment_label_captured_kind" ON "records" USING btree ("captured_at","kind","sentiment_label") WHERE "records"."sentiment_label" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_category_captured" ON "records" USING btree ("category","captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_publisher" ON "records" USING btree ("publisher","captured_at") WHERE "records"."publisher" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_records_url_article" ON "records" USING btree ("url") WHERE "records"."category" = 'article' AND "records"."url" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_sources_kind_name" ON "sources" USING btree ("kind","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sources_kind_enabled" ON "sources" USING btree ("kind","enabled") WHERE "sources"."enabled" = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_embeddings_record_model" ON "embeddings" USING btree ("record_id","model_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_embeddings_record" ON "embeddings" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_embeddings_model" ON "embeddings" USING btree ("model_name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_entities_lower_name_type" ON "entities" USING btree (LOWER("name"),"type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entities_last_seen" ON "entities" USING btree ("last_seen");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entities_lower_name" ON "entities" USING btree (LOWER("name"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entities_slug" ON "entities" USING btree (TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g')));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entities_unclassified" ON "entities" USING btree ("id") WHERE "entities"."indexability" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mention_daily_entity_date" ON "entity_mention_daily" USING btree ("entity_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_entity_mentions_unique" ON "entity_mentions" USING btree ("entity_id","record_id","start_offset");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_entity_mentions_null_offset" ON "entity_mentions" USING btree ("entity_id","record_id") WHERE "entity_mentions"."start_offset" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mentions_entity" ON "entity_mentions" USING btree ("entity_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mentions_record" ON "entity_mentions" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mentions_record_entity" ON "entity_mentions" USING btree ("record_id","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mentions_captured_entity" ON "entity_mentions" USING btree ("captured_at","entity_id") WHERE "entity_mentions"."captured_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_mentions_entity_captured" ON "entity_mentions" USING btree ("entity_id","captured_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_entity_source_counts_kind" ON "entity_source_counts" USING btree ("kind","record_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_record_sentiment_daily_kind_date" ON "record_sentiment_daily" USING btree ("kind","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_record_source_daily_kind_date" ON "record_source_daily" USING btree ("kind","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_source_kind_rollups_total" ON "source_kind_rollups" USING btree ("total_records");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_source_kind_rollups_recent" ON "source_kind_rollups" USING btree ("last_24h_records","last_7d_records");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_topic_assignments" ON "topic_assignments" USING btree ("record_id","topic_id","method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topic_assignments_topic" ON "topic_assignments" USING btree ("topic_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topic_assignments_record" ON "topic_assignments" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topic_assignments_topic_record" ON "topic_assignments" USING btree ("topic_id","record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topic_record_counts_count" ON "topic_record_counts" USING btree ("record_count","topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topic_record_counts_last_record" ON "topic_record_counts" USING btree ("last_record_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topics_cluster" ON "topics" USING btree ("cluster");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topics_active" ON "topics" USING btree ("active") WHERE "topics"."active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topics_record_count" ON "topics" USING btree ("record_count","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_topics_last_record_at" ON "topics" USING btree ("last_record_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signal_evidence_signal" ON "signal_evidence" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signal_evidence_record" ON "signal_evidence" USING btree ("record_id") WHERE "signal_evidence"."record_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signal_evidence_entity" ON "signal_evidence" USING btree ("entity_id") WHERE "signal_evidence"."entity_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signal_evidence_topic" ON "signal_evidence" USING btree ("target_topic_id") WHERE "signal_evidence"."target_topic_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signals_topic_time" ON "signals" USING btree ("topic_id","detected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signals_kind_time" ON "signals" USING btree ("kind","detected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signals_severity_open" ON "signals" USING btree ("severity","detected_at") WHERE "signals"."acknowledged" = false;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_signals_dedup" ON "signals" USING btree ("kind","topic_id","dedup_key") WHERE "signals"."dedup_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_seo_metadata_active_page" ON "seo_metadata" USING btree ("page_type","page_id") WHERE "seo_metadata"."active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seo_metadata_page_version" ON "seo_metadata" USING btree ("page_type","page_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_seo_metadata_active" ON "seo_metadata" USING btree ("active") WHERE "seo_metadata"."active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_active" ON "stories" USING btree ("type","topic_id","active") WHERE "stories"."active" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_type_time" ON "stories" USING btree ("type","generated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_stories_slug" ON "stories" USING btree ("slug") WHERE "stories"."slug" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_version_chain" ON "stories" USING btree ("type","topic_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_entity" ON "stories" USING btree ("type","entity_name","active") WHERE "stories"."entity_name" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_scheduled" ON "stories" USING btree ("publish_at") WHERE "stories"."active" = false AND "stories"."publish_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_arc_status" ON "stories" USING btree ("arc_status","generated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_enrichment" ON "stories" USING btree ("enrichment_version","enriched_at") WHERE "stories"."enriched_at" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_generation_model" ON "stories" USING btree ("generation_model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arc_membership_arc" ON "story_arc_membership" USING btree ("arc_id","sequence_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_arcs_topic" ON "story_arcs" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_citations_story" ON "story_citations" USING btree ("story_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_citations_record" ON "story_citations" USING btree ("record_id") WHERE "story_citations"."record_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_citations_domain" ON "story_citations" USING btree ("domain") WHERE "story_citations"."domain" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_citations_external" ON "story_citations" USING btree ("story_id","citation_type") WHERE "story_citations"."citation_type" = 'external';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_story_citations_marker" ON "story_citations" USING btree ("story_id","marker") WHERE "story_citations"."marker" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_story_variants" ON "story_content_variants" USING btree ("story_id","variant_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_variants_story" ON "story_content_variants" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_variants_type" ON "story_content_variants" USING btree ("variant_type","generated_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_story_refs" ON "story_references" USING btree ("story_id","ref_type","ref_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refs_story" ON "story_references" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_refs_target" ON "story_references" USING btree ("ref_type","ref_slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_story_related" ON "story_related" USING btree ("story_id","related_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_related_story" ON "story_related" USING btree ("story_id","similarity_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_related_type" ON "story_related" USING btree ("story_id","relationship_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_sync_projection_status" ON "search_sync_projection_state" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_sync_projection_source_updated" ON "search_sync_projection_state" USING btree ("kind","source_updated_at");