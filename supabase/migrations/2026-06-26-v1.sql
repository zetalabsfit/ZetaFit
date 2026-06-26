-- =============================================================================
-- ZetaFit — Initial Database Schema
-- Migration: 2026-06-26-v1.sql
-- Purpose: Create the full multi-tenant gym management SaaS schema
-- Rollback: See bottom of file for DROP statements
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'paused');
CREATE TYPE member_status AS ENUM ('active', 'expired', 'paused', 'pending', 'cancelled');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue', 'refunded', 'failed');
CREATE TYPE payment_method AS ENUM ('upi', 'cash', 'card', 'bank_transfer', 'cheque');
CREATE TYPE attendance_method AS ENUM ('qr', 'phone', 'manual');
CREATE TYPE check_in_result AS ENUM ('allowed', 'blocked');
CREATE TYPE whatsapp_status AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE whatsapp_template AS ENUM ('expiry_reminder', 'payment_receipt', 'workout_link', 'welcome', 'renewal_success');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'done', 'failed');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'payment', 'check_in');
CREATE TYPE workout_type AS ENUM ('strength', 'cardio', 'flexibility', 'hiit', 'yoga', 'sports', 'other');

-- =============================================================================
-- PLATFORM SPINE — shared across every tenant
-- =============================================================================

-- Organizations (each gym is one org)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    gst_number TEXT,
    pan_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT NOT NULL DEFAULT 'IN',
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    locale TEXT NOT NULL DEFAULT 'en-IN',
    operating_hours TEXT,
    website TEXT,
    -- Subscription to ZetaLabs platform
    platform_plan TEXT NOT NULL DEFAULT 'starter' CHECK (platform_plan IN ('starter', 'growth', 'pro')),
    platform_status subscription_status NOT NULL DEFAULT 'trial',
    platform_trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    platform_razorpay_sub_id TEXT,
    platform_current_period_end DATE,
    -- Whatsapp credit balance
    whatsapp_credits INT NOT NULL DEFAULT 200,
    whatsapp_monthly_grant INT NOT NULL DEFAULT 200,
    whatsapp_cycle_reset_at DATE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Branches (a gym can have multiple locations)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Profiles — extends Supabase auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RBAC: Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = system role
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed system roles (org-agnostic)
INSERT INTO roles (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'platform_admin', 'ZetaLabs platform superadmin'),
    ('00000000-0000-0000-0000-000000000002', 'gym_owner', 'Owner of the gym organization'),
    ('00000000-0000-0000-0000-000000000003', 'gym_admin', 'Admin with full org access'),
    ('00000000-0000-0000-0000-000000000004', 'branch_manager', 'Manager of a specific branch'),
    ('00000000-0000-0000-0000-000000000005', 'receptionist', 'Front desk — check-in and member management'),
    ('00000000-0000-0000-0000-000000000006', 'trainer', 'Trainer — workout builder and member view'),
    ('00000000-0000-0000-0000-000000000007', 'member', 'Gym member — self-service portal only');

-- RBAC: Permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,  -- e.g. 'members:create', 'payments:read'
    description TEXT
);

INSERT INTO permissions (name, description) VALUES
    ('members:read',    'View member list and profiles'),
    ('members:create',  'Add new members'),
    ('members:update',  'Edit member details'),
    ('members:delete',  'Remove members (soft delete)'),
    ('plans:read',      'View membership plans'),
    ('plans:create',    'Create new plans'),
    ('plans:update',    'Edit existing plans'),
    ('plans:delete',    'Archive plans'),
    ('payments:read',   'View payment history'),
    ('payments:create', 'Record payments'),
    ('payments:update', 'Edit payment records'),
    ('attendance:read', 'View attendance logs'),
    ('attendance:checkin', 'Perform check-ins'),
    ('reports:read',    'Access reports and exports'),
    ('settings:read',   'View org settings'),
    ('settings:update', 'Modify org settings'),
    ('staff:read',      'View staff list'),
    ('staff:create',    'Invite staff'),
    ('staff:update',    'Update staff roles'),
    ('staff:delete',    'Remove staff access'),
    ('workouts:read',   'View workout templates'),
    ('workouts:create', 'Create workout templates'),
    ('workouts:assign', 'Assign workouts to members'),
    ('whatsapp:send',   'Send WhatsApp messages');

-- RBAC: Role → Permission mapping
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Seed gym_owner gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions;

-- gym_admin gets everything except settings:update and staff:delete
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name NOT IN ('settings:update', 'staff:delete');

