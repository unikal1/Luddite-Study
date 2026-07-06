update public.study_members
set github_username = null,
    updated_at = now()
where profile_id is null
  and member_uid in ('alice', 'bob', 'chris')
  and github_username in ('alice-study', 'bob-study', 'chris-study');
