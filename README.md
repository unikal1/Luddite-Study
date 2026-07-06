# Luddite Study

GitHub Pages에 정적 React 앱만 배포하고, 모든 영속 데이터는 Supabase를 SSOT로 사용하는 스터디 운영 도구입니다.

## 빠른 시작

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

## 데이터 저장 위치

- 사용자/멤버, 회차, 발표일, 자료/발표 Markdown, 진도, 벌칙, 활동 로그: Supabase Postgres
- 이미지/첨부: Supabase Storage `study-attachments` 버킷
- 인증: Supabase Auth, GitHub OAuth
- 저장소: 앱 코드, 문서, Supabase migration/config만 보관

자료와 발표 탭에서 폴더와 Markdown 문서를 직접 만들고 수정합니다. 발표 탭은 회차를 먼저 선택한 뒤 사람별 트리를 보여줍니다.

## 환경 변수

`.env.example`을 기준으로 로컬 `.env.local`을 만들 수 있습니다.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

publishable key만 프론트엔드에 둘 수 있습니다. service role key, DB password, OAuth client secret은 코드/문서/로그에 남기지 않습니다.

## Supabase

마이그레이션은 `supabase/migrations`에 있습니다. 적용된 주요 리소스:

- 테이블: `profiles`, `study_members`, `study_sessions`, `document_folders`, `documents`, `document_versions`, `progress_topics`, `penalties`, `activity_events`, `attachments`
- Storage bucket: `study-attachments`
- RLS: 활성 `study_members`만 읽기/쓰기, 운영 권한은 `owner/admin/facilitator`
- 첫 운영자 부트스트랩: Auth 사용자와 연결된 운영자가 없을 때 첫 로그인 사용자가 운영자로 등록

자세한 내용은 `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/OPERATIONS.md`를 봅니다.
