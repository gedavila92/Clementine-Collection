drop policy if exists "Public can view available products" on products;
drop policy if exists "Authenticated users can manage products" on products;
drop policy if exists "Authenticated users can insert products" on products;
drop policy if exists "Authenticated users can update products" on products;
drop policy if exists "Authenticated users can delete products" on products;

alter table products enable row level security;

create policy "Public can view available products"
on products
for select
using (available = true or auth.role() = 'authenticated');

create policy "Authenticated users can insert products"
on products
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "Authenticated users can update products"
on products
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "Authenticated users can delete products"
on products
for delete
to authenticated
using (auth.role() = 'authenticated');

drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;

create policy "Public can view product images"
on storage.objects
for select
using (bucket_id = 'products');

create policy "Authenticated users can upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
);

create policy "Authenticated users can update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
)
with check (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
);

create policy "Authenticated users can delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'products'
  and auth.role() = 'authenticated'
);
