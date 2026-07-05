insert into public.study_members (
  member_uid,
  display_name,
  github_username,
  role,
  role_label,
  color,
  active,
  material_root,
  presentation_root
)
values
  ('alice', 'Alice', 'alice-study', 'admin', '진행자', '#0f766e', true, '자료/alice', '발표/*/alice'),
  ('bob', 'Bob', 'bob-study', 'facilitator', '기록', '#7c3aed', true, '자료/bob', '발표/*/bob'),
  ('chris', 'Chris', 'chris-study', 'member', '스터디원', '#b45309', true, '자료/chris', '발표/*/chris')
on conflict (member_uid) do update
set display_name = excluded.display_name,
    github_username = excluded.github_username,
    role = excluded.role,
    role_label = excluded.role_label,
    color = excluded.color,
    active = excluded.active,
    material_root = excluded.material_root,
    presentation_root = excluded.presentation_root,
    updated_at = now();

insert into public.study_sessions (
  id,
  title,
  week,
  status,
  starts_on,
  ends_on,
  presentation_on,
  start_time,
  end_time,
  location,
  goal,
  facilitator_member_id,
  presenter_member_ids,
  agenda,
  resources,
  progress_label,
  progress_current,
  progress_target,
  progress_unit
)
values
  (
    1,
    '운영 방식과 React 렌더링',
    1,
    'done',
    '2026-06-15',
    '2026-06-21',
    '2026-06-21',
    '20:00',
    '21:30',
    'Discord',
    '스터디 운영 규칙을 합의하고 React 렌더링 흐름을 정리한다.',
    (select id from public.study_members where member_uid = 'alice'),
    array[(select id from public.study_members where member_uid = 'alice')]::uuid[],
    array['운영 규칙 확인', 'React 렌더링 발표', '다음 회차 목표 확정'],
    array['발표/1회차/alice/react-rendering.md'],
    'React 핵심 개념',
    4,
    4,
    '챕터'
  ),
  (
    2,
    'TypeScript 모델링',
    2,
    'done',
    '2026-06-22',
    '2026-06-28',
    '2026-06-28',
    '20:00',
    '21:30',
    'Discord',
    '운영 도구의 데이터 모델을 TypeScript 타입으로 설명할 수 있다.',
    (select id from public.study_members where member_uid = 'alice'),
    array[(select id from public.study_members where member_uid = 'bob')]::uuid[],
    array['지난 벌칙 정산', 'TypeScript 발표', '개인 자료 피드백'],
    array['발표/2회차/bob/typescript-data-model.md'],
    'TypeScript 실전 패턴',
    5,
    5,
    '챕터'
  ),
  (
    3,
    '브라우저 디버깅과 성능',
    3,
    'current',
    '2026-06-29',
    '2026-07-05',
    '2026-07-05',
    '20:00',
    '21:30',
    'Discord',
    'Chrome DevTools로 렌더링/네트워크 병목을 재현하고 설명한다.',
    (select id from public.study_members where member_uid = 'bob'),
    '{}'::uuid[],
    array['진도 점검', '당일 발표자 추첨', 'DevTools 실습', '다음 발표자 후보 정리'],
    array['발표/3회차/chris/devtools-performance.md'],
    '브라우저 디버깅',
    0,
    3,
    '실습'
  )
on conflict (week) do update
set title = excluded.title,
    status = excluded.status,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    presentation_on = excluded.presentation_on,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    location = excluded.location,
    goal = excluded.goal,
    facilitator_member_id = excluded.facilitator_member_id,
    presenter_member_ids = excluded.presenter_member_ids,
    agenda = excluded.agenda,
    resources = excluded.resources,
    progress_label = excluded.progress_label,
    progress_current = excluded.progress_current,
    progress_target = excluded.progress_target,
    progress_unit = excluded.progress_unit,
    updated_at = now();

select setval(pg_get_serial_sequence('public.study_sessions', 'id'), coalesce((select max(id) from public.study_sessions), 1), true);

