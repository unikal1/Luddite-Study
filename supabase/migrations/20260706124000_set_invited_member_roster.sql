delete from public.study_members
where member_uid not in ('jack8226123', 'sjhlko', 'pokjm99');

update public.study_members
set role = 'admin',
    role_label = '관리자',
    active = true,
    updated_at = now()
where member_uid = 'jack8226123';

insert into public.study_members (
  member_uid,
  display_name,
  invite_email,
  github_username,
  role,
  role_label,
  color,
  active,
  material_root,
  presentation_root
)
values
  ('sjhlko', 'sjhlko', 'sjhlko@naver.com', null, 'member', '일반 사용자', '#2563eb', true, '자료/sjhlko', '발표/*/sjhlko'),
  ('pokjm99', 'pokjm99', 'pokjm99@gmail.com', null, 'member', '일반 사용자', '#16a34a', true, '자료/pokjm99', '발표/*/pokjm99')
on conflict (member_uid) do update
set display_name = excluded.display_name,
    invite_email = excluded.invite_email,
    github_username = excluded.github_username,
    role = excluded.role,
    role_label = excluded.role_label,
    color = excluded.color,
    active = excluded.active,
    material_root = excluded.material_root,
    presentation_root = excluded.presentation_root,
    updated_at = now();
