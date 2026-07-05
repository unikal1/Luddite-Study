create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "profiles select active members or self" on public.profiles;
create policy "profiles select active members or self"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or app_private.is_active_member() or app_private.is_bootstrap_open());

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "study members insert managers or bootstrap" on public.study_members;
create policy "study members insert managers or bootstrap"
  on public.study_members for insert
  to authenticated
  with check (
    app_private.can_manage_study()
    or (
      app_private.is_bootstrap_open()
      and profile_id = (select auth.uid())
      and role in ('owner', 'admin')
    )
  );

drop policy if exists "study members update managers or self" on public.study_members;
create policy "study members update managers or self"
  on public.study_members for update
  to authenticated
  using (
    app_private.can_manage_study()
    or profile_id = (select auth.uid())
    or app_private.is_bootstrap_open()
  )
  with check (
    app_private.can_manage_study()
    or profile_id = (select auth.uid())
    or app_private.is_bootstrap_open()
  );

create index if not exists activity_events_actor_member_id_idx on public.activity_events(actor_member_id);
create index if not exists attachments_document_id_idx on public.attachments(document_id);
create index if not exists attachments_uploaded_by_idx on public.attachments(uploaded_by);
create index if not exists document_folders_created_by_idx on public.document_folders(created_by);
create index if not exists document_folders_owner_member_id_idx on public.document_folders(owner_member_id);
create index if not exists document_folders_session_id_idx on public.document_folders(session_id);
create index if not exists document_versions_edited_by_idx on public.document_versions(edited_by);
create index if not exists documents_created_by_idx on public.documents(created_by);
create index if not exists documents_updated_by_idx on public.documents(updated_by);
create index if not exists penalties_member_id_idx on public.penalties(member_id);
create index if not exists penalties_session_id_idx on public.penalties(session_id);
create index if not exists progress_topics_owner_member_id_idx on public.progress_topics(owner_member_id);
create index if not exists study_sessions_created_by_idx on public.study_sessions(created_by);
create index if not exists study_sessions_facilitator_member_id_idx on public.study_sessions(facilitator_member_id);