insert into public.document_folders (
  kind,
  path,
  name,
  parent_path,
  owner_member_id,
  session_id,
  created_by
)
values
  ('material', '자료', '자료', null, null, null, (select id from public.study_members where member_uid = 'alice')),
  ('material', '자료/alice', 'alice', '자료', (select id from public.study_members where member_uid = 'alice'), null, (select id from public.study_members where member_uid = 'alice')),
  ('material', '자료/bob', 'bob', '자료', (select id from public.study_members where member_uid = 'bob'), null, (select id from public.study_members where member_uid = 'alice')),
  ('material', '자료/chris', 'chris', '자료', (select id from public.study_members where member_uid = 'chris'), null, (select id from public.study_members where member_uid = 'alice')),
  ('material', '자료/공유', '공유', '자료', null, null, (select id from public.study_members where member_uid = 'alice')),
  ('presentation', '발표', '발표', null, null, 1, (select id from public.study_members where member_uid = 'alice')),
  ('presentation', '발표/1회차', '1회차', '발표', null, 1, (select id from public.study_members where member_uid = 'alice')),
  ('presentation', '발표/1회차/alice', 'alice', '발표/1회차', (select id from public.study_members where member_uid = 'alice'), 1, (select id from public.study_members where member_uid = 'alice')),
  ('presentation', '발표/2회차', '2회차', '발표', null, 2, (select id from public.study_members where member_uid = 'alice')),
  ('presentation', '발표/2회차/bob', 'bob', '발표/2회차', (select id from public.study_members where member_uid = 'bob'), 2, (select id from public.study_members where member_uid = 'alice')),
  ('presentation', '발표/3회차', '3회차', '발표', null, 3, (select id from public.study_members where member_uid = 'bob')),
  ('presentation', '발표/3회차/chris', 'chris', '발표/3회차', (select id from public.study_members where member_uid = 'chris'), 3, (select id from public.study_members where member_uid = 'bob'))
on conflict (kind, path) do update
set name = excluded.name,
    parent_path = excluded.parent_path,
    owner_member_id = excluded.owner_member_id,
    session_id = excluded.session_id,
    updated_at = now();

insert into public.progress_topics (
  slug,
  name,
  owner_member_id,
  current,
  target,
  unit,
  status,
  notes
)
values
  ('react-core', 'React 핵심 개념', (select id from public.study_members where member_uid = 'alice'), 1, 4, '챕터', 'active', '렌더링과 상태 업데이트 흐름을 우선 정리한다.'),
  ('typescript-modeling', 'TypeScript 실전 패턴', (select id from public.study_members where member_uid = 'bob'), 2, 5, '챕터', 'active', '데이터 모델링과 유틸 타입을 발표 자료로 연결한다.'),
  ('browser-debugging', '브라우저 디버깅', (select id from public.study_members where member_uid = 'chris'), 0, 3, '실습', 'planned', 'DevTools 네트워크/성능 탭 실습을 준비한다.')
on conflict (slug) do update
set name = excluded.name,
    owner_member_id = excluded.owner_member_id,
    current = excluded.current,
    target = excluded.target,
    unit = excluded.unit,
    status = excluded.status,
    notes = excluded.notes,
    updated_at = now();

insert into public.penalties (
  slug,
  member_id,
  session_id,
  type,
  reason,
  amount,
  status,
  due_date,
  settled_at
)
values
  ('penalty-2026-07-12-bob', (select id from public.study_members where member_uid = 'bob'), 1, '지각', '10분 지각', 1000, 'open', '2026-07-19', null),
  ('penalty-2026-07-12-chris', (select id from public.study_members where member_uid = 'chris'), 1, '자료 미제출', '발표 전날 자료 미제출', 2000, 'settled', '2026-07-19', '2026-07-15')
on conflict (slug) do update
set member_id = excluded.member_id,
    session_id = excluded.session_id,
    type = excluded.type,
    reason = excluded.reason,
    amount = excluded.amount,
    status = excluded.status,
    due_date = excluded.due_date,
    settled_at = excluded.settled_at,
    updated_at = now();

