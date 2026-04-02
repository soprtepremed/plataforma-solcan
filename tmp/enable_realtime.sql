-- Enable Realtime for notificaciones table
begin;
  -- remove the table from the replication if it exists
  alter publication supabase_realtime drop table if exists notificaciones;

  -- add the table to the replication
  alter publication supabase_realtime add table notificaciones;
commit;
