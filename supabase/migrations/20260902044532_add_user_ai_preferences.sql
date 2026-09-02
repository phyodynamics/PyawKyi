alter table public.users
  add column if not exists custom_prompt text
    check (
      custom_prompt is null
      or char_length(custom_prompt) <= 3000
    ),
  add column if not exists gemini_model text not null default 'gemini-3.5-flash'
    check (
      gemini_model in ('gemini-3.5-flash', 'gemini-3.5-flash-lite')
    );

comment on column public.users.custom_prompt is
  'Optional per-user instructions appended to PyawKyi system prompts.';

comment on column public.users.gemini_model is
  'Allowlisted Gemini model used by both web and public API requests.';

alter table public.users enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_select_own_profile'
  ) then
    create policy users_select_own_profile
      on public.users
      for select
      to authenticated
      using ((select auth.uid()) = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_update_own_profile'
  ) then
    create policy users_update_own_profile
      on public.users
      for update
      to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end
$$;
