create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferred_name text;
  preferred_github text;
begin
  preferred_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(coalesce(new.email, 'new-user'), '@', 1)
  );
  preferred_github := nullif(lower(coalesce(
    new.raw_user_meta_data ->> 'user_name',
    new.raw_user_meta_data ->> 'preferred_username'
  )), '');

  insert into public.profiles (id, email, display_name, github_username, avatar_url)
  values (
    new.id,
    new.email,
    preferred_name,
    preferred_github,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      github_username = excluded.github_username,
      avatar_url = excluded.avatar_url,
      updated_at = now();

  update public.study_members
  set profile_id = new.id,
      updated_at = now()
  where profile_id is null
    and active = true
    and (
      (invite_email is not null and new.email is not null and lower(invite_email) = lower(new.email))
      or (github_username is not null and preferred_github is not null and lower(github_username) = preferred_github)
    );

  return new;
end;
$$;

create or replace function public.claim_study_member()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text;
  auth_github text;
  auth_name text;
  auth_avatar text;
  claimed_member_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select
    users.email,
    nullif(lower(coalesce(
      users.raw_user_meta_data ->> 'user_name',
      users.raw_user_meta_data ->> 'preferred_username'
    )), ''),
    coalesce(
      users.raw_user_meta_data ->> 'name',
      users.raw_user_meta_data ->> 'full_name',
      users.raw_user_meta_data ->> 'user_name',
      split_part(coalesce(users.email, 'new-user'), '@', 1)
    ),
    users.raw_user_meta_data ->> 'avatar_url'
  into auth_email, auth_github, auth_name, auth_avatar
  from auth.users
  where users.id = auth.uid();

  insert into public.profiles (id, email, display_name, github_username, avatar_url)
  values (auth.uid(), auth_email, auth_name, auth_github, auth_avatar)
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      github_username = excluded.github_username,
      avatar_url = excluded.avatar_url,
      updated_at = now();

  select id
  into claimed_member_id
  from public.study_members
  where profile_id = auth.uid()
    and active = true
  limit 1;

  if claimed_member_id is not null then
    return claimed_member_id;
  end if;

  with matched_member as (
    select id
    from public.study_members
    where profile_id is null
      and active = true
      and (
        (invite_email is not null and auth_email is not null and lower(invite_email) = lower(auth_email))
        or (github_username is not null and auth_github is not null and lower(github_username) = auth_github)
      )
    order by
      case
        when github_username is not null and auth_github is not null and lower(github_username) = auth_github then 0
        else 1
      end,
      created_at
    limit 1
  )
  update public.study_members
  set profile_id = auth.uid(),
      updated_at = now()
  from matched_member
  where study_members.id = matched_member.id
  returning study_members.id into claimed_member_id;

  return claimed_member_id;
end;
$$;

create or replace function public.get_study_access_context()
returns table (
  current_member_id uuid,
  is_active_member boolean,
  can_manage_study boolean,
  bootstrap_open boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.current_member_id(),
    app_private.is_active_member(),
    app_private.can_manage_study(),
    app_private.is_bootstrap_open()
$$;

revoke execute on function public.claim_study_member() from public, anon;
grant execute on function public.claim_study_member() to authenticated;

revoke execute on function public.get_study_access_context() from public, anon;
grant execute on function public.get_study_access_context() to authenticated;
