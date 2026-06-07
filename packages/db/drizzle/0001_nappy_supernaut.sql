ALTER TABLE "agent" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "public_url" text;--> statement-breakpoint
ALTER TABLE "agent" ADD COLUMN "web_password_cipher" text;--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_slug_unique" UNIQUE("slug");