insert into public.documents (
  kind,
  path,
  title,
  summary,
  owner_member_id,
  session_id,
  tags,
  body,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    'material',
    '자료/공유/스터디-운영-규칙.md',
    '스터디 운영 규칙',
    '회차 진행, 발표 자료 제출, 벌칙 정산 기준을 정리한다.',
    null,
    null,
    array['운영', '규칙'],
    $md$# 스터디 운영 규칙

## 회차 진행

| 항목 | 기준 |
| --- | --- |
| 정기 모임 | 매주 일요일 20:00 |
| 발표 자료 | 모임 하루 전까지 `발표/<회차>/<사용자>/`에 추가 |
| 개인 자료 | 자유롭게 `자료/<사용자>/`에 추가 |
| 공유 자료 | 모두가 참고하는 문서는 `자료/공유/`에 추가 |

## 체크리스트

- [x] 첫 회차 운영 방식 합의
- [x] 사용자 데이터 등록
- [ ] 발표자 추첨 결과 반영
- [ ] 다음 일정 확정

## 벌칙 기준

```text
지각: 1,000원
자료 미제출: 2,000원
무단 불참: 5,000원
```

GitHub Pages에서는 브라우저가 저장소에 직접 쓰지 않는다. 변경 사항은 작성 도구에서 Markdown/JSON 초안을 만든 뒤 GitHub에서 파일로 반영한다.$md$,
    (select id from public.study_members where member_uid = 'alice'),
    (select id from public.study_members where member_uid = 'alice'),
    '2026-07-05',
    '2026-07-05'
  ),
  (
    'material',
    '자료/alice/react-state.md',
    'React 상태 업데이트 노트',
    '상태 업데이트가 배치되고 렌더링으로 이어지는 흐름을 정리한다.',
    (select id from public.study_members where member_uid = 'alice'),
    null,
    array['react', 'state'],
    $md$# React 상태 업데이트 노트

React의 상태 업데이트는 이벤트 처리 중 여러 번 호출되어도 하나의 렌더링으로 묶일 수 있다.

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}
    </button>
  );
}
```

## 관찰 포인트

- 이벤트 핸들러 안의 업데이트는 배치될 수 있다.
- 이전 값을 기준으로 업데이트할 때는 함수형 업데이트가 안전하다.
- 렌더링 비용은 컴포넌트 경계와 메모이제이션 전략에 영향을 받는다.$md$,
    (select id from public.study_members where member_uid = 'alice'),
    (select id from public.study_members where member_uid = 'alice'),
    '2026-07-08',
    '2026-07-10'
  ),
  (
    'material',
    '자료/bob/typescript-modeling.md',
    'TypeScript 데이터 모델링',
    '정적 사이트에서 JSON 데이터를 안전하게 다루기 위한 타입 설계를 정리한다.',
    (select id from public.study_members where member_uid = 'bob'),
    null,
    array['typescript', 'data-model'],
    $md$# TypeScript 데이터 모델링

운영 데이터는 JSON으로 저장하지만 앱 내부에서는 명확한 타입으로 다룬다.

| 데이터 | 파일 | 핵심 키 |
| --- | --- | --- |
| 사용자 | `data/users.json` | `id`, `name`, `active` |
| 회차 | `data/sessions.json` | `id`, `status`, `presenterIds` |
| 벌칙 | `data/penalties.json` | `userId`, `amount`, `status` |

## 원칙

1. 경로와 사용자 `id`를 일치시킨다.
2. 화면에서 직접 저장하지 않고 변경 초안을 만든다.
3. JSON 스키마 변경은 문서와 함께 반영한다.$md$,
    (select id from public.study_members where member_uid = 'bob'),
    (select id from public.study_members where member_uid = 'bob'),
    '2026-07-09',
    '2026-07-13'
  ),
  (
    'material',
    '자료/chris/devtools-checklist.md',
    'Chrome DevTools 점검 체크리스트',
    '발표 전 성능과 네트워크 상태를 빠르게 확인하는 체크리스트다.',
    (select id from public.study_members where member_uid = 'chris'),
    null,
    array['browser', 'devtools'],
    $md$# Chrome DevTools 점검 체크리스트

## Network

- [ ] 캐시 비활성화 후 새로고침
- [ ] 큰 JS/CSS 번들 확인
- [ ] 이미지 응답 크기 확인

## Performance

- [ ] 녹화 시작 전 CPU throttling 설정
- [ ] 긴 task 확인
- [ ] layout shift 지점 확인

![스터디 보드 예시](/assets/study-board.svg)$md$,
    (select id from public.study_members where member_uid = 'chris'),
    (select id from public.study_members where member_uid = 'chris'),
    '2026-07-11',
    '2026-07-14'
  ),
  (
    'presentation',
    '발표/1회차/alice/react-rendering.md',
    'React 렌더링 흐름',
    '상태 변경부터 커밋까지 이어지는 렌더링 단계를 발표한다.',
    (select id from public.study_members where member_uid = 'alice'),
    1,
    array['react', 'rendering'],
    $md$# React 렌더링 흐름

## 오늘의 목표

- 렌더 단계와 커밋 단계를 구분한다.
- 상태 업데이트가 렌더링을 예약하는 방식을 설명한다.
- 불필요한 렌더링을 관찰하는 방법을 확인한다.

## 핵심 흐름

```mermaid
flowchart LR
  A[setState] --> B[render]
  B --> C[diff]
  C --> D[commit]
