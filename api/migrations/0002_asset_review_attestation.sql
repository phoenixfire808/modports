ALTER TABLE moderation_events
ADD COLUMN assets_reviewed INTEGER NOT NULL DEFAULT 0 CHECK (assets_reviewed IN (0, 1));
