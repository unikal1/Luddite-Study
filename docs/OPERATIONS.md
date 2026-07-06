# Operations

## First Owner

새 Supabase 프로젝트에는 Auth 사용자와 연결된 운영자가 없다.

1. 앱에서 GitHub OAuth로 로그인한다.
2. 첫 운영자 등록 화면에서 현재 계정을 운영자로 연결한다.
3. 이후 RLS는 일반 운영 모드로 전환된다.

## Login

지원 방식:

- GitHub OAuth

GitHub OAuth를 실제로 쓰려면 Supabase Dashboard의 Auth Providers에서 GitHub provider를 켜고 GitHub OAuth App의 Client ID/Secret을 등록한다. OAuth client secret은 저장소에 두지 않는다.

## Participants

운영 권한(`owner/admin/facilitator`) 사용자는 운영 탭에서 참여자를 추가한다.

- `member_uid`: 문서 경로에 쓰이는 안정 ID
- `invite_email`: GitHub OAuth 계정 이메일과 자동 연결하는 보조 기준
- `github_username`: GitHub OAuth 사용자 식별 보조 정보
- `role`: `owner`, `admin`, `facilitator`, `member`

초대 이메일과 같은 이메일을 가진 GitHub Auth 사용자는 DB trigger에 의해 해당 `study_members` row에 연결된다.

## Sessions

운영 탭에서 회차를 수정한다.

- 시작일/종료일: 회차 범위
- 발표일: 발표가 진행되는 날짜
- 발표자: 당일 추첨 후 저장
- 회차 종료: 현재 회차를 `done`으로 변경
- 새 회차 시작: 기존 current를 종료하고 새 current 회차를 생성

## Documents

자료와 발표 탭에서 작성한다.

- 자료: 회차 없이 사람/공유 기준으로 저장
- 발표: 선택한 회차 안에서 사람 기준으로 저장
- 폴더: `document_folders.path`로 저장하며 깊이 제한 없음
- 이미지: Markdown 입력칸에 드래그앤드롭하면 Storage에 업로드

## Deployment

GitHub Pages workflow는 정적 앱만 빌드한다. Supabase secret은 필요 없다.

필수 프론트 설정:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

publishable key는 브라우저에 노출되어도 되지만 RLS가 항상 권한을 결정한다. service role key, DB password, GitHub OAuth client secret은 절대 커밋하지 않는다.