-- receptionist: members, payments, attendance, check-in
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE name IN ('members:read','members:create','members:update','payments:read','payments:create','attendance:read','attendance:checkin','whatsapp:send');

-- trainer: members read, workouts full, attendance read
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM permissions
WHERE name IN ('members:read','workouts:read','workouts:create','workouts:assign','attendance:read');

-- member: self-service only (handled via member portal, not owner portal)
-- No owner-portal permissions for members

-- RBAC: User → Role mapping (with optional branch scope)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,  -- NULL = all branches
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id, organization_id, branch_id)
);

-- =============================================================================
-- GYM CORE — member management
-- =============================================================================

-- Membership plans defined by the gym
CREATE TABLE membership_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_days INT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    features JSONB NOT NULL DEFAULT '[]',
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    member_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Gym members (not Supabase auth users — stored separately)
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    -- Auth link (optional — only if member uses the member portal)
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    initials TEXT GENERATED ALWAYS AS (
        UPPER(
            SUBSTRING(SPLIT_PART(full_name, ' ', 1), 1, 1) ||
            COALESCE(SUBSTRING(SPLIT_PART(full_name, ' ', 2), 1, 1), '')
        )
    ) STORED,
    phone TEXT NOT NULL,
    email TEXT,
    photo_url TEXT,
    emergency_contact TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    address TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status member_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Member subscriptions (a member can have sequential subscriptions)
CREATE TABLE member_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status member_status NOT NULL DEFAULT 'active',
    -- Freeze support
    freeze_start DATE,
    freeze_end DATE,
    freeze_days_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PAYMENTS
-- =============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    subscription_id UUID REFERENCES member_subscriptions(id),
    amount NUMERIC(10,2) NOT NULL,
    gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) GENERATED ALWAYS AS (amount + gst_amount - discount_amount) STORED,
    payment_method payment_method NOT NULL,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    -- Idempotency — Razorpay webhook dedup
    razorpay_payment_id TEXT UNIQUE,
    razorpay_event_id TEXT UNIQUE,
    invoice_number TEXT UNIQUE,
    invoice_pdf_url TEXT,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices (GST-compliant)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    pdf_url TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ATTENDANCE
-- =============================================================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    method attendance_method NOT NULL DEFAULT 'qr',
    result check_in_result NOT NULL,
    staff_id UUID REFERENCES auth.users(id),
    notes TEXT
);

-- =============================================================================
-- WORKOUTS
-- =============================================================================

-- Exercise library (global + org-specific)
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE, -- NULL = global
    name TEXT NOT NULL,
    description TEXT,
    muscle_group TEXT,
    equipment TEXT,
    media_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed global exercise library
INSERT INTO exercises (id, name, muscle_group, equipment) VALUES
    (uuid_generate_v4(), 'Bench Press', 'Chest', 'Barbell'),
    (uuid_generate_v4(), 'Incline DB Press', 'Chest', 'Dumbbells'),
    (uuid_generate_v4(), 'Cable Fly', 'Chest', 'Cable Machine'),
    (uuid_generate_v4(), 'Deadlift', 'Back', 'Barbell'),
    (uuid_generate_v4(), 'Pull-Up', 'Back', 'Pull-up Bar'),
    (uuid_generate_v4(), 'Barbell Row', 'Back', 'Barbell'),
    (uuid_generate_v4(), 'Squat', 'Legs', 'Barbell'),
    (uuid_generate_v4(), 'Leg Press', 'Legs', 'Machine'),
    (uuid_generate_v4(), 'Romanian Deadlift', 'Legs', 'Barbell'),
    (uuid_generate_v4(), 'Overhead Press', 'Shoulders', 'Barbell'),
    (uuid_generate_v4(), 'Lateral Raise', 'Shoulders', 'Dumbbells'),
    (uuid_generate_v4(), 'Bicep Curl', 'Arms', 'Dumbbells'),
    (uuid_generate_v4(), 'Tricep Pushdown', 'Arms', 'Cable Machine'),
    (uuid_generate_v4(), 'Plank', 'Core', 'Bodyweight'),
    (uuid_generate_v4(), 'Running', 'Cardio', 'Treadmill');

-- Workout templates built by trainers
CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    goal TEXT,
    level TEXT CHECK (level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercises within a template
CREATE TABLE workout_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id),
    position INT NOT NULL DEFAULT 0,
    sets INT,
    reps TEXT,  -- can be "8-12" or "AMRAP"
    weight TEXT,
    rest_seconds INT,
    notes TEXT
);

-- Template assigned to a member
CREATE TABLE workout_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES workout_templates(id),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMPTZ
);

