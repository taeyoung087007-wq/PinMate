-- 개인 장소는 기본 공개. 비공개는 사용자가 직접 고를 때만.
ALTER TABLE personal_places
    ALTER COLUMN is_public SET DEFAULT true;
