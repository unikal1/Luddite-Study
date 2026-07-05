---
title: React 상태 업데이트 노트
owner: alice
createdAt: 2026-07-08
updatedAt: 2026-07-10
tags:
  - react
  - state
summary: 상태 업데이트가 배치되고 렌더링으로 이어지는 흐름을 정리한다.
---

# React 상태 업데이트 노트

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
- 렌더링 비용은 컴포넌트 경계와 메모이제이션 전략에 영향을 받는다.

