# Architecture

Luddite Study는 GitHub Pages와 Supabase를 분리해서 운영한다.

## Responsibilities

- GitHub Pages: Vite/React 정적 프론트엔드 배포
- Supabase Auth: GitHub OAuth, 이메일/비밀번호 로그인, 비밀번호 재설정
- Supabase Postgres: 모든 운영 데이터와 Markdown 문서의 SSOT
- Supabase Storage: 문서 이미지와 첨부 파일 보관
- GitHub repository: 앱 코드, 문서, Supabase config/migrations

저장소의 `data/`, `자료/`, `발표/` 파일은 더 이상 런타임 SSOT가 아니다. 새 자료와 발표는 UI에서 Supabase `documents`에 저장한다.

## Frontend Flow

1. 앱이 Supabase Auth session을 확인한다.
2. 로그인하지 않은 사용자는 Auth 화면을 본다.
3. 로그인한 사용자는 RLS를 통해 허용된 데이터만 읽는다.
4. 자료/발표 탭에서 폴더와 Markdown 문서를 CRUD한다.
5. 이미지 드래그앤드롭은 Storage 업로드 후 `supabase://study-attachments/...` Markdown URI로 삽입된다.
6. Markdown 렌더러는 private Storage 객체를 signed URL로 변환해 표시한다.

## Authorization

RLS 기준은 `study_members.profile_id = auth.uid()`이고 `active = true`인 멤버다.

- 읽기: 활성 멤버
- 문서 쓰기: 활성 멤버, 단 수정/삭제는 소유자 또는 운영 권한
- 운영 쓰기: `owner`, `admin`, `facilitator`
- 부트스트랩: 아직 Auth와 연결된 운영자가 없으면 첫 로그인 사용자가 운영자 멤버를 만들 수 있다.
