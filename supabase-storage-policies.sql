create policy "Public can view product images"
on storage.objects
for select
using (bucket_id = 'products');

create policy "Authenticated users can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'products');

create policy "Authenticated users can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'products')
with check (bucket_id = 'products');

create policy "Authenticated users can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'products');
