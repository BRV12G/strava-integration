-- schema.sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  profile_picture TEXT,
  strava_athlete_id INTEGER,
  strava_access_token TEXT,
  strava_refresh_token TEXT,
  strava_token_expires_at INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  strava_activity_id BIGINT UNIQUE,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  type VARCHAR(50),
  start_date TIMESTAMP WITH TIME ZONE,
  elapsed_time INTEGER,
  description TEXT,
  distance FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to both tables
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON activities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();