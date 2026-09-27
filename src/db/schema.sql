-- ====================================================================
-- AMLAKINO (املاکینو) — PostgreSQL Production Relational Schema
-- Complete RBAC, Data Ownership, Privacy-First Architecture
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role_enum AS ENUM ('agent', 'manager', 'admin');
CREATE TYPE privacy_state_enum AS ENUM ('private', 'shared', 'archived');
CREATE TYPE deal_type_enum AS ENUM ('sale', 'rent', 'presale');
CREATE TYPE property_type_enum AS ENUM ('apartment', 'villa', 'office', 'store', 'land', 'penthouse');
CREATE TYPE property_status_enum AS ENUM ('active', 'archived', 'reserved', 'deal_closed');
CREATE TYPE client_role_enum AS ENUM ('buyer', 'tenant', 'investor');
CREATE TYPE client_status_enum AS ENUM ('lead', 'active', 'negotiation', 'contracted', 'lost');
CREATE TYPE followup_priority_enum AS ENUM ('high', 'medium', 'low');
CREATE TYPE followup_status_enum AS ENUM ('pending', 'completed', 'overdue');
CREATE TYPE followup_type_enum AS ENUM ('call', 'visit', 'meeting', 'contract', 'message');
CREATE TYPE visit_status_enum AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE opportunity_stage_enum AS ENUM (
    'lead',
    'viewing_scheduled',
    'negotiation',
    'contract_pending',
    'closed_won',
    'closed_lost'
);
CREATE TYPE invitation_status_enum AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE audit_action_enum AS ENUM (
    'login',
    'logout',
    'property_created',
    'property_updated',
    'property_shared',
    'client_created',
    'client_shared',
    'opportunity_created',
    'collaboration_requested',
    'collaboration_accepted',
    'team_joined',
    'team_left',
    'data_exported'
);

