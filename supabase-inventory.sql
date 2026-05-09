alter table products
add column if not exists stock integer not null default 0 check (stock >= 0);

update products
set stock = 1,
    available = true
where stock is null
   or stock < 1;
