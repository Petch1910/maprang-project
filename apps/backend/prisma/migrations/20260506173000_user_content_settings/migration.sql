ALTER TABLE "User"
ADD COLUMN "contentMaxRating" TEXT NOT NULL DEFAULT 'teen_romance',
ADD COLUMN "adultVerifiedAt" TIMESTAMP(3);

ALTER TABLE "User"
ADD CONSTRAINT "User_contentMaxRating_check"
CHECK ("contentMaxRating" IN ('general', 'teen_romance', 'mature_18', 'restricted_18'));