-- 2. TEAMS / AGENCIES TABLE (آژانس‌ها و دپارتمان‌های املاک)
CREATE TABLE teams (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    manager_id VARCHAR(64),
    city VARCHAR(100) NOT NULL DEFAULT 'تهران',
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS / AGENTS TABLE (مشاوران، سرپرستان، مدیران)
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    salt VARCHAR(64),
    role user_role_enum NOT NULL DEFAULT 'agent',
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
    avatar_url TEXT,
    license_code VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TEAM MEMBERSHIPS TABLE (عضویت مشاوران در تیم با رعایت عدم تغییر مالکیت دیتا)
CREATE TABLE team_memberships (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role_enum NOT NULL DEFAULT 'agent',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Constraint: An agent can belong to only ONE active team at a time
    CONSTRAINT uq_active_agent_team UNIQUE (user_id, status)
);

-- 5. INVITATIONS TABLE (سیستم دعوت رسمی مدیران با رضایت و تایید صریح مشاور)
CREATE TABLE invitations (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    inviter_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_mobile VARCHAR(20) NOT NULL,
    invitee_email VARCHAR(255),
    invitee_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'agent',
    status invitation_status_enum NOT NULL DEFAULT 'pending',
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitations_invitee_mobile ON invitations(invitee_mobile);
CREATE INDEX idx_invitations_team_id ON invitations(team_id);

-- 6. PROPERTIES TABLE (فایل‌های ملکی با حفظ قطعی مالکیت مشاور)
CREATE TABLE properties (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    deal_type deal_type_enum NOT NULL,
    property_type property_type_enum NOT NULL,
    area NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(18, 0), -- Toman
    price_per_meter NUMERIC(15, 0),
    deposit NUMERIC(15, 0),      -- Rahn in Toman
    monthly_rent NUMERIC(15, 0), -- Ejareh in Toman
    bedrooms INT NOT NULL DEFAULT 1,
    floor INT NOT NULL DEFAULT 1,
    total_floors INT NOT NULL DEFAULT 1,
    units_per_floor INT DEFAULT 1,
    year_built INT,
    parking BOOLEAN DEFAULT false,
    elevator BOOLEAN DEFAULT false,
    storage BOOLEAN DEFAULT false,
    balcony BOOLEAN DEFAULT false,
    district VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'تهران',
    address_summary VARCHAR(255) NOT NULL,
    full_address TEXT, -- confidential: only owner or explicitly shared
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    owner_name VARCHAR(200) NOT NULL, -- confidential from unauthorized managers
    owner_phone VARCHAR(50) NOT NULL,  -- confidential from unauthorized managers
    status property_status_enum NOT NULL DEFAULT 'active',
    -- OWNERSHIP & PRIVACY CORE CONSTRAINTS:
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    privacy_state privacy_state_enum NOT NULL DEFAULT 'private',
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_privacy_state ON properties(privacy_state);
CREATE INDEX idx_properties_district ON properties(district);
CREATE INDEX idx_properties_deal_type ON properties(deal_type);
CREATE INDEX idx_properties_status ON properties(status);

-- 7. CLIENTS TABLE (متقاضیان و پرونده‌های محرمانه مشتریان)
CREATE TABLE clients (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL, -- confidential from unauthorized managers
    mobile VARCHAR(20) NOT NULL,      -- confidential from unauthorized managers
    second_mobile VARCHAR(20),       -- confidential from unauthorized managers
    role client_role_enum NOT NULL DEFAULT 'buyer',
    status client_status_enum NOT NULL DEFAULT 'lead',
    desired_deal_type deal_type_enum NOT NULL,
    desired_property_types JSONB DEFAULT '[]'::jsonb,
    budget_min NUMERIC(18, 0),
    budget_max NUMERIC(18, 0),
    max_monthly_rent NUMERIC(15, 0),
    max_deposit NUMERIC(15, 0),
    min_area NUMERIC(10, 2),
    max_area NUMERIC(10, 2),
    min_bedrooms INT DEFAULT 1,
    desired_districts JSONB DEFAULT '[]'::jsonb,
    must_have_elevator BOOLEAN DEFAULT false,
    must_have_parking BOOLEAN DEFAULT false,
    notes TEXT, -- private notes: strictly confidential
    -- OWNERSHIP & PRIVACY CORE CONSTRAINTS:
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    privacy_state privacy_state_enum NOT NULL DEFAULT 'private',
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
    last_contact_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_owner_id ON clients(owner_id);
CREATE INDEX idx_clients_privacy_state ON clients(privacy_state);
CREATE INDEX idx_clients_status ON clients(status);

-- 8. OPPORTUNITIES TABLE (پایپ‌لاین فرصت‌های فروش)
CREATE TABLE opportunities (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    property_id VARCHAR(64) REFERENCES properties(id) ON DELETE SET NULL,
    stage opportunity_stage_enum NOT NULL DEFAULT 'lead',
    estimated_value NUMERIC(18, 0) NOT NULL DEFAULT 0,
    estimated_commission NUMERIC(15, 0) NOT NULL DEFAULT 0,
    probability_percent INT NOT NULL DEFAULT 20,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    privacy_state privacy_state_enum NOT NULL DEFAULT 'private',
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    expected_close_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_opportunities_owner_id ON opportunities(owner_id);

-- 9. FOLLOW UPS TABLE (پیگیری‌ها و تسک‌های روزانه)
CREATE TABLE follow_ups (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
    property_id VARCHAR(64) REFERENCES properties(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    due_time VARCHAR(10) NOT NULL,
    priority followup_priority_enum NOT NULL DEFAULT 'medium',
    status followup_status_enum NOT NULL DEFAULT 'pending',
    type followup_type_enum NOT NULL DEFAULT 'call',
    notes TEXT,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    privacy_state privacy_state_enum NOT NULL DEFAULT 'private',
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_followups_owner_id ON follow_ups(owner_id);
CREATE INDEX idx_followups_due_date ON follow_ups(due_date);

-- 10. ACTIVITIES TABLE (ردیابی فعالیت‌های کاربر با مالکیت دقیق)
CREATE TABLE activities (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX idx_activities_owner_id ON activities(owner_id);
CREATE INDEX idx_activities_team_id ON activities(team_id);

-- 11. VISITS TABLE (هماهنگی و بازخورد بازدیدها)
CREATE TABLE visits (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(10) NOT NULL,
    status visit_status_enum NOT NULL DEFAULT 'scheduled',
    feedback TEXT,
    client_interest_level VARCHAR(20),
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    privacy_state privacy_state_enum NOT NULL DEFAULT 'private',
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visits_owner_id ON visits(owner_id);

-- 12. DEALS TABLE (قراردادهای نهایی بسته‌شده و کمیسیون)
CREATE TABLE deals (
    id VARCHAR(64) PRIMARY KEY,
    contract_number VARCHAR(100) NOT NULL UNIQUE,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id),
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id),
    deal_type deal_type_enum NOT NULL,
    final_price NUMERIC(18, 0) NOT NULL,
    commission_total NUMERIC(15, 0) NOT NULL,
    agent_share NUMERIC(15, 0) NOT NULL,
    office_share NUMERIC(15, 0) NOT NULL,
    owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    privacy_state privacy_state_enum NOT NULL DEFAULT 'private',
    agent_id VARCHAR(64) NOT NULL REFERENCES users(id),
    team_id VARCHAR(64) REFERENCES teams(id),
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deals_owner_id ON deals(owner_id);

-- 13. MATCHES TABLE (موتور تطابق هوشمند)
CREATE TABLE matches (
    id VARCHAR(64) PRIMARY KEY,
    property_id VARCHAR(64) NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    match_score INT NOT NULL, -- 0 to 100
    matched_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    unmatched_factors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_property_client_match UNIQUE(property_id, client_id)
);

-- 14. COLLABORATION REQUESTS TABLE (همکاری امن فایل‌های اشتراکی بین مشاوران)
CREATE TABLE collaboration_requests (
    id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    receiver_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    property_id VARCHAR(64) REFERENCES properties(id) ON DELETE CASCADE,
    client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    commission_split VARCHAR(50) NOT NULL DEFAULT '50/50',
    notes TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. NOTIFICATIONS TABLE (اعلان‌های کاربری)
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    read BOOLEAN NOT NULL DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. SUBSCRIPTIONS TABLE (اشتراک تیم و سقف مشاوران)
CREATE TABLE subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    team_id VARCHAR(64) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    plan_name VARCHAR(100) NOT NULL,
    max_agents INT NOT NULL DEFAULT 5,
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 17. AUDIT LOGS TABLE (ثبت امن ردپای رویدادها و مانیتورینگ امنیتی)
CREATE TABLE audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_role user_role_enum NOT NULL,
    team_id VARCHAR(64) REFERENCES teams(id) ON DELETE SET NULL,
    action audit_action_enum NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(64),
    details TEXT,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES SPECIFICATION
-- ====================================================================
-- PostgreSQL RLS ensures authorization cannot be bypassed even via raw SQL:
--
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY agent_properties_policy ON properties
--     FOR ALL USING (
--         owner_id = current_setting('app.current_user_id')
--         OR (privacy_state = 'shared' AND team_id = current_setting('app.current_team_id'))
--     );
--
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY agent_clients_policy ON clients
--     FOR ALL USING (
--         owner_id = current_setting('app.current_user_id')
--     );
--
-- NOTE FOR MANAGERS:
-- Managers are permitted to access aggregated analytics views or masked records:
-- CREATE VIEW manager_team_properties_summary AS
--     SELECT id, code, deal_type, property_type, area, district, status, owner_id
--     FROM properties
--     WHERE team_id = current_setting('app.current_team_id');
-- ====================================================================