-- Member workout logs (self-logged by member)
CREATE TABLE workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    workout_type workout_type NOT NULL,
    duration_minutes INT,
    notes TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member weight logs
CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5,2) NOT NULL,
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- WHATSAPP CREDIT SYSTEM
-- =============================================================================

CREATE TABLE whatsapp_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 200,
    monthly_grant INT NOT NULL DEFAULT 200,
    cycle_reset_at DATE NOT NULL DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    credits_bought INT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    template whatsapp_template NOT NULL,
    phone TEXT NOT NULL,
    status whatsapp_status NOT NULL DEFAULT 'sent',
    -- Idempotency key
    idempotency_key TEXT UNIQUE,
    bsp_message_id TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- JOB QUEUE (async task runner — no Redis/SQS needed)
-- =============================================================================

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'send_whatsapp', 'generate_invoice', 'send_expiry_batch'
    payload JSONB NOT NULL DEFAULT '{}',
    status job_status NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    -- Idempotency — prevents duplicate job execution
    idempotency_key TEXT UNIQUE,
    run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status_run_after ON jobs(status, run_after) WHERE status IN ('pending', 'failed');

-- =============================================================================
-- AUDIT LOG
-- =============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SETTINGS (per-org key-value store)
-- =============================================================================

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, key)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Members
CREATE INDEX idx_members_org ON members(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_members_phone ON members(organization_id, phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_members_status ON members(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_members_auth ON members(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Subscriptions
CREATE INDEX idx_subs_org ON member_subscriptions(organization_id);
CREATE INDEX idx_subs_member ON member_subscriptions(member_id);
CREATE INDEX idx_subs_end_date ON member_subscriptions(organization_id, end_date) WHERE status = 'active';

-- Payments
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(organization_id, payment_status);

-- Attendance
CREATE INDEX idx_attendance_org_date ON attendance(organization_id, checked_in_at);
CREATE INDEX idx_attendance_member ON attendance(member_id);

-- WhatsApp messages
CREATE INDEX idx_wa_org ON whatsapp_messages(organization_id, sent_at);
CREATE INDEX idx_wa_idempotency ON whatsapp_messages(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Audit logs
CREATE INDEX idx_audit_org ON audit_logs(organization_id, created_at);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at);

-- User roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_org ON user_roles(organization_id);

-- =============================================================================
-- TRIGGERS — updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_member_subscriptions_updated BEFORE UPDATE ON member_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_membership_plans_updated BEFORE UPDATE ON membership_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workout_templates_updated BEFORE UPDATE ON workout_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_whatsapp_credits_updated BEFORE UPDATE ON whatsapp_credits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, phone)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.phone
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Helper: get current user's organization_id
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: check if current user has a permission in their org
CREATE OR REPLACE FUNCTION has_permission(perm_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON rp.role_id = ur.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = auth.uid()
          AND ur.organization_id = current_org_id()
          AND p.name = perm_name
    );
$$;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Organizations: users can only see their own org
CREATE POLICY "org_read_own" ON organizations FOR SELECT USING (id = current_org_id());
CREATE POLICY "org_update_own" ON organizations FOR UPDATE USING (id = current_org_id()) WITH CHECK (has_permission('settings:update'));

-- Branches: org-scoped
CREATE POLICY "branches_org_select" ON branches FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "branches_org_insert" ON branches FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('settings:update'));
CREATE POLICY "branches_org_update" ON branches FOR UPDATE USING (organization_id = current_org_id()) WITH CHECK (has_permission('settings:update'));

-- Profiles: users see their own, org admins see org
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "profiles_org_read" ON profiles FOR SELECT USING (organization_id = current_org_id() AND has_permission('staff:read'));

-- Members: fully org-scoped, requires permission
CREATE POLICY "members_select" ON members FOR SELECT USING (organization_id = current_org_id() AND deleted_at IS NULL AND has_permission('members:read'));
CREATE POLICY "members_insert" ON members FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('members:create'));
CREATE POLICY "members_update" ON members FOR UPDATE USING (organization_id = current_org_id()) WITH CHECK (has_permission('members:update'));
CREATE POLICY "members_delete" ON members FOR UPDATE USING (organization_id = current_org_id() AND has_permission('members:delete'));
-- Members can view their own profile via auth_user_id link
CREATE POLICY "members_self_view" ON members FOR SELECT USING (auth_user_id = auth.uid());

-- Subscriptions
CREATE POLICY "subs_select" ON member_subscriptions FOR SELECT USING (organization_id = current_org_id() AND has_permission('members:read'));
CREATE POLICY "subs_insert" ON member_subscriptions FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('members:create'));
CREATE POLICY "subs_update" ON member_subscriptions FOR UPDATE USING (organization_id = current_org_id()) WITH CHECK (has_permission('members:update'));

