# Decisions

## 2026-07-05: Supabase SSOT

Decision: GitHub Pages는 정적 프론트엔드 배포만 맡고, 모든 영속 데이터는 Supabase에 저장한다.

Rationale:

- GitHub Contents API를 브라우저에서 직접 쓰면 개인 토큰 취급과 권한 관리가 어렵다.
- 자료/발표 Markdown, 회차, 참여자, 운영 로그를 DB로 옮기면 RLS와 Auth로 권한을 일관되게 적용할 수 있다.
- 이미지/첨부는 Git repository가 아니라 Storage가 더 적합하다.

Consequences:

- 새 자료/발표를 GitHub에 commit하지 않는다.
- 프론트엔드는 Supabase publishable key만 사용한다.
- service role key, DB password, OAuth secret은 저장소에 두지 않는다.
- 모든 테이블과 Storage 접근은 RLS를 통과해야 한다.

## 2026-07-05: 작성 탭 제거

Decision: 별도 작성 탭을 제거하고 자료/발표 탭 안에서 작성과 편집을 처리한다.

Rationale:

- 사용자는 문서를 찾는 위치에서 바로 생성/수정하는 편이 자연스럽다.
- 자료는 사람/공유 트리, 발표는 회차 선택 후 사람 트리를 기준으로 컨텍스트가 정해진다.

Consequences:

- 자료/발표 탭의 좌측 패널이 디렉토리 트리와 생성 진입점을 겸한다.
- 발표 문서는 선택한 회차에 종속된다.
