---
title: TypeScript 데이터 모델링
owner: bob
createdAt: 2026-07-09
updatedAt: 2026-07-13
tags:
  - typescript
  - data-model
summary: 정적 사이트에서 JSON 데이터를 안전하게 다루기 위한 타입 설계를 정리한다.
---

# TypeScript 데이터 모델링

운영 데이터는 JSON으로 저장하지만 앱 내부에서는 명확한 타입으로 다룬다.

| 데이터 | 파일 | 핵심 키 |
| --- | --- | --- |
| 사용자 | `data/users.json` | `id`, `name`, `active` |
| 회차 | `data/sessions.json` | `id`, `status`, `presenterIds` |
| 벌칙 | `data/penalties.json` | `userId`, `amount`, `status` |

## 원칙

1. 경로와 사용자 `id`를 일치시킨다.
2. 화면에서 직접 저장하지 않고 변경 초안을 만든다.
3. JSON 스키마 변경은 문서와 함께 반영한다.

