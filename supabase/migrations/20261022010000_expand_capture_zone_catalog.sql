begin;

update public.routes
set sort_order = 1000 + id;

update public.routes
set sort_order = case
  when id between 1 and 19 then id
  when id between 20 and 33 then id + 1
  when id between 34 and 56 then id + 2
  when id = 57 then 35
  when id = 58 then 59
  when id = 59 then 20
end;

insert into public.routes (id, name, sort_order, is_outdoor) values
  (57, 'Ruta 13', 35, true),
  (58, 'Ruta 18', 59, true),
  (59, 'Gruta Ondego', 20, false)
on conflict (id) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_outdoor = excluded.is_outdoor;

insert into public.route_map_ids (map_id, route_id) values
  (131, 17),
  (155, 25),
  (165, 29),
  (179, 33),
  (180, 33),
  (181, 57),
  (193, 34),
  (200, 37),
  (201, 37),
  (203, 59),
  (218, 42),
  (237, 58)
on conflict (map_id) do update
set route_id = excluded.route_id;

update public.medals
set name = case id
  when 1 then 'Medalla Calma'
  when 2 then 'Medalla Libertad'
  when 3 then 'Medalla Temple'
  when 4 then 'Medalla Unión'
  when 5 then 'Medalla Honra'
end
where id between 1 and 5;

commit;
