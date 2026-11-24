-- Existing rows represent saved history and keep a NULL state.
ALTER TABLE pose_sessions
    ADD COLUMN exercise_id BIGINT NULL,
    ADD COLUMN session_state VARCHAR(16) NULL,
    ADD INDEX idx_pose_draft_age (session_state, created_at);
