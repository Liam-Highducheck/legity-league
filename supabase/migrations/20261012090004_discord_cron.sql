-- Runs the Discord Edge Function every 15 minutes for each group that has posting switched on.
-- Apply this LAST: deploy the `discord-tick` function and create the two Vault secrets first (docs/discord.md).
-- Off switch:  select cron.unschedule('discord-tick');

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function private.discord_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_url text;
  g record;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'discord_cron_secret';
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'discord_functions_url';
  if v_secret is null or v_url is null then
    return; -- not set up yet
  end if;
  for g in
    select group_id from public.group_discord
    where enabled and webhook_url is not null and webhook_status = 'ok'
  loop
    perform net.http_post(
      url := rtrim(v_url, '/') || '/discord-tick',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
      body := jsonb_build_object('group_id', g.group_id),
      timeout_milliseconds := 60000
    );
  end loop;
end;
$$;

revoke execute on function private.discord_tick() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'discord-tick') then
    perform cron.unschedule('discord-tick');
  end if;
  perform cron.schedule('discord-tick', '*/15 * * * *', 'select private.discord_tick()');
end;
$$;