-- Membership plans
CREATE POLICY "plans_select" ON membership_plans FOR SELECT USING (organization_id = current_org_id() AND deleted_at IS NULL);
CREATE POLICY "plans_insert" ON membership_plans FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('plans:create'));
CREATE POLICY "plans_update" ON membership_plans FOR UPDATE USING (organization_id = current_org_id()) WITH CHECK (has_permission('plans:update'));

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT USING (organization_id = current_org_id() AND has_permission('payments:read'));
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('payments:create'));
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (organization_id = current_org_id()) WITH CHECK (has_permission('payments:update'));

-- Attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (organization_id = current_org_id() AND has_permission('attendance:read'));
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('attendance:checkin'));

-- Exercises: global exercises readable by all, org exercises by org
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (organization_id IS NULL OR organization_id = current_org_id());
CREATE POLICY "exercises_insert" ON exercises FOR INSERT WITH CHECK (organization_id = current_org_id());

-- Workout templates
CREATE POLICY "workout_templates_select" ON workout_templates FOR SELECT USING (organization_id = current_org_id() AND has_permission('workouts:read'));
CREATE POLICY "workout_templates_insert" ON workout_templates FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('workouts:create'));

-- Workout assignments
CREATE POLICY "workout_assignments_select" ON workout_assignments FOR SELECT USING (organization_id = current_org_id() AND has_permission('workouts:read'));
CREATE POLICY "workout_assignments_insert" ON workout_assignments FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('workouts:assign'));
-- Members can view their own assignments via share_token (public) — handled at API route level

-- WhatsApp credits
CREATE POLICY "wa_credits_select" ON whatsapp_credits FOR SELECT USING (organization_id = current_org_id());
CREATE POLICY "wa_credits_update" ON whatsapp_credits FOR UPDATE USING (organization_id = current_org_id());

-- WhatsApp messages
CREATE POLICY "wa_messages_select" ON whatsapp_messages FOR SELECT USING (organization_id = current_org_id() AND has_permission('whatsapp:send'));
CREATE POLICY "wa_messages_insert" ON whatsapp_messages FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('whatsapp:send'));

-- Jobs: org-scoped, only system can insert (via service role)
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (organization_id = current_org_id() OR organization_id IS NULL);

-- Audit logs: read-only for org admins
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (organization_id = current_org_id() AND has_permission('reports:read'));

-- Settings
CREATE POLICY "settings_select" ON settings FOR SELECT USING (organization_id = current_org_id() AND has_permission('settings:read'));
CREATE POLICY "settings_upsert" ON settings FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('settings:update'));
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (organization_id = current_org_id()) WITH CHECK (has_permission('settings:update'));

-- User roles: own roles visible to self, all visible to admins
CREATE POLICY "user_roles_own" ON user_roles FOR SELECT USING (user_id = auth.uid() OR (organization_id = current_org_id() AND has_permission('staff:read')));
CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT WITH CHECK (organization_id = current_org_id() AND has_permission('staff:create'));
CREATE POLICY "user_roles_delete" ON user_roles FOR DELETE USING (organization_id = current_org_id() AND has_permission('staff:delete'));

-- Roles and permissions: readable by all authenticated users
CREATE POLICY "roles_select" ON roles FOR SELECT USING (organization_id IS NULL OR organization_id = current_org_id());
CREATE POLICY "permissions_select" ON permissions FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "role_permissions_select" ON role_permissions FOR SELECT TO authenticated USING (TRUE);

-- Weight logs and workout logs: own data for members, org admin can see all
CREATE POLICY "weight_logs_select" ON weight_logs FOR SELECT USING (
    organization_id = current_org_id() AND (
        has_permission('members:read') OR
        EXISTS (SELECT 1 FROM members WHERE id = weight_logs.member_id AND auth_user_id = auth.uid())
    )
);
CREATE POLICY "weight_logs_insert" ON weight_logs FOR INSERT WITH CHECK (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM members WHERE id = weight_logs.member_id AND auth_user_id = auth.uid())
);

CREATE POLICY "workout_logs_select" ON workout_logs FOR SELECT USING (
    organization_id = current_org_id() AND (
        has_permission('members:read') OR
        EXISTS (SELECT 1 FROM members WHERE id = workout_logs.member_id AND auth_user_id = auth.uid())
    )
);
CREATE POLICY "workout_logs_insert" ON workout_logs FOR INSERT WITH CHECK (
    organization_id = current_org_id() AND
    EXISTS (SELECT 1 FROM members WHERE id = workout_logs.member_id AND auth_user_id = auth.uid())
);

