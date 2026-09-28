-- ====================================================================
-- AMLAKINO (املاکینو) — Supabase PostgreSQL Production Database Schema
-- Multi-Tenant, Zero-Trust RBAC, Row-Level Security (RLS), Privacy-First
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TEAMS TABLE (آژانس‌ها و دپارتمان‌های املاک)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    manager_id UUID,
    city VARCHAR(100) NOT NULL DEFAULT 'تهران',
    address TEXT,
    phone VARCHAR(50),
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. PROFILES TABLE (پروفایل‌های کاربری متصل به auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'manager', 'admin')),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    avatar_url TEXT,
    license_code VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    agent_mode VARCHAR(30) DEFAULT 'team_member' CHECK (agent_mode IN ('team_member', 'independent', 'read_only')),
    subscription_status VARCHAR(20) DEFAULT 'none' CHECK (subscription_status IN ('active', 'expired', 'none')),
    exit_date TIMESTAMPTZ,
    grace_period_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add manager foreign key constraint to teams
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_teams_manager'
    ) THEN
        ALTER TABLE public.teams
        ADD CONSTRAINT fk_teams_manager
        FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. TEAM MEMBERSHIPS TABLE (عضویت مشاوران در تیم)
CREATE TABLE IF NOT EXISTS public.team_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'manager', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial index for active membership constraint: user can have only one active team at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_agent_membership ON public.team_memberships (user_id) WHERE status = 'active';

-- 5. INVITATIONS TABLE (دعوت‌نامه‌های رسمی)
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    inviter_name VARCHAR(255) NOT NULL,
    invitee_mobile VARCHAR(50) NOT NULL,
    invitee_email VARCHAR(255),
    invitee_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'manager', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invitations_invitee_mobile ON public.invitations(invitee_mobile);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

-- 6. PROPERTIES TABLE (فایل‌های ملکی با حفظ قطعی مالکیت مشاور)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(300) NOT NULL,
    deal_type VARCHAR(20) NOT NULL CHECK (deal_type IN ('sale', 'rent', 'presale')),
    property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('apartment', 'villa', 'office', 'store', 'land', 'penthouse')),
    area NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(18, 0),
    price_per_meter NUMERIC(15, 0),
    deposit NUMERIC(15, 0),
    monthly_rent NUMERIC(15, 0),
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
    full_address TEXT, -- confidential
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    owner_name VARCHAR(200) NOT NULL, -- confidential
    owner_phone VARCHAR(50) NOT NULL,  -- confidential
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'reserved', 'deal_closed')),
    availability_status VARCHAR(20) DEFAULT 'available',
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    privacy_state VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (privacy_state IN ('private', 'shared', 'archived')),
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agent_name VARCHAR(255),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_team_id ON public.properties(team_id);
CREATE INDEX IF NOT EXISTS idx_properties_privacy_state ON public.properties(privacy_state);
CREATE INDEX IF NOT EXISTS idx_properties_district ON public.properties(district);
CREATE INDEX IF NOT EXISTS idx_properties_deal_type ON public.properties(deal_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);

