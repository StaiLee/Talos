CREATE TABLE "eligibility_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tender_id" uuid,
	"address" text NOT NULL,
	"operator" text NOT NULL,
	"status" text DEFAULT 'en_cours' NOT NULL,
	"ftth_eligible" boolean,
	"ftto_eligible" boolean,
	"summary" text,
	"offers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_path" text,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_tender_id_tenders_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tenders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eligibility_tender_idx" ON "eligibility_checks" USING btree ("tender_id");