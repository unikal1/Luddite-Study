# 운영 가이드

## 로컬 실행

```powershell
npm install
npm run dev
```

검증:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
npm run check
```

## 사용자 추가

1. `data/users.json`에 사용자를 추가한다.
2. `id`는 자료/발표 경로와 동일하게 쓴다.
3. 개인 자료 디렉토리 `자료/<id>/`를 만든다.
4. 발표 자료는 `발표/<회차>/<id>/` 아래에 둔다.

예:

```json
{
  "id": "dana",
  "name": "Dana",
  "github": "dana-study",
  "role": "스터디원",
  "active": true,
  "color": "#2563eb",
  "materialPath": "자료/dana",
  "presentationPath": "발표/*/dana"
}
```

## 개인 자료 추가

위치:

```text
자료/<사용자 id>/...md
```

예:

```markdown
---
title: React 메모
owner: alice
createdAt: 2026-07-05
updatedAt: 2026-07-05
tags:
  - react
summary: React 상태 업데이트 흐름을 정리한다.
---

# React 메모

본문을 Markdown으로 작성한다.
```

## 공유 자료 추가

위치:

```text
자료/공유/...md
```

frontmatter의 `owner`는 `shared`를 쓴다.

## 발표 자료 추가

위치:

```text
발표/<회차>/<사용자 id>/...md
```

예:

```markdown
---
title: TypeScript 발표
owner: bob
session: 2
createdAt: 2026-07-05
updatedAt: 2026-07-05
tags:
  - typescript
summary: 운영 데이터 모델을 TypeScript로 설명한다.
---

# TypeScript 발표
```

## 일정/목표/진도/벌칙 수정

- 회차, 일정, 목표, 발표자: `data/sessions.json`
- 주제별 진도: `data/progress.json`
- 벌칙 현황: `data/penalties.json`

웹의 운영 도구 화면에서 다음 일정, 진도, 벌칙 JSON 초안을 만들 수 있다. 초안을 복사해 해당 JSON 파일에 반영하고 push한다.
각 초안에는 반영 위치와 GitHub 열기 링크가 함께 표시된다.
JSON/Markdown 원문은 기본으로 접혀 있으며 `초안 보기`를 열어 확인한다.
변경 초안은 `일정`, `진도`, `벌칙`, `회의록` 중 하나를 선택해서 본다.
자료/발표 탐색 화면의 경로 복사 버튼을 사용하면 회차 `resources`에 넣을 Markdown 경로를 그대로 복사할 수 있다.

## 작성 화면 사용

### 새 문서 추가

1. 작성 화면에서 `새 문서`를 고른다.
2. 개인 자료, 공유 자료, 발표 자료 중 하나를 고른다.
3. 제목, 요약, 태그, 본문을 입력한다.
4. 필요하면 빠른 삽입 버튼으로 체크리스트, 표, 코드블록, 이미지 문법을 넣는다.
5. 추천 저장 경로와 미리보기를 확인한다.
6. `Markdown 복사`로 본문을 복사한다.
7. `GitHub에 만들기`로 추천 경로의 새 파일 화면을 연다.
8. 복사한 Markdown을 붙여 넣고 push한다.

새 문서 초안은 브라우저 localStorage에 자동 저장된다. 저장소에 올라가는 데이터는 아니며, 같은 브라우저에서만 복구된다. 필요하면 `초안 초기화`로 지울 수 있다.

### 기존 문서 수정

1. 작성 화면에서 `수정`을 고른다.
2. `기존 문서` 목록에서 수정할 Markdown 파일을 선택한다.
3. frontmatter와 본문이 폼에 채워지면 제목, 요약, 태그, 본문을 고친다.
4. `Markdown 복사`로 전체 Markdown을 복사한다.
5. `GitHub에서 열기`로 기존 파일을 열고 내용을 교체한 뒤 push한다.

수정 모드는 기존 파일 경로를 유지한다. 문서 종류, 사용자, 회차, 폴더, 파일명은 화면에서 잠겨 있다. 경로 이동이 필요하면 GitHub에서 파일을 옮기고 frontmatter도 함께 맞춘다.

### 문서 삭제 준비

1. 작성 화면에서 `삭제 준비`를 고른다.
2. `기존 문서` 목록에서 삭제할 파일을 선택한다.
3. 삭제 체크리스트를 복사한다.
4. GitHub에서 해당 파일을 삭제한다.
5. `data/sessions.json`의 `resources`처럼 삭제 문서를 참조하는 항목이 있으면 같이 정리한다.
6. push 후 배포 화면에서 문서가 사라졌는지 확인한다.

브라우저는 GitHub에 직접 저장하거나 삭제하지 않는다.

## 이미지 추가

1. 이미지 파일을 `public/assets/` 아래에 추가한다.
2. Markdown에서는 `/assets/<파일명>`으로 참조한다.
3. `./image.png`처럼 문서 옆 상대 경로를 쓰지 않는다. 배포 산출물에 포함되지 않아 빌드 검증이 실패한다.

## 운영 도구 사용

운영 화면의 `데이터 상태` 패널은 현재 번들에 포함된 사용자, 회차, 자료, 발표 문서 수와 검증 통과 여부를 보여준다. JSON 검증은 빌드 시점에 필수 필드, 상태값, 중복 ID, 사용자/회차 참조를 검사한다. Markdown 검증은 문서의 `owner`, 발표 `session`, 회차 `resources` 참조를 검사한다.
화면에는 요약만 표시하고 자세한 검증 규칙은 `docs/DATA_MODEL.md`에 둔다.

운영 도구에서 다음 초안을 만들 수 있다.

- 발표자 뽑기 결과
- 다음 일정과 회차 항목
- 진도 변경안
- 벌칙 추가안
- 현재 회차 기반 회의록 Markdown 초안

각 초안은 복사해서 `data/*.json` 파일에 반영한다.
회의록 초안은 `자료/공유/회의록/` 같은 Markdown 경로에 저장할 수 있다.
회의록 초안은 추천 경로와 GitHub 새 파일 생성 링크를 함께 제공한다.
새 회차의 `resources`는 비워 둔 뒤, 발표 Markdown 파일을 먼저 추가하고 실제 경로를 넣는다. 존재하지 않는 Markdown 경로를 `resources`에 넣으면 빌드 검증이 실패한다.

## 배포

`main` 브랜치에 push하면 `.github/workflows/pages.yml`이 실행된다.

workflow는 다음 순서로 검증한다.

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`
6. `actions/configure-pages`
7. `npx playwright install --with-deps chromium`
8. `npx playwright test`로 주요 흐름과 axe 접근성 스모크 테스트 실행
9. Playwright report/test-results artifact 업로드
10. GitHub Pages 배포

GitHub Pages 설정은 Actions 배포를 사용하도록 맞춘다.
