# Data Model

Supabase Postgres가 모든 영속 데이터의 SSOT다.

## Tables

- `profiles`: Supabase Auth 사용자 프로필. `auth.users.id`를 참조한다.
- `study_members`: 스터디 멤버와 권한. `member_uid`, 표시 이름, 초대 이메일, GitHub ID, 역할, 활성 여부를 저장한다.
- `study_sessions`: 회차, 주차, 기간, 발표일, 시간, 장소, 진행자, 당일 발표자, 안건, 진도를 저장한다.
- `document_folders`: 자료/발표의 디렉토리 트리. 경로 기반이므로 깊이 제한이 없다.
- `documents`: Markdown 자료/발표 본문, 제목, 요약, 태그, 저자, 회차, 경로를 저장한다.
- `document_versions`: 문서 insert/update 시 자동 기록되는 버전 이력.
- `progress_topics`: 운영 진도 항목.
- `penalties`: 벌칙 데이터. 대시보드에는 표시하지 않지만 운영 데이터로 유지한다.
- `activity_events`: 문서/회차 변경 활동 로그.
- `attachments`: Storage 객체와 문서의 연결 정보.

## Storage

버킷: `study-attachments`

- private bucket
- 허용 MIME: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- 최대 크기: 20 MiB
- 클라이언트는 upload 후 `attachments` row를 만든다.

## RLS

모든 public 테이블은 RLS가 켜져 있다.

- `authenticated` 사용자 중 활성 `study_members`만 데이터 접근 가능
- 운영 쓰기는 `owner/admin/facilitator`
- 문서 수정/삭제는 운영자 또는 문서 소유자/작성자
- Storage `storage.objects`도 `study-attachments` 버킷에 대해 활성 멤버만 접근 가능
- service role은 프론트엔드에서 사용하지 않는다.

보안 advisor 기준 경고는 현재 없다.
