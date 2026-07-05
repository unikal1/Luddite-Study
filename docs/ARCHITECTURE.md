# 아키텍처

Luddite Study는 GitHub Pages에서만 동작하는 정적 스터디 운영 도구다. 별도 서버와 데이터베이스를 두지 않는다. 읽기는 정적 번들에 포함된 Markdown/JSON으로 처리하고, 쓰기는 기본적으로 복사/GitHub 링크를 제공하되 선택적으로 사용자의 GitHub 쓰기 권한으로 저장소 파일에 직접 커밋한다.

## 기술 선택

- 프론트엔드: Vite + React + TypeScript
- 배포: GitHub Pages, 기본 Vite `base: "/Luddite-Study/"`
- 문서 데이터: Markdown + YAML frontmatter
- 운영 데이터: 저장소 내 JSON
- Markdown 렌더링: `react-markdown` + `remark-gfm`

## 환경변수

기본값은 현재 저장소에 맞춰져 있다. fork나 저장소명 변경 시 `.env` 또는 GitHub Actions 변수로 덮어쓴다.

```text
VITE_BASE_PATH=/Luddite-Study/
VITE_GITHUB_REPOSITORY=unikal1/Luddite-Study
VITE_GITHUB_BRANCH=main
```

## 디렉토리 구조

```text
/
  자료/
    공유/
      스터디-운영-규칙.md
    alice/
      react-state.md
    bob/
      typescript-modeling.md
    chris/
      devtools-checklist.md
  발표/
    1회차/
      alice/
        react-rendering.md
    2회차/
      bob/
        typescript-data-model.md
    3회차/
      chris/
        devtools-performance.md
  data/
    users.json
    sessions.json
    progress.json
    penalties.json
  src/
  docs/
  .github/workflows/pages.yml
```

## 데이터 흐름

1. 스터디원이 Markdown 또는 JSON 파일을 저장소에 추가한다.
2. 작성 화면의 직접 저장을 쓰는 경우, 브라우저가 사용자의 GitHub 권한으로 Contents API를 호출해 `main`에 커밋을 만든다.
3. GitHub Actions가 lint, typecheck, test, build를 실행한다.
4. Vite가 `자료/**/*.md`, `발표/**/*.md`, `data/*.json`을 정적 번들에 포함한다.
5. GitHub Pages가 빌드 결과물 `dist/`를 제공한다.
6. 브라우저는 번들에 포함된 정적 데이터만 읽고 화면 상태를 구성한다.

## 쓰기 기능 설계

정본 데이터는 `자료/`, `발표/`, `data/` 아래의 저장소 파일이다. 웹 화면은 두 가지 쓰기 UX를 제공한다.

### 기본 안전 모드

- Markdown 작성 화면에서 초안 작성
- 새 문서 초안 localStorage 자동 저장
- Markdown 미리보기
- 추천 저장 경로 표시
- Markdown 전체 복사
- GitHub 새 파일 생성 링크. 초안 본문은 URL에 싣지 않고 클립보드 복사로 전달한다.
- github.dev/Codespaces 진입 링크
- 기존 문서 GitHub edit 링크
- 기존 문서 선택 후 수정 초안 생성
- 삭제 대상 선택 후 삭제 체크리스트 생성

### 직접 저장 모드

초대되어 저장소 쓰기 권한이 있는 사용자는 작성 화면에서 GitHub 쓰기 인증값을 입력해 파일을 직접 생성, 수정, 삭제할 수 있다. 앱은 GitHub REST Contents API의 create/update/delete file 기능을 사용한다. 이 API는 fine-grained credential 기준 `Contents` repository permission write가 필요하다.

직접 저장은 엄밀히 말해 사용자의 로컬 `git push`가 아니라 GitHub API가 `main` 브랜치에 커밋을 만드는 방식이다. 결과적으로는 초대된 사용자가 직접 push한 것과 같은 배포 흐름을 탄다.

인증값 처리는 다음 원칙을 지킨다.

- 입력값은 React 상태에만 있고, 사용자가 `이 탭에만 보관`을 켠 경우에만 `sessionStorage`에 저장한다.
- `localStorage`, 코드, 문서, 로그, 커밋에는 실제 인증 비밀값을 남기지 않는다.
- 저장소 접근 권한이 없으면 GitHub가 403/404로 거부한다.
- 배포 반영은 GitHub Actions Pages workflow가 끝난 뒤 이뤄진다.

수정 모드는 기존 파일 경로를 유지하므로 문서 종류, 사용자, 회차, 파일명 필드는 잠근다. 파일 이동이 필요하면 GitHub에서 파일 경로를 직접 바꾼다.

## Markdown 이미지

Markdown 본문에서 동반 이미지는 `public/assets/` 아래에 둔 뒤 `/assets/...` 절대 경로로 참조한다. 문서 옆 상대 경로 이미지(`./diagram.png`)는 Vite raw Markdown import만으로는 배포 산출물에 자동 포함되지 않으므로 빌드 검증에서 실패시킨다.

## Issues/Discussions/Wiki 사용 범위

Issues, Discussions, Wiki는 핵심 데이터 저장소가 아니다.

- Issues: 자료 추가 요청, 리뷰 대기, 운영 TODO 접수함으로 적합하다. 정본 Markdown 트리와 회차 JSON을 대체하기에는 경로, 참조, 빌드 검증이 약하다.
- Discussions: 질문/답변, 토론, 회고 기록에 적합하다. GitHub Discussions API는 GraphQL 기반이며 쓰기에는 인증이 필요하므로 Pages-only 앱의 정본 저장소로 두지 않는다.
- Wiki: Git 기반이지만 별도 wiki 저장소로 관리된다. GitHub Pages 빌드가 `자료/`, `발표/`, `data/`와 함께 묶어 검증하지 않으므로 이 앱의 정본 데이터에는 쓰지 않는다.

최종 상태는 반드시 `자료/`, `발표/`, `data/`, `docs/` 파일 변경으로 반영한다. Issues/Discussions/Wiki 연동은 나중에 “제출함/운영 기록 링크”로 추가한다.

## 보안 경계

- 실제 GitHub 인증 비밀값을 코드, 문서, 샘플 데이터, 로그, 커밋에 남기지 않는다.
- 브라우저 직접 저장은 사용자가 입력한 런타임 인증값으로만 실행한다.
- 인증이 필요한 자동화는 로컬 `gh auth`, 사용자의 런타임 인증값, 또는 GitHub Actions 권한을 사용한다.
- 저장소에 들어가는 데이터는 공개되어도 되는 스터디 운영 데이터만 둔다.

## 참고한 GitHub 공식 문서

- REST repository contents API: https://docs.github.com/en/rest/repos/contents
- GitHub App credentials best practices: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app
- Discussions GraphQL API: https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
- Wiki git workflow: https://docs.github.com/en/communities/documenting-your-project-with-wikis/adding-or-editing-wiki-pages
