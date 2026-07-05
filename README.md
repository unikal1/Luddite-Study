# Luddite Study

GitHub Pages만으로 배포되는 스터디 운영 도구입니다. 자료와 발표 문서는 저장소의 Markdown 파일로 관리하고, 일정/사용자/벌칙/진도 같은 운영 데이터는 JSON 파일로 관리합니다.

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
npm run check
```

`npm run e2e`는 주요 흐름과 axe 접근성 스모크 테스트를 함께 실행합니다.

## 콘텐츠 위치

- 개인 자료: `자료/<사용자 id>/...md`
- 공유 자료: `자료/공유/...md`
- 발표 자료: `발표/<회차>/<사용자 id>/...md`
- 사용자/회차/벌칙/진도 데이터: `data/*.json`
- 이미지: `public/assets/`에 두고 Markdown에서 `/assets/...`로 참조

작성 화면은 새 문서 초안, 기존 문서 수정, 삭제 준비, 추천 저장 경로, Markdown 미리보기를 제공합니다. 초대되어 쓰기 권한이 있는 사용자는 GitHub 쓰기 인증값을 입력해 저장소 파일을 직접 생성/수정/삭제할 수 있고, 인증을 쓰지 않는 경우에는 복사 버튼과 GitHub 생성/수정 링크로 반영합니다.

## 배포 설정

기본 설정은 `unikal1/Luddite-Study`와 `/Luddite-Study/` Pages 경로에 맞춰져 있습니다. fork나 저장소명 변경 시 `.env.example`의 값을 기준으로 `VITE_BASE_PATH`, `VITE_GITHUB_REPOSITORY`, `VITE_GITHUB_BRANCH`를 조정합니다.
