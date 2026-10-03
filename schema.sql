-- Owl-Player Database Schema
-- Comprehensive schema for video streaming platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Videos table with enhanced metadata
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    raw_key VARCHAR(500) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- uploaded, processing, ready, failed
    description TEXT,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    file_size BIGINT,
    duration INTEGER, -- in seconds
    width INTEGER,
    height INTEGER,
    bitrate INTEGER,
    resolution VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    uploaded_by UUID REFERENCES users(id)
);

-- Video processing history
CREATE TABLE video_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    quality VARCHAR(50) NOT NULL, -- 1080p, 720p, 480p, 360p
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    output_path VARCHAR(500),
    file_size BIGINT,
    duration INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

-- Video statistics (for analytics)
CREATE TABLE video_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Likes table
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(video_id, user_id)
);

-- API Metrics table for monitoring
CREATE TABLE api_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    labels TEXT,
    count INTEGER NOT NULL DEFAULT 0,
    average DECIMAL(10,2),
    min INTEGER,
    max INTEGER,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_video_stats_video_id ON video_stats(video_id);
CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_likes_video_id ON likes(video_id);
CREATE INDEX idx_videos_tags ON videos USING GIN(tags);
CREATE INDEX idx_api_metrics_name ON api_metrics(metric_name);
CREATE INDEX idx_api_metrics_labels ON api_metrics USING GIN(labels);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_stats_updated_at BEFORE UPDATE ON video_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, is_admin, bio) VALUES
('admin', 'admin@owlplayer.local', '$2a$12$LQv3c1fyyUjZgWuBztBoz.ET5CX7HzX9Yr.0S8IbJ0M5qK7F2Hk6.', true, 'System Administrator');

-- Comments are disabled by default (set is_active to false)
UPDATE users SET is_active = false WHERE username = 'admin';