-- Invoices
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (organization_id = current_org_id() AND has_permission('payments:read'));
CREATE POLICY "credit_purchases_select" ON credit_purchases FOR SELECT USING (organization_id = current_org_id());

-- =============================================================================
-- CRON JOBS via pg_cron
-- =============================================================================

-- Daily 8am expiry check — inserts a batch job into the jobs table
SELECT cron.schedule(
    'zetafit-daily-expiry-check',
    '0 8 * * *',
    $$
    INSERT INTO jobs (type, payload, idempotency_key, run_after)
    SELECT
        'send_expiry_batch',
        jsonb_build_object('date', CURRENT_DATE::TEXT),
        'expiry-' || CURRENT_DATE::TEXT,
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM jobs
        WHERE idempotency_key = 'expiry-' || CURRENT_DATE::TEXT
    );
    $$
);

-- Monthly WhatsApp credit reset
SELECT cron.schedule(
    'zetafit-monthly-credit-reset',
    '0 0 1 * *',
    $$
    UPDATE whatsapp_credits
    SET balance = monthly_grant,
        cycle_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        updated_at = NOW()
    WHERE cycle_reset_at <= CURRENT_DATE;
    $$
);

-- =============================================================================
-- USEFUL VIEWS
-- =============================================================================

-- Members with their active subscription details
CREATE OR REPLACE VIEW members_with_subscription AS
SELECT
    m.*,
    ms.id AS subscription_id,
    ms.plan_id,
    ms.start_date,
    ms.end_date,
    ms.status AS subscription_status,
    mp.name AS plan_name,
    mp.price AS plan_price,
    mp.duration_days,
    (ms.end_date - CURRENT_DATE) AS days_remaining,
    -- Outstanding dues: if member has pending payments
    COALESCE(
        (SELECT SUM(total_amount) FROM payments p
         WHERE p.member_id = m.id AND p.payment_status = 'pending'),
        0
    ) AS outstanding_dues
FROM members m
LEFT JOIN LATERAL (
    SELECT * FROM member_subscriptions ms2
    WHERE ms2.member_id = m.id
    ORDER BY ms2.end_date DESC
    LIMIT 1
) ms ON TRUE
LEFT JOIN membership_plans mp ON mp.id = ms.plan_id;

-- Organization dashboard KPIs
CREATE OR REPLACE VIEW org_dashboard_kpis AS
SELECT
    o.id AS organization_id,
    (SELECT COUNT(*) FROM members m WHERE m.organization_id = o.id AND m.status = 'active' AND m.deleted_at IS NULL) AS active_members,
    (SELECT COUNT(*) FROM attendance a WHERE a.organization_id = o.id AND a.checked_in_at::DATE = CURRENT_DATE) AS checkins_today,
    (SELECT COUNT(*) FROM member_subscriptions ms
     JOIN members m ON m.id = ms.member_id
     WHERE m.organization_id = o.id AND ms.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND ms.status = 'active') AS expiring_in_7_days,
    (SELECT COALESCE(SUM(total_amount),0) FROM payments p WHERE p.organization_id = o.id AND paid_at::DATE = CURRENT_DATE AND payment_status = 'paid') AS revenue_today,
    (SELECT COALESCE(SUM(total_amount),0) FROM payments p WHERE p.organization_id = o.id AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW()) AND payment_status = 'paid') AS revenue_this_month
FROM organizations o;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- To rollback this migration run:
--
-- SELECT cron.unschedule('zetafit-daily-expiry-check');
-- SELECT cron.unschedule('zetafit-monthly-credit-reset');
-- DROP VIEW IF EXISTS org_dashboard_kpis;
-- DROP VIEW IF EXISTS members_with_subscription;
-- DROP TABLE IF EXISTS audit_logs, settings, jobs, credit_purchases, whatsapp_messages,
--   whatsapp_credits, weight_logs, workout_logs, workout_assignments, workout_template_items,
--   workout_templates, exercises, invoices, attendance, payments, member_subscriptions,
--   members, membership_plans, user_roles, role_permissions, permissions, roles,
--   profiles, branches, organizations CASCADE;
-- DROP TYPE IF EXISTS subscription_status, member_status, payment_status, payment_method,
--   attendance_method, check_in_result, whatsapp_status, whatsapp_template, job_status,
--   audit_action, workout_type CASCADE;
-- DROP FUNCTION IF EXISTS set_updated_at, handle_new_user, current_org_id, has_permission CASCADE;
