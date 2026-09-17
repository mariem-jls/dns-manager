-- ============================================
-- Row Level Security Policies
-- ============================================

-- Fonction helper : retourne le rôle de l'utilisateur courant
create or replace function public.current_user_role()
returns text as $$
    select role from public.user_profiles
    where id = auth.uid()
$$ language sql security definer;

-- ============================================
-- dns_zones
-- ============================================
drop policy if exists "zones_select" on public.dns_zones;
create policy "zones_select" on public.dns_zones
    for select using (
        auth.role() = 'authenticated'
        and public.current_user_role() in ('admin', 'operator', 'viewer')
    );

drop policy if exists "zones_insert" on public.dns_zones;
create policy "zones_insert" on public.dns_zones
    for insert with check (
        auth.role() = 'authenticated'
        and public.current_user_role() in ('admin', 'operator')
    );

drop policy if exists "zones_update" on public.dns_zones;
create policy "zones_update" on public.dns_zones
    for update using (
        auth.role() = 'authenticated'
        and public.current_user_role() in ('admin', 'operator')
    );

drop policy if exists "zones_delete" on public.dns_zones;
create policy "zones_delete" on public.dns_zones
    for delete using (
        auth.role() = 'authenticated'
        and public.current_user_role() = 'admin'
    );

-- ============================================
-- audit_logs
-- ============================================
drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs
    for select using (
        auth.role() = 'authenticated'
        and public.current_user_role() in ('admin', 'operator', 'viewer')
    );

drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs
    for insert with check (
        auth.role() = 'authenticated'
    );

-- ============================================
-- user_profiles
-- ============================================
drop policy if exists "profiles_select" on public.user_profiles;
create policy "profiles_select" on public.user_profiles
    for select using (
        auth.role() = 'authenticated'
    );

drop policy if exists "profiles_update_admin" on public.user_profiles;
create policy "profiles_update_admin" on public.user_profiles
    for update using (
        auth.role() = 'authenticated'
        and public.current_user_role() = 'admin'
    );

drop policy if exists "profiles_self_update" on public.user_profiles;
create policy "profiles_self_update" on public.user_profiles
    for update using (
        auth.role() = 'authenticated'
        and id = auth.uid()
    );

-- ============================================
-- Politiques pour service_role (backend)
-- ============================================

-- dns_zones
drop policy if exists "zones_service_all" on public.dns_zones;
create policy "zones_service_all" on public.dns_zones
    for all to service_role
    using (true)
    with check (true);

-- audit_logs
drop policy if exists "audit_service_all" on public.audit_logs;
create policy "audit_service_all" on public.audit_logs
    for all to service_role
    using (true)
    with check (true);

-- user_profiles
drop policy if exists "profiles_service_all" on public.user_profiles;
create policy "profiles_service_all" on public.user_profiles
    for all to service_role
    using (true)
    with check (true);