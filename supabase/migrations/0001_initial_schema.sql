-- MotoMil Taller - initial multi-tenant schema
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner','admin','reception','mechanic','finance','customer');
create type public.order_status as enum ('received','diagnosis','quote','approved','repair','quality','ready','delivered','cancelled');
create type public.quote_status as enum ('draft','pending','approved','rejected','expired');
create type public.movement_type as enum ('purchase','order_usage','sale','adjustment','return');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  phone text,
  email text,
  address text,
  city text,
  country text not null default 'CO',
  currency text not null default 'COP',
  plan text not null default 'starter' check (plan in ('starter','professional','enterprise')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'reception',
  created_at timestamptz not null default now(),
  unique(organization_id,user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  document_number text,
  email text,
  phone text,
  whatsapp text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  plate text not null,
  vin text,
  brand text not null,
  model text not null,
  year integer,
  color text,
  engine_cc integer,
  current_km integer not null default 0,
  next_maintenance_km integer,
  next_maintenance_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,plate)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  motorcycle_id uuid references public.motorcycles(id) on delete set null,
  mechanic_id uuid references public.organization_members(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  service_type text,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','waiting','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mechanics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  specialty text,
  hourly_cost numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_number bigint generated always as identity,
  customer_id uuid not null references public.customers(id) on delete restrict,
  motorcycle_id uuid not null references public.motorcycles(id) on delete restrict,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  status public.order_status not null default 'received',
  mileage integer not null default 0,
  reported_problem text,
  diagnosis text,
  observations text,
  received_at timestamptz not null default now(),
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_order_items (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  item_type text not null check (item_type in ('service','part','labor','other')),
  inventory_product_id uuid,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_cost numeric(14,2) not null default 0,
  unit_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.vehicle_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete cascade,
  storage_path text not null,
  photo_type text,
  caption text,
  created_at timestamptz not null default now()
);

create table public.reception_checklists (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null unique references public.service_orders(id) on delete cascade,
  fuel_level text,
  tires_status text,
  brakes_status text,
  lights_status text,
  fairings_status text,
  accessories_status text,
  existing_damage text,
  customer_signature_path text,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  mechanic_id uuid references public.mechanics(id) on delete set null,
  findings text not null,
  recommendations text,
  estimated_hours numeric(8,2),
  created_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_order_id uuid not null unique references public.service_orders(id) on delete cascade,
  status public.quote_status not null default 'draft',
  public_token text not null unique default encode(gen_random_bytes(18),'hex'),
  expires_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  approved_by_name text,
  rejection_reason text,
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  item_type text not null check (item_type in ('service','part','labor','other')),
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  tax_id text,
  contact_name text,
  phone text,
  email text,
  payment_terms text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  sku text not null,
  name text not null,
  category text,
  brand text,
  stock numeric(12,2) not null default 0,
  minimum_stock numeric(12,2) not null default 0,
  cost numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,sku)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  inventory_product_id uuid not null references public.inventory_products(id) on delete restrict,
  movement_type public.movement_type not null,
  quantity numeric(12,2) not null,
  unit_cost numeric(14,2) not null default 0,
  service_order_id uuid references public.service_orders(id) on delete set null,
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  subtotal numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','partial','paid','void')),
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  unique(organization_id,invoice_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(14,2) not null,
  method text not null check (method in ('cash','transfer','card','other')),
  reference text,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.maintenance_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  service_type text not null,
  interval_km integer,
  interval_days integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.maintenance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  service_order_id uuid references public.service_orders(id) on delete set null,
  maintenance_rule_id uuid references public.maintenance_rules(id) on delete set null,
  service_type text not null,
  performed_km integer,
  performed_at date,
  next_due_km integer,
  next_due_date date,
  status text not null default 'completed' check (status in ('scheduled','due','completed','overdue')),
  created_at timestamptz not null default now()
);

create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  starts_at date not null,
  ends_at date,
  terms text,
  status text not null default 'active' check (status in ('active','expired','claimed','void')),
  created_at timestamptz not null default now()
);

create table public.crm_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  channel text not null check (channel in ('whatsapp','email','sms')),
  template_name text,
  recipient text,
  body text,
  status text not null default 'queued',
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index idx_customers_org on public.customers(organization_id);
create index idx_motos_org on public.motorcycles(organization_id);
create index idx_orders_org_status on public.service_orders(organization_id,status);
create index idx_orders_customer on public.service_orders(customer_id);
create index idx_inventory_org on public.inventory_products(organization_id);
create index idx_inventory_movements_product on public.inventory_movements(inventory_product_id,created_at desc);
create index idx_appointments_org_date on public.appointments(organization_id,starts_at);
create index idx_maintenance_moto on public.maintenance_events(motorcycle_id,performed_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger orgs_updated before update on public.organizations for each row execute function public.set_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger motos_updated before update on public.motorcycles for each row execute function public.set_updated_at();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.service_orders for each row execute function public.set_updated_at();
create trigger quotes_updated before update on public.quotations for each row execute function public.set_updated_at();
create trigger inventory_updated before update on public.inventory_products for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,full_name,avatar_url) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url') on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_org_member(target_org uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid());
$$;

create or replace function public.is_org_admin(target_org uuid) returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=target_org and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;

-- Enable RLS on tenant data.
do $$ declare t text; begin for t in select unnest(array['organizations','organization_members','customers','motorcycles','appointments','mechanics','service_orders','service_order_items','vehicle_photos','reception_checklists','diagnostics','quotations','quotation_items','suppliers','inventory_products','inventory_movements','invoices','payments','maintenance_rules','maintenance_events','warranties','crm_messages','audit_logs']) loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

create policy "org members can read organizations" on public.organizations for select using (public.is_org_member(id));
create policy "users can create organizations" on public.organizations for insert with check (created_by=auth.uid());
create policy "org admins update organizations" on public.organizations for update using (public.is_org_admin(id));

create policy "members read memberships" on public.organization_members for select using (user_id=auth.uid() or public.is_org_admin(organization_id));
create policy "owner can create membership" on public.organization_members for insert with check (user_id=auth.uid() or public.is_org_admin(organization_id));
create policy "admins manage memberships" on public.organization_members for update using (public.is_org_admin(organization_id));
create policy "admins delete memberships" on public.organization_members for delete using (public.is_org_admin(organization_id));

-- Generic tenant policy pattern for all business tables.
create policy "members manage customers" on public.customers for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage motorcycles" on public.motorcycles for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage appointments" on public.appointments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage mechanics" on public.mechanics for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage orders" on public.service_orders for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage suppliers" on public.suppliers for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage inventory" on public.inventory_products for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage movements" on public.inventory_movements for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage invoices" on public.invoices for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage payments" on public.payments for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage maintenance rules" on public.maintenance_rules for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage maintenance events" on public.maintenance_events for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage warranties" on public.warranties for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage messages" on public.crm_messages for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage audit" on public.audit_logs for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "members manage order items" on public.service_order_items for all using (exists(select 1 from public.service_orders o where o.id=service_order_id and public.is_org_member(o.organization_id))) with check (exists(select 1 from public.service_orders o where o.id=service_order_id and public.is_org_member(o.organization_id)));
create policy "members manage photos" on public.vehicle_photos for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage reception" on public.reception_checklists for all using (exists(select 1 from public.service_orders o where o.id=service_order_id and public.is_org_member(o.organization_id))) with check (exists(select 1 from public.service_orders o where o.id=service_order_id and public.is_org_member(o.organization_id)));
create policy "members manage diagnostics" on public.diagnostics for all using (exists(select 1 from public.service_orders o where o.id=service_order_id and public.is_org_member(o.organization_id))) with check (exists(select 1 from public.service_orders o where o.id=service_order_id and public.is_org_member(o.organization_id)));
create policy "members manage quotations" on public.quotations for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "members manage quotation items" on public.quotation_items for all using (exists(select 1 from public.quotations q where q.id=quotation_id and public.is_org_member(q.organization_id))) with check (exists(select 1 from public.quotations q where q.id=quotation_id and public.is_org_member(q.organization_id)));

-- Public quotation approval only through a controlled server route should be added later.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vehicle-photos','vehicle-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "members upload vehicle photos" on storage.objects for insert to authenticated with check (
  bucket_id='vehicle-photos' and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy "members read vehicle photos" on storage.objects for select to authenticated using (
  bucket_id='vehicle-photos' and public.is_org_member((storage.foldername(name))[1]::uuid)
);
create policy "members delete vehicle photos" on storage.objects for delete to authenticated using (
  bucket_id='vehicle-photos' and public.is_org_member((storage.foldername(name))[1]::uuid)
);

-- Seed an optional demo organization only if you later replace the owner UUID with a real auth user.
-- Keep demo data in the application until a real organization is created.

-- First-login helper. Call from a trusted server action after authentication.
create or replace function public.create_my_organization(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.organizations(name,created_by) values (p_name,auth.uid()) returning id into new_org;
  insert into public.organization_members(organization_id,user_id,role) values (new_org,auth.uid(),'owner');
  return new_org;
end; $$;
revoke all on function public.create_my_organization(text) from public;
grant execute on function public.create_my_organization(text) to authenticated;
