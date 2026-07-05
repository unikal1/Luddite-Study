# 아키텍처

Luddite Study는 GitHub Pages에서만 동작하는 정적 스터디 운영 도구다. 별도 서버, 데이터베이스, 브라우저 내 GitHub write API, OAuth 플로우를 사용하지 않는다.

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
2. GitHub Actions가 lint, typecheck, test, build를 실행한다.
3. Vite가 `자료/**/*.md`, `발표/**/*.md`, `data/*.json`을 정적 번들에 포함한다.
4. GitHub Pages가 빌드 결과물 `dist/`를 제공한다.
5. 브라우저는 번들에 포함된 정적 데이터만 읽고 화면 상태를 구성한다.

## 쓰기 기능 설계

GitHub Pages 정적 사이트에서 브라우저가 저장소에 직접 쓰려면 토큰이나 OAuth가 필요하다. 이 저장소는 토큰 노출 위험을 피하기 위해 브라우저 직접 쓰기를 제공하지 않는다.

대신 다음 UX를 제공한다.

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

삭제와 수정도 같은 원칙을 따른다. 화면에서 바로 삭제하지 않고 GitHub에서 파일을 수정하거나 삭제한 뒤 push한다.
수정 모드는 기존 파일 경로를 유지하므로 문서 종류, 사용자, 회차, 파일명 필드는 잠근다. 파일 이동이 필요하면 GitHub에서 파일 경로를 직접 바꾼다.

## Markdown 이미지

Markdown 본문에서 동반 이미지는 `public/assets/` 아래에 둔 뒤 `/assets/...` 절대 경로로 참조한다. 문서 옆 상대 경로 이미지(`./diagram.png`)는 Vite raw Markdown import만으로는 배포 산출물에 자동 포함되지 않으므로 빌드 검증에서 실패시킨다.

## Issues/Discussions 사용 범위

Issues/Discussions는 핵심 데이터 저장소가 아니다. 선택적으로 토론, 회의 기록, 결정 기록을 링크하는 용도로만 쓴다. 최종 상태는 반드시 `자료/`, `발표/`, `data/`, `docs/` 파일 변경으로 반영한다.

## 보안 경계

- GitHub 토큰을 코드, 문서, 샘플 데이터, 로그, 커밋에 남기지 않는다.
- 브라우저 코드에서 GitHub write API를 호출하지 않는다.
- 인증이 필요한 자동화는 로컬 `gh auth` 또는 GitHub Actions 권한을 사용한다.
- 저장소에 들어가는 데이터는 공개되어도 되는 스터디 운영 데이터만 둔다.
