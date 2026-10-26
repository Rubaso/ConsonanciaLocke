alter table public.players
  add column trainer_sprite text
  check (trainer_sprite is null or trainer_sprite ~ '^[A-Za-z0-9_-]{1,80}$');
