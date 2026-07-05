# 데이터 모델

## Markdown frontmatter

자료와 발표 문서는 공통 frontmatter를 사용한다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `title` | string | 예 | 화면에 표시할 제목 |
| `owner` | string | 예 | `data/users.json`의 `id`, 공유 자료는 `shared` |
| `session` | number | 발표만 | 발표 회차 번호 |
| `createdAt` | string | 권장 | `YYYY-MM-DD` |
| `updatedAt` | string | 권장 | `YYYY-MM-DD` |
| `tags` | string[] | 아니오 | 검색/분류 태그 |
| `summary` | string | 권장 | 목록과 대시보드 요약 |

빌드 검증은 `title`, `owner`, 발표 문서의 `session` 누락을 실패시킨다.

개인 자료 경로:

```text
자료/<사용자 id>/...md
```

공유 자료 경로:

```text
자료/공유/...md
```

발표 자료 경로:

```text
발표/<회차>/<사용자 id>/...md
```

## `data/users.json`

```ts
type User = {
  id: string;
  name: string;
  github?: string;
  role: string;
  active: boolean;
  color: string;
  materialPath: string;
  presentationPath: string;
};
```

`id`는 경로의 사용자 이름과 일치해야 한다.
`materialPath`는 `자료/<id>`, `presentationPath`는 `발표/*/<id>` 형식이어야 하며 빌드 검증에서 확인한다.

## `data/sessions.json`

```ts
type StudySession = {
  id: number;
  title: string;
  week: number;
  status: 'planned' | 'upcoming' | 'current' | 'done';
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  goal: string;
  presenterIds: string[];
  facilitatorId: string;
  agenda: string[];
  resources: string[];
  progress: {
    label: string;
    current: number;
    target: number;
    unit: string;
  };
};
```

현재 회차는 `status: "current"`인 첫 항목이다. 없으면 `upcoming` 항목을 사용한다.
`date`는 실제 유효한 `YYYY-MM-DD`, `startTime`과 `endTime`은 `00:00-23:59` 범위의 `HH:MM` 형식이어야 한다.

## `data/progress.json`

```ts
type ProgressTopic = {
  id: string;
  name: string;
  ownerId: string;
  current: number;
  target: number;
  unit: string;
  status: 'planned' | 'active' | 'done';
  notes: string;
};
```

## `data/penalties.json`

```ts
type Penalty = {
  id: string;
  userId: string;
  sessionId: number;
  type: string;
  reason: string;
  amount: number;
  status: 'open' | 'settled';
  dueDate: string;
  settledAt?: string;
};
```

## 관계

```text
users.id
  -> Markdown owner
  -> sessions.presenterIds
  -> sessions.facilitatorId
  -> progress.ownerId
  -> penalties.userId

sessions.id
  -> 발표/<회차>/
  -> Markdown session
  -> penalties.sessionId
```

앱은 `src/data/validate.ts`에서 JSON을 읽을 때 필수 필드, 중복 ID, 상태값, 사용자/회차 참조, 진도 목표값을 검증한다.

Markdown 문서는 `src/contentValidation.ts`에서 다음 항목을 검증한다.

- `title`, `owner`가 frontmatter에 존재하는지
- `owner`가 `shared`이거나 `data/users.json`의 사용자 ID인지
- 발표 문서의 `session`이 frontmatter에 존재하는지
- 발표 문서의 `session`이 `data/sessions.json`에 존재하는지
- `data/sessions.json`의 `resources`가 실제 Markdown 파일을 가리키는지
- `createdAt`, `updatedAt`이 `YYYY-MM-DD` 형식인지
- Markdown 이미지가 `/assets/...`, `https://...`, `data:` 같은 정적 배포 가능한 경로인지

검증에 실패하면 빌드와 테스트가 실패한다.

## 이미지 파일

이미지는 `public/assets/` 아래에 저장하고 Markdown에서는 `/assets/<파일명>`으로 참조한다.

```markdown
![스터디 보드 예시](/assets/study-board.svg)
```

문서와 같은 디렉토리의 상대 경로 이미지(`./diagram.png`)는 정적 빌드에 자동 포함되지 않으므로 사용하지 않는다.
