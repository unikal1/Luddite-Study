import type { StudyData } from '../types';

const now = '2026-07-05T00:00:00.000Z';

export function createDemoData(): StudyData {
  const alice = {
    id: '00000000-0000-4000-8000-000000000001',
    profileId: 'demo-user',
    memberUid: 'alice',
    displayName: 'Alice',
    inviteEmail: 'alice@example.com',
    githubUsername: 'alice-study',
    role: 'admin' as const,
    roleLabel: '진행자',
    color: '#0f766e',
    active: true,
    materialRoot: '자료/alice',
    presentationRoot: '발표/*/alice',
    createdAt: now,
    updatedAt: now
  };
  const bob = {
    id: '00000000-0000-4000-8000-000000000002',
    profileId: null,
    memberUid: 'bob',
    displayName: 'Bob',
    inviteEmail: 'bob@example.com',
    githubUsername: 'bob-study',
    role: 'facilitator' as const,
    roleLabel: '기록',
    color: '#7c3aed',
    active: true,
    materialRoot: '자료/bob',
    presentationRoot: '발표/*/bob',
    createdAt: now,
    updatedAt: now
  };
  const chris = {
    id: '00000000-0000-4000-8000-000000000003',
    profileId: null,
    memberUid: 'chris',
    displayName: 'Chris',
    inviteEmail: 'chris@example.com',
    githubUsername: 'chris-study',
    role: 'member' as const,
    roleLabel: '스터디원',
    color: '#b45309',
    active: true,
    materialRoot: '자료/chris',
    presentationRoot: '발표/*/chris',
    createdAt: now,
    updatedAt: now
  };

  return {
    projects: [
      {
        id: 1,
        title: '웹 성능 최적화 가이드',
        type: 'book',
        status: 'current',
        totalPages: 520,
        imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
        goal: '브라우저 렌더링과 프론트엔드 성능 병목을 회차별로 정리한다.',
        startsOn: '2026-06-15',
        endsOn: null,
        createdBy: alice.id,
        createdAt: now,
        updatedAt: now
      }
    ],
    members: [alice, bob, chris],
    currentMember: alice,
    bootstrapOpen: false,
    sessions: [
      {
        id: 1,
        projectId: 1,
        title: '운영 방식과 React 렌더링',
        week: 1,
        status: 'done',
        startsOn: '2026-06-15',
        endsOn: '2026-06-21',
        presentationOn: '2026-06-21',
        startTime: '20:00',
        endTime: '21:30',
        location: 'Discord',
        goal: '스터디 운영 규칙을 합의하고 React 렌더링 흐름을 정리한다.',
        facilitatorMemberId: alice.id,
        presenterMemberIds: [alice.id],
        agenda: ['운영 규칙 확인', 'React 렌더링 발표', '다음 회차 목표 확정'],
        resources: ['발표/1회차/alice/react-rendering.md'],
        progressLabel: 'React 핵심 개념',
        progressCurrent: 4,
        progressTarget: 4,
        progressUnit: '챕터',
        projectProgress: 110,
        createdBy: alice.id,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        projectId: 1,
        title: 'TypeScript 모델링',
        week: 2,
        status: 'done',
        startsOn: '2026-06-22',
        endsOn: '2026-06-28',
        presentationOn: '2026-06-28',
        startTime: '20:00',
        endTime: '21:30',
        location: 'Discord',
        goal: '운영 도구의 데이터 모델을 TypeScript 타입으로 설명할 수 있다.',
        facilitatorMemberId: alice.id,
        presenterMemberIds: [bob.id],
        agenda: ['지난 회고', 'TypeScript 발표', '개인 자료 피드백'],
        resources: ['발표/2회차/bob/typescript-data-model.md'],
        progressLabel: 'TypeScript 실전 패턴',
        progressCurrent: 5,
        progressTarget: 5,
        progressUnit: '챕터',
        projectProgress: 150,
        createdBy: alice.id,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        projectId: 1,
        title: '브라우저 디버깅과 성능',
        week: 3,
        status: 'current',
        startsOn: '2026-06-29',
        endsOn: '2026-07-05',
        presentationOn: '2026-07-05',
        startTime: '20:00',
        endTime: '21:30',
        location: 'Discord',
        goal: 'Chrome DevTools로 렌더링/네트워크 병목을 재현하고 설명한다.',
        facilitatorMemberId: bob.id,
        presenterMemberIds: [],
        agenda: ['진도 점검', '당일 발표자 추첨', 'DevTools 실습'],
        resources: ['발표/3회차/chris/devtools-performance.md'],
        progressLabel: '브라우저 디버깅',
        progressCurrent: 0,
        progressTarget: 3,
        progressUnit: '실습',
        projectProgress: 60,
        createdBy: bob.id,
        createdAt: now,
        updatedAt: now
      }
    ],
    folders: [
      { id: 'folder-material', kind: 'material', path: '자료', name: '자료', parentPath: null, ownerMemberId: null, sessionId: null, createdBy: alice.id, createdAt: now, updatedAt: now },
      { id: 'folder-shared', kind: 'material', path: '자료/공유', name: '공유', parentPath: '자료', ownerMemberId: null, sessionId: null, createdBy: alice.id, createdAt: now, updatedAt: now },
      { id: 'folder-alice', kind: 'material', path: '자료/alice', name: 'alice', parentPath: '자료', ownerMemberId: alice.id, sessionId: null, createdBy: alice.id, createdAt: now, updatedAt: now },
      { id: 'folder-bob', kind: 'material', path: '자료/bob', name: 'bob', parentPath: '자료', ownerMemberId: bob.id, sessionId: null, createdBy: alice.id, createdAt: now, updatedAt: now },
      { id: 'folder-chris', kind: 'material', path: '자료/chris', name: 'chris', parentPath: '자료', ownerMemberId: chris.id, sessionId: null, createdBy: alice.id, createdAt: now, updatedAt: now },
      { id: 'folder-p3', kind: 'presentation', path: '발표/3회차', name: '3회차', parentPath: '발표', ownerMemberId: null, sessionId: 3, createdBy: bob.id, createdAt: now, updatedAt: now },
      { id: 'folder-p3-chris', kind: 'presentation', path: '발표/3회차/chris', name: 'chris', parentPath: '발표/3회차', ownerMemberId: chris.id, sessionId: 3, createdBy: bob.id, createdAt: now, updatedAt: now }
    ],
    documents: [
      {
        id: 'doc-rules',
        kind: 'material',
        path: '자료/공유/스터디-운영-규칙.md',
        title: '스터디 운영 규칙',
        summary: '회차 진행과 자료 관리 기준을 정리한다.',
        ownerMemberId: null,
        sessionId: null,
        tags: ['운영', '규칙'],
        body: '# 스터디 운영 규칙\n\n## 회차 진행\n\n- 정기 모임은 일요일 20:00에 진행한다.\n- 발표자는 당일 추첨으로 확정한다.\n- 자료와 발표는 Supabase에 저장한다.',
        createdBy: alice.id,
        updatedBy: alice.id,
        createdAt: '2026-07-05',
        updatedAt: '2026-07-05'
      },
      {
        id: 'doc-react-state',
        kind: 'material',
        path: '자료/alice/react-state.md',
        title: 'React 상태 업데이트 노트',
        summary: '상태 업데이트가 렌더링으로 이어지는 흐름을 정리한다.',
        ownerMemberId: alice.id,
        sessionId: null,
        tags: ['react', 'state'],
        body: '# React 상태 업데이트 노트\n\nReact의 상태 업데이트는 이벤트 처리 중 여러 번 호출되어도 하나의 렌더링으로 묶일 수 있다.',
        createdBy: alice.id,
        updatedBy: alice.id,
        createdAt: '2026-07-08',
        updatedAt: '2026-07-10'
      },
      {
        id: 'doc-devtools',
        kind: 'presentation',
        path: '발표/3회차/chris/devtools-performance.md',
        title: 'DevTools Performance 실습',
        summary: 'Chrome DevTools Performance 탭으로 렌더링 병목을 찾는다.',
        ownerMemberId: chris.id,
        sessionId: 3,
        tags: ['devtools', 'performance'],
        body: '# DevTools Performance 실습\n\n1. Performance 탭에서 녹화를 시작한다.\n2. 상호작용을 재현한다.\n3. 긴 task와 렌더링 이벤트를 확인한다.',
        createdBy: chris.id,
        updatedBy: chris.id,
        createdAt: '2026-07-15',
        updatedAt: '2026-07-15'
      }
    ],
    progressTopics: [],
    penalties: [],
    activityEvents: [
      { id: 'event-1', actorMemberId: alice.id, eventType: 'insert', entityTable: 'documents', entityId: 'doc-rules', summary: '문서 생성: 스터디 운영 규칙', metadata: {}, createdAt: now }
    ],
    attachments: []
  };
}
