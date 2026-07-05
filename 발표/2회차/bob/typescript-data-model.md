---
title: TypeScript로 운영 데이터 설명하기
owner: bob
session: 2
createdAt: 2026-07-13
updatedAt: 2026-07-16
tags:
  - typescript
  - schema
summary: 사용자, 회차, 벌칙 데이터를 타입으로 연결하는 방법을 발표한다.
---

# TypeScript로 운영 데이터 설명하기

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
- 사용자가 늘어나면 `users.json`과 경로 규칙을 어떻게 검증할 것인가?
