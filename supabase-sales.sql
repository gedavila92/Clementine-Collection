create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  channel text default 'WhatsApp',
  notes text,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table sales enable row level security;

drop policy if exists "Authenticated users can view sales" on sales;
drop policy if exists "Authenticated users can insert sales" on sales;
drop policy if exists "Authenticated users can update sales" on sales;
drop policy if exists "Authenticated users can delete sales" on sales;

create policy "Authenticated users can view sales"
on sales
for select
to authenticated
using (auth.role() = 'authenticated');

create policy "Authenticated users can insert sales"
on sales
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "Authenticated users can update sales"
on sales
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete sales"
on sales
for delete
to authenticated
using (auth.role() = 'authenticated');

create index if not exists sales_product_id_idx on sales(product_id);
create index if not exists sales_sold_at_idx on sales(sold_at desc);