```

Mermaid는 현재 정적 렌더러에서 다이어그램으로 실행하지 않는다. 발표 자료에서는 코드블록으로 안전하게 표시한다.$md$,
    (select id from public.study_members where member_uid = 'alice'),
    (select id from public.study_members where member_uid = 'alice'),
    '2026-07-10',
    '2026-07-11'
  ),
  (
    'presentation',
    '발표/2회차/bob/typescript-data-model.md',
    'TypeScript로 운영 데이터 설명하기',
    '사용자, 회차, 벌칙 데이터를 타입으로 연결하는 방법을 발표한다.',
    (select id from public.study_members where member_uid = 'bob'),
    2,
    array['typescript', 'schema'],
    $md$# TypeScript로 운영 데이터 설명하기

정적 사이트에서는 런타임 서버 검증이 없으므로 빌드 시점 타입 검사가 중요하다.

```ts
type SessionStatus = 'planned' | 'upcoming' | 'current' | 'done';

type StudySession = {
  id: number;
  title: string;
  status: SessionStatus;
  presenterIds: string[];
};
```

## 토론 질문

- JSON schema까지 둘 필요가 있는가?
- 사용자가 늘어나면 `users.json`과 경로 규칙을 어떻게 검증할 것인가?$md$,
    (select id from public.study_members where member_uid = 'bob'),
    (select id from public.study_members where member_uid = 'bob'),
    '2026-07-13',
    '2026-07-16'
  ),
  (
    'presentation',
    '발표/3회차/chris/devtools-performance.md',
    'DevTools Performance 실습',
    'Chrome DevTools Performance 탭으로 렌더링 병목을 찾는 실습 계획이다.',
    (select id from public.study_members where member_uid = 'chris'),
    3,
    array['devtools', 'performance'],
    $md$# DevTools Performance 실습

## 실습 순서

1. Performance 탭에서 녹화를 시작한다.
2. 상호작용을 재현한다.
3. 긴 task와 렌더링 이벤트를 확인한다.
4. 개선 가설을 기록한다.

> 발표 후 각자 하나의 병목 사례를 개인 자료에 추가한다.$md$,
    (select id from public.study_members where member_uid = 'chris'),
    (select id from public.study_members where member_uid = 'chris'),
    '2026-07-15',
    '2026-07-15'
  )
on conflict (path) do update
set kind = excluded.kind,
    title = excluded.title,
    summary = excluded.summary,
    owner_member_id = excluded.owner_member_id,
    session_id = excluded.session_id,
    tags = excluded.tags,
    body = excluded.body,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
