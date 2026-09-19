-- Ooty Inventory — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text default '',
  phone text default '',
  email text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text default '',
  unit text not null default 'pcs',
  quantity numeric not null default 0,
  low_stock_threshold numeric not null default 0,
  supplier_id uuid references suppliers(id) on delete set null,
  unit_cost numeric not null default 0,
  photo text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'ordered', 'partially_received', 'received')),
  items jsonb not null default '[]',
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  quantity numeric not null,
  reason text default 'adjustment',
  note text default '',
  member_name text default '',
  member_role text default '',
  po_id uuid references purchase_orders(id) on delete set null,
  "timestamp" timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists movements_product_id_idx on movements(product_id);
create index if not exists movements_timestamp_idx on movements("timestamp" desc);
create index if not exists products_supplier_id_idx on products(supplier_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — only a signed-in team member (the one shared login)
-- can read or write anything. The public anon key alone gets nothing.
-- ---------------------------------------------------------------------------

alter table suppliers enable row level security;
alter table products enable row level security;
alter table purchase_orders enable row level security;
alter table movements enable row level security;

drop policy if exists "team full access" on suppliers;
create policy "team full access" on suppliers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "team full access" on products;
create policy "team full access" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "team full access" on purchase_orders;
create policy "team full access" on purchase_orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "team full access" on movements;
create policy "team full access" on movements
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Atomic stock operations. With several people editing the same product at
-- once, a naive "read quantity, compute new value, write it back" from the
-- browser can silently lose one person's change (classic lost-update race).
-- These run as a single database statement/transaction instead, so
-- concurrent edits are always serialized correctly by Postgres.
-- ---------------------------------------------------------------------------

create or replace function adjust_stock(
  p_product_id uuid,
  p_delta numeric,
  p_reason text,
  p_note text,
  p_member_name text,
  p_member_role text,
  p_po_id uuid default null
) returns products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product products;
begin
  update products
    set quantity = greatest(0, quantity + p_delta),
        updated_at = now()
    where id = p_product_id
    returning * into v_product;

  if not found then
    raise exception 'Product not found';
  end if;

  insert into movements (product_id, type, quantity, reason, note, member_name, member_role, po_id)
  values (
    p_product_id,
    case when p_delta < 0 then 'out' else 'in' end,
    p_delta,
    p_reason,
    p_note,
    p_member_name,
    p_member_role,
    p_po_id
  );

  return v_product;
end;
$$;

grant execute on function adjust_stock(uuid, numeric, text, text, text, text, uuid) to authenticated;

create or replace function receive_purchase_order(
  p_po_id uuid,
  p_received jsonb, -- [{"productId": "...", "qty": number}, ...]
  p_member_name text,
  p_member_role text
) returns purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po purchase_orders;
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_recv jsonb;
  v_qty numeric;
  v_remaining numeric;
  v_total_ordered numeric := 0;
  v_total_received numeric := 0;
  v_new_status text;
begin
  select * into v_po from purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'Purchase order not found';
  end if;

  for v_item in select * from jsonb_array_elements(v_po.items)
  loop
    select r into v_recv
      from jsonb_array_elements(p_received) r
      where (r->>'productId')::uuid = (v_item->>'productId')::uuid
      limit 1;

    v_remaining := (v_item->>'qtyOrdered')::numeric - (v_item->>'qtyReceived')::numeric;
    v_qty := least(greatest(0, coalesce((v_recv->>'qty')::numeric, 0)), v_remaining);

    if v_qty > 0 then
      update products
        set quantity = quantity + v_qty, updated_at = now()
        where id = (v_item->>'productId')::uuid;

      insert into movements (product_id, type, quantity, reason, note, member_name, member_role, po_id)
      values ((v_item->>'productId')::uuid, 'in', v_qty, 'received', 'PO receipt', p_member_name, p_member_role, p_po_id);
    end if;

    v_item := jsonb_set(v_item, '{qtyReceived}', to_jsonb(((v_item->>'qtyReceived')::numeric + v_qty)));
    v_items := v_items || jsonb_build_array(v_item);

    v_total_ordered := v_total_ordered + (v_item->>'qtyOrdered')::numeric;
    v_total_received := v_total_received + (v_item->>'qtyReceived')::numeric;
  end loop;

  if v_total_received <= 0 then
    v_new_status := v_po.status;
  elsif v_total_received >= v_total_ordered then
    v_new_status := 'received';
  else
    v_new_status := 'partially_received';
  end if;

  update purchase_orders
    set items = v_items, status = v_new_status, updated_at = now()
    where id = p_po_id
    returning * into v_po;

  return v_po;
end;
$$;

grant execute on function receive_purchase_order(uuid, jsonb, text, text) to authenticated;
