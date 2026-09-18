-- ============================================
-- Table : dns_zones
-- Stocke les métadonnées des zones DNS
-- ============================================
create table if not exists public.dns_zones (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    type text not null default 'master' check (type in ('master', 'slave')),
    description text,
    created_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_dns_zones_name on public.dns_zones (name);
create index if not exists idx_dns_zones_type on public.dns_zones (type);

-- ============================================
-- Table : audit_logs
-- Historique des actions
-- ============================================
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor text not null,
    action text not null,
    details text,
    created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs (actor);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- ============================================
-- Table : user_profiles
-- Profils utilisateurs (lié à auth.users de Supabase)
-- ============================================
create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null unique,
    role text not null default 'viewer' check (role in ('admin', 'operator', 'viewer')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles (email);
create index if not exists idx_user_profiles_role on public.user_profiles (role);

-- ============================================
-- Trigger : updated_at automatique
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_dns_zones_updated_at on public.dns_zones;
create trigger trg_dns_zones_updated_at
    before update on public.dns_zones
    for each row
    execute function public.handle_updated_at();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
    before update on public.user_profiles
    for each row
    execute function public.handle_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
alter table public.dns_zones enable row level security;
alter table public.audit_logs enable row level security;
alter table public.user_profiles enable row level security;



-- 1. Créer la fonction
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
    SELECT role FROM public.user_profiles
    WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Créer la table dns_records
CREATE TABLE IF NOT EXISTS public.dns_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 3600,
    priority INTEGER,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dns_records_zone ON public.dns_records (zone_name);

-- 3. RLS pour dns_records
ALTER TABLE public.dns_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "records_service_all" ON public.dns_records;
CREATE POLICY "records_service_all" ON public.dns_records
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