-- 7. CLIENTS TABLE (متقاضیان و پرونده‌های محرمانه مشتریان)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL, -- confidential
    mobile VARCHAR(50) NOT NULL,      -- confidential
    second_mobile VARCHAR(50),       -- confidential
    role VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'tenant', 'investor')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('lead', 'active', 'negotiation', 'contracted', 'lost', 'archived')),
    desired_deal_type VARCHAR(20) NOT NULL CHECK (desired_deal_type IN ('sale', 'rent', 'presale')),
    desired_property_types JSONB DEFAULT '["apartment"]'::jsonb,
    budget_min NUMERIC(18, 0),
    budget_max NUMERIC(18, 0),
    max_monthly_rent NUMERIC(15, 0),
    max_deposit NUMERIC(15, 0),
    min_area NUMERIC(10, 2),
    max_area NUMERIC(10, 2),
    min_bedrooms INT DEFAULT 1,
    desired_districts JSONB DEFAULT '[]'::jsonb,
    preferred_city VARCHAR(100) DEFAULT 'تهران',
    must_have_elevator BOOLEAN DEFAULT false,
    must_have_parking BOOLEAN DEFAULT false,
    requirements JSONB DEFAULT '[]'::jsonb,
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high', 'urgent')),
    notes TEXT, -- strictly confidential
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    privacy_state VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (privacy_state IN ('private', 'shared', 'archived')),
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agent_name VARCHAR(255),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    last_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_team_id ON public.clients(team_id);
CREATE INDEX IF NOT EXISTS idx_clients_privacy_state ON public.clients(privacy_state);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- 8. OPPORTUNITIES TABLE (پایپ‌لاین فرصت‌های فروش)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    property_title VARCHAR(300),
    match_score INT,
    stage VARCHAR(30) NOT NULL DEFAULT 'new_match',
    status VARCHAR(20) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    next_action TEXT,
    next_follow_up TEXT,
    estimated_value NUMERIC(18, 0) NOT NULL DEFAULT 0,
    estimated_commission NUMERIC(15, 0) NOT NULL DEFAULT 0,
    probability_percent INT NOT NULL DEFAULT 20,
    notes TEXT,
    expected_close_date DATE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    privacy_state VARCHAR(20) NOT NULL DEFAULT 'private',
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    agent_name VARCHAR(255),
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON public.opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_team_id ON public.opportunities(team_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON public.opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_property_id ON public.opportunities(property_id);

-- 9. FOLLOW UPS TABLE (پیگیری‌ها و تسک‌های روزانه)
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    due_at TIMESTAMPTZ,
    due_date VARCHAR(50),
    due_time VARCHAR(20),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    type VARCHAR(30) NOT NULL DEFAULT 'call',
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    client_phone VARCHAR(50),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    property_title VARCHAR(300),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    privacy_state VARCHAR(20) NOT NULL DEFAULT 'private',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_followups_owner_id ON public.follow_ups(owner_id);
CREATE INDEX IF NOT EXISTS idx_followups_team_id ON public.follow_ups(team_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON public.follow_ups(status);

-- 10. VISITS TABLE (هماهنگی و بازخورد بازدیدها)
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_phone VARCHAR(50),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    property_title VARCHAR(300) NOT NULL,
    property_district VARCHAR(150),
    date VARCHAR(50),
    time VARCHAR(20),
    scheduled_date DATE,
    scheduled_time VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    feedback TEXT,
    notes TEXT,
    client_interest_level VARCHAR(20),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    privacy_state VARCHAR(20) NOT NULL DEFAULT 'private',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_visits_owner_id ON public.visits(owner_id);
CREATE INDEX IF NOT EXISTS idx_visits_team_id ON public.visits(team_id);
CREATE INDEX IF NOT EXISTS idx_visits_property_id ON public.visits(property_id);

-- 11. DEALS TABLE (قراردادهای نهایی بسته‌شده و کمیسیون)
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    property_title VARCHAR(300),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    client_name VARCHAR(255),
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    agent_name VARCHAR(255),
    deal_type VARCHAR(20),
    final_price NUMERIC(18, 0) NOT NULL,
    commission_total NUMERIC(15, 0) NOT NULL,
    agent_share NUMERIC(15, 0) NOT NULL,
    office_share NUMERIC(15, 0) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'won',
    notes TEXT,
    contract_number VARCHAR(100) UNIQUE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    privacy_state VARCHAR(20) NOT NULL DEFAULT 'private',
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_team_id ON public.deals(team_id);

-- 12. MATCHES TABLE (موتور تطابق هوشمند)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    match_score INT NOT NULL,
    matched_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    unmatched_factors JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_property_client_match UNIQUE(property_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_property_id ON public.matches(property_id);
CREATE INDEX IF NOT EXISTS idx_matches_client_id ON public.matches(client_id);

-- 13. COLLABORATION REQUESTS TABLE (درخواست‌های همکاری امن بین مشاوران)
CREATE TABLE IF NOT EXISTS public.collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    sender_team_name VARCHAR(255),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_name VARCHAR(255) NOT NULL,
    receiver_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    property_title VARCHAR(300) NOT NULL,
    property_district VARCHAR(150),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    client_summary TEXT NOT NULL,
    match_score INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    commission_split VARCHAR(50) NOT NULL DEFAULT '50/50',
    notes TEXT,
    collaboration_granted BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_collab_sender ON public.collaboration_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_collab_receiver ON public.collaboration_requests(receiver_id);

-- 14. NOTIFICATIONS TABLE (اعلان‌های کاربران)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'system',
    read BOOLEAN NOT NULL DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 15. SUBSCRIPTIONS TABLE (اشتراک تیم‌ها)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter',
    plan_name VARCHAR(100) NOT NULL,
    max_agents INT NOT NULL DEFAULT 5,
    current_agents INT NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_team_id ON public.subscriptions(team_id);

-- 16. AUDIT LOGS TABLE (لاگ‌های نظارتی و مانیتورینگ امنیتی)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_id ON public.audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 17. ACTIVITIES TABLE (ردیابی فعالیت‌ها)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_team_id ON public.activities(team_id);

-- 18. OTP VERIFICATIONS TABLE (برای اعتبارسنجی پیامکی در Edge Function)
CREATE TABLE IF NOT EXISTS public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(50) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_otp_mobile ON public.otp_verifications(mobile);
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON public.otp_verifications(created_at);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ====================================================================

-- 1. Helper function: get current user team ID
CREATE OR REPLACE FUNCTION public.get_current_team_id()
RETURNS UUID AS $$
    SELECT team_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 2. Helper function: is current user a manager of team
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 3. Helper function: is current user a system administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- 4. TRIGGER: Prevent privilege escalation on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger AS $$
BEGIN
    -- Allow service_role or database admin
    IF (current_user IN ('postgres', 'supabase_admin') OR (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role') THEN
        RETURN NEW;
    END IF;

    -- Standard authenticated users cannot modify their own role, team_id, subscription_status, agent_mode, or is_active
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
        RAISE EXCEPTION 'Privilege escalation rejected: users cannot modify their own role.';
    END IF;

    IF (OLD.team_id IS DISTINCT FROM NEW.team_id) THEN
        RAISE EXCEPTION 'Team reassignment rejected: users cannot modify team_id without manager approval.';
    END IF;

    IF (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) THEN
        RAISE EXCEPTION 'Subscription escalation rejected: subscription status is server-managed.';
    END IF;

    IF (OLD.agent_mode IS DISTINCT FROM NEW.agent_mode) THEN
        RAISE EXCEPTION 'Agent mode modification rejected.';
    END IF;

    IF (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        RAISE EXCEPTION 'Active state modification rejected.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ====================================================================
-- RLS POLICIES FOR ALL TABLES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- A. PROFILES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view profiles in their team or self" ON public.profiles;
CREATE POLICY "Users can view profiles in their team or self" ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR (team_id IS NOT NULL AND team_id = public.get_current_team_id())
        OR (public.is_manager() AND team_id = public.get_current_team_id())
    );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own safe profile fields" ON public.profiles;
CREATE POLICY "Users can update own safe profile fields" ON public.profiles
    FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile on signup" ON public.profiles;
CREATE POLICY "Users can insert own profile on signup" ON public.profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- --------------------------------------------------------------------
-- B. TEAMS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Team members can view team" ON public.teams;
CREATE POLICY "Team members can view team" ON public.teams
    FOR SELECT USING (
        id = public.get_current_team_id()
        OR manager_id = auth.uid()
    );

DROP POLICY IF EXISTS "Managers can create team" ON public.teams;
CREATE POLICY "Managers can create team" ON public.teams
    FOR INSERT WITH CHECK (
        manager_id = auth.uid()
        AND public.is_manager()
    );

DROP POLICY IF EXISTS "Managers can update team" ON public.teams;
CREATE POLICY "Managers can update team" ON public.teams
    FOR UPDATE USING (
        manager_id = auth.uid()
        OR (id = public.get_current_team_id() AND public.is_manager())
    );

DROP POLICY IF EXISTS "Managers can delete team" ON public.teams;
CREATE POLICY "Managers can delete team" ON public.teams
    FOR DELETE USING (
        manager_id = auth.uid()
        AND public.is_manager()
    );

-- --------------------------------------------------------------------
-- C. TEAM MEMBERSHIPS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Team members can view memberships" ON public.team_memberships;
CREATE POLICY "Team members can view memberships" ON public.team_memberships
    FOR SELECT USING (
        user_id = auth.uid()
        OR team_id = public.get_current_team_id()
    );

DROP POLICY IF EXISTS "Managers can insert team memberships" ON public.team_memberships;
CREATE POLICY "Managers can insert team memberships" ON public.team_memberships
    FOR INSERT WITH CHECK (
        team_id = public.get_current_team_id() AND public.is_manager()
    );

DROP POLICY IF EXISTS "Managers or self can update team memberships" ON public.team_memberships;
CREATE POLICY "Managers or self can update team memberships" ON public.team_memberships
    FOR UPDATE USING (
        (team_id = public.get_current_team_id() AND public.is_manager())
        OR (user_id = auth.uid() AND status = 'inactive')
    );

DROP POLICY IF EXISTS "Managers can delete team memberships" ON public.team_memberships;
CREATE POLICY "Managers can delete team memberships" ON public.team_memberships
    FOR DELETE USING (
        team_id = public.get_current_team_id() AND public.is_manager()
    );

-- --------------------------------------------------------------------
-- D. INVITATIONS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View invitations" ON public.invitations;
CREATE POLICY "View invitations" ON public.invitations
    FOR SELECT USING (
        inviter_id = auth.uid()
        OR team_id = public.get_current_team_id()
        OR invitee_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Managers can create invitations" ON public.invitations;
CREATE POLICY "Managers can create invitations" ON public.invitations
    FOR INSERT WITH CHECK (
        team_id = public.get_current_team_id() AND public.is_manager()
    );

DROP POLICY IF EXISTS "Invitee or manager can update invitations" ON public.invitations;
CREATE POLICY "Invitee or manager can update invitations" ON public.invitations
    FOR UPDATE USING (
        invitee_mobile = (SELECT mobile FROM public.profiles WHERE id = auth.uid())
        OR (team_id = public.get_current_team_id() AND public.is_manager())
    );

DROP POLICY IF EXISTS "Managers can delete invitations" ON public.invitations;
CREATE POLICY "Managers can delete invitations" ON public.invitations
    FOR DELETE USING (
        team_id = public.get_current_team_id() AND public.is_manager()
    );

-- --------------------------------------------------------------------
-- E. PROPERTIES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Agents can view own properties or shared in team" ON public.properties;
CREATE POLICY "Agents can view own properties or shared in team" ON public.properties
    FOR SELECT USING (
        owner_id = auth.uid()
        OR (privacy_state = 'shared' AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Only property owner can insert property" ON public.properties;
CREATE POLICY "Only property owner can insert property" ON public.properties
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
        AND (team_id IS NULL OR team_id = public.get_current_team_id())
    );

DROP POLICY IF EXISTS "Only property owner can update property" ON public.properties;
CREATE POLICY "Only property owner can update property" ON public.properties
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    ) WITH CHECK (
        owner_id = auth.uid()
        AND (team_id IS NULL OR team_id = public.get_current_team_id())
    );

DROP POLICY IF EXISTS "Only property owner can delete property" ON public.properties;
CREATE POLICY "Only property owner can delete property" ON public.properties
    FOR DELETE USING (
        owner_id = auth.uid()
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

-- --------------------------------------------------------------------
-- F. CLIENTS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Agents can view own clients or shared in team" ON public.clients;
CREATE POLICY "Agents can view own clients or shared in team" ON public.clients
    FOR SELECT USING (
        owner_id = auth.uid()
        OR (privacy_state = 'shared' AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Only client owner can insert client" ON public.clients;
CREATE POLICY "Only client owner can insert client" ON public.clients
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
        AND (team_id IS NULL OR team_id = public.get_current_team_id())
    );

DROP POLICY IF EXISTS "Only client owner can update client" ON public.clients;
CREATE POLICY "Only client owner can update client" ON public.clients
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    ) WITH CHECK (
        owner_id = auth.uid()
        AND (team_id IS NULL OR team_id = public.get_current_team_id())
    );

DROP POLICY IF EXISTS "Only client owner can delete client" ON public.clients;
CREATE POLICY "Only client owner can delete client" ON public.clients
    FOR DELETE USING (
        owner_id = auth.uid()
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

-- --------------------------------------------------------------------
-- G. OPPORTUNITIES POLICIES (Tenant Isolated)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View opportunities access" ON public.opportunities;
CREATE POLICY "View opportunities access" ON public.opportunities
    FOR SELECT USING (
        owner_id = auth.uid()
        OR (privacy_state = 'shared' AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
        OR (public.is_manager() AND agent_id IN (
            SELECT id FROM public.profiles WHERE team_id = public.get_current_team_id()
        ))
    );

DROP POLICY IF EXISTS "Insert opportunities" ON public.opportunities;
CREATE POLICY "Insert opportunities" ON public.opportunities
    FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Update opportunities" ON public.opportunities;
CREATE POLICY "Update opportunities" ON public.opportunities
    FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Delete opportunities" ON public.opportunities;
CREATE POLICY "Delete opportunities" ON public.opportunities
    FOR DELETE USING (owner_id = auth.uid());

-- --------------------------------------------------------------------
-- H. FOLLOW UPS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View follow ups" ON public.follow_ups;
CREATE POLICY "View follow ups" ON public.follow_ups
    FOR SELECT USING (
        owner_id = auth.uid()
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Manage follow ups" ON public.follow_ups;
CREATE POLICY "Manage follow ups" ON public.follow_ups
    FOR ALL USING (owner_id = auth.uid());

-- --------------------------------------------------------------------
-- I. VISITS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View visits" ON public.visits;
CREATE POLICY "View visits" ON public.visits
    FOR SELECT USING (
        owner_id = auth.uid()
        OR (public.is_manager() AND team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Manage visits" ON public.visits;
CREATE POLICY "Manage visits" ON public.visits
    FOR ALL USING (owner_id = auth.uid());

-- --------------------------------------------------------------------
-- J. DEALS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View deals" ON public.deals;
CREATE POLICY "View deals" ON public.deals
    FOR SELECT USING (
        owner_id = auth.uid()
        OR agent_id = auth.uid()
        OR (team_id = public.get_current_team_id() AND public.is_manager() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Insert deals" ON public.deals;
CREATE POLICY "Insert deals" ON public.deals
    FOR INSERT WITH CHECK (agent_id = auth.uid() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Update deals" ON public.deals;
CREATE POLICY "Update deals" ON public.deals
    FOR UPDATE USING (
        agent_id = auth.uid()
        OR owner_id = auth.uid()
        OR (team_id = public.get_current_team_id() AND public.is_manager() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Delete deals" ON public.deals;
CREATE POLICY "Delete deals" ON public.deals
    FOR DELETE USING (
        (team_id = public.get_current_team_id() AND public.is_manager() AND team_id IS NOT NULL)
        OR agent_id = auth.uid()
    );

-- --------------------------------------------------------------------
-- K. MATCHES POLICIES (Secure Multi-Tenant Matching Privacy)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View matches" ON public.matches;
DROP POLICY IF EXISTS "Insert matches" ON public.matches;
DROP POLICY IF EXISTS "Update matches" ON public.matches;
DROP POLICY IF EXISTS "Delete matches" ON public.matches;
DROP POLICY IF EXISTS "Manage matches" ON public.matches;

CREATE POLICY "View matches" ON public.matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties p, public.clients c
            WHERE p.id = matches.property_id AND c.id = matches.client_id
            AND (
                p.owner_id = auth.uid()
                OR (p.privacy_state = 'shared' AND p.team_id = public.get_current_team_id() AND p.team_id IS NOT NULL)
                OR (public.is_manager() AND p.team_id = public.get_current_team_id() AND p.team_id IS NOT NULL)
            )
            AND (
                c.owner_id = auth.uid()
                OR (c.privacy_state = 'shared' AND c.team_id = public.get_current_team_id() AND c.team_id IS NOT NULL)
                OR (public.is_manager() AND c.team_id = public.get_current_team_id() AND c.team_id IS NOT NULL)
            )
        )
    );

CREATE POLICY "Insert matches" ON public.matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties p, public.clients c
            WHERE p.id = matches.property_id AND c.id = matches.client_id
            AND (
                p.owner_id = auth.uid()
                OR (p.privacy_state = 'shared' AND p.team_id = public.get_current_team_id() AND p.team_id IS NOT NULL)
                OR (public.is_manager() AND p.team_id = public.get_current_team_id() AND p.team_id IS NOT NULL)
            )
            AND (
                c.owner_id = auth.uid()
                OR (c.privacy_state = 'shared' AND c.team_id = public.get_current_team_id() AND c.team_id IS NOT NULL)
                OR (public.is_manager() AND c.team_id = public.get_current_team_id() AND c.team_id IS NOT NULL)
            )
            AND (
                (p.team_id IS NOT NULL AND p.team_id = c.team_id AND p.team_id = public.get_current_team_id())
                OR (p.owner_id = auth.uid() AND c.owner_id = auth.uid())
            )
        )
    );

CREATE POLICY "Update matches" ON public.matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties p, public.clients c
            WHERE p.id = matches.property_id AND c.id = matches.client_id
            AND (
                p.owner_id = auth.uid()
                OR c.owner_id = auth.uid()
                OR (public.is_manager() AND p.team_id = public.get_current_team_id() AND c.team_id = public.get_current_team_id() AND p.team_id IS NOT NULL)
            )
        )
    );

CREATE POLICY "Delete matches" ON public.matches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties p, public.clients c
            WHERE p.id = matches.property_id AND c.id = matches.client_id
            AND (
                p.owner_id = auth.uid()
                OR c.owner_id = auth.uid()
                OR (public.is_manager() AND p.team_id = public.get_current_team_id() AND c.team_id = public.get_current_team_id() AND p.team_id IS NOT NULL)
            )
        )
    );

-- --------------------------------------------------------------------
-- L. COLLABORATION REQUESTS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Collaboration access" ON public.collaboration_requests;
CREATE POLICY "Collaboration access" ON public.collaboration_requests
    FOR ALL USING (
        sender_id = auth.uid()
        OR receiver_id = auth.uid()
        OR (public.is_manager() AND (sender_team_id = public.get_current_team_id() OR receiver_team_id = public.get_current_team_id()))
    );

-- --------------------------------------------------------------------
-- M. NOTIFICATIONS POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "User notifications" ON public.notifications;
CREATE POLICY "User notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid());

-- --------------------------------------------------------------------
-- N. SUBSCRIPTIONS POLICIES (Immutable by non-service-role)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View team subscriptions" ON public.subscriptions;
CREATE POLICY "View team subscriptions" ON public.subscriptions
    FOR SELECT USING (
        team_id = public.get_current_team_id()
    );

-- --------------------------------------------------------------------
-- O. AUDIT LOGS POLICIES (Append-only)
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View audit logs" ON public.audit_logs;
CREATE POLICY "View audit logs" ON public.audit_logs
    FOR SELECT USING (
        user_id = auth.uid()
        OR (team_id = public.get_current_team_id() AND public.is_manager() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Insert audit logs" ON public.audit_logs;
CREATE POLICY "Insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
    );

-- --------------------------------------------------------------------
-- P. ACTIVITIES POLICIES
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "View activities" ON public.activities;
CREATE POLICY "View activities" ON public.activities
    FOR SELECT USING (
        user_id = auth.uid()
        OR owner_id = auth.uid()
        OR (team_id = public.get_current_team_id() AND team_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Insert activities" ON public.activities;
CREATE POLICY "Insert activities" ON public.activities
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- --------------------------------------------------------------------
-- Q. OTP VERIFICATIONS POLICIES (Edge Function Service-Role Only)
-- --------------------------------------------------------------------
-- No policies granted to public/anon/authenticated. Direct REST access returns 401/403.

-- ====================================================================
-- TRIGGERS & REPAIR FUNCTIONS
-- ====================================================================

-- Automatic Profile Creation upon Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    clean_mobile VARCHAR(50);
    user_full_name VARCHAR(255);
    user_role VARCHAR(20);
BEGIN
    clean_mobile := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'mobile'), ''),
        NULLIF(TRIM(new.phone), ''),
        'TEMP-' || substr(new.id::text, 1, 12)
    );

    user_full_name := COALESCE(
        NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
        'کاربر املاکینو'
    );

    -- Strict default: Role is always initialized as agent
    user_role := 'agent';

    INSERT INTO public.profiles (id, full_name, mobile, email, role, is_active, agent_mode, subscription_status)
    VALUES (
        new.id,
        user_full_name,
        clean_mobile,
        new.email,
        user_role,
        true,
        'team_member',
        'none'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        updated_at = now();
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper RPC for Edge Functions to resolve user ID safely
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email TEXT)
RETURNS UUID AS $$
    SELECT id FROM auth.users WHERE auth.users.email = get_user_id_by_email.email LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;
