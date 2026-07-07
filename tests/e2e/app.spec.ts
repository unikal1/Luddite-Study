import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('dashboard, document workspaces, and operations work on desktop', async ({ page }, testInfo) => {
  await page.goto('./?demo=1#dashboard');

  await expect(page.getByRole('heading', { name: /3회차 · 브라우저 디버깅과 성능/ })).toBeVisible();
  await expect(page.getByText('당일 추첨 전')).toBeVisible();
  await expect(page.getByLabel('핵심 상태').getByText(/2026년 6월 29일/)).toBeVisible();
  await expect(page.getByRole('heading', { name: '프로젝트 진도' })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dashboard.png`, fullPage: true });

  await page.getByRole('button', { name: '프로젝트', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로젝트와 회차' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '웹 성능 최적화 가이드' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '연결된 회차' })).toBeVisible();

  await page.getByRole('button', { name: '자료', exact: true }).click();
  await expect(page.getByRole('heading', { name: '자료실' })).toBeVisible();
  await page.getByRole('button', { name: /스터디 운영 규칙/ }).click();
  await expect(page.getByRole('heading', { name: '스터디 운영 규칙', level: 2 })).toBeVisible();
  await expect(page.getByText('자료와 발표는 Supabase에 저장한다.')).toBeVisible();

  await page.getByRole('button', { name: '자료 파일 추가' }).click();
  await page.getByLabel('제목').fill('브라우저 검증 노트');
  await page.getByLabel('Markdown').fill('# 검증\n\n- [x] 자료 저장\n- [ ] 이미지 첨부');
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page.getByRole('heading', { name: '브라우저 검증 노트', level: 2 })).toBeVisible();

  await page.getByRole('button', { name: '문서 수정' }).click();
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['image-bytes'], 'diagram.png', { type: 'image/png' }));
    return transfer;
  });
  await page.getByLabel('Markdown').dispatchEvent('drop', { dataTransfer });
  await expect(page.getByText('이미지가 첨부됐습니다.')).toBeVisible();
  await expect(page.getByLabel('Markdown')).toHaveValue(/!\[diagram\.png]\(blob:/);
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page.getByRole('heading', { name: '브라우저 검증 노트', level: 2 })).toBeVisible();

  await page.getByRole('button', { name: '자료 폴더 추가' }).click();
  await page.locator('.tree-rename-input').fill('deep-folder');
  await page.locator('.tree-rename-input').press('Enter');
  await expect(page.getByRole('button', { name: 'deep-folder' })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-materials.png`, fullPage: true });
  await page.getByRole('button', { name: '폴더 삭제' }).click();
  await expect(page.getByText('폴더를 삭제했습니다.')).toBeVisible();

  await page.getByRole('button', { name: '발표', exact: true }).click();
  await expect(page.getByRole('heading', { name: '발표실' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'DevTools Performance 실습', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: '발표 파일 추가' }).click();
  await page.getByLabel('제목').fill('당일 발표 메모');
  await page.getByLabel('Markdown').fill('# 당일 발표 메모\n\n추첨 후 발표자가 내용을 정리한다.');
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page.getByRole('heading', { name: '당일 발표 메모', level: 2 })).toBeVisible();

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '운영', exact: true }).click();
  await expect(page.getByRole('heading', { name: '스터디 운영 보드' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Supabase 연결 상태' })).toBeVisible();

  await page.getByRole('button', { name: '참여자' }).click();
  await page.getByLabel('GitHub 이메일').fill('dana@example.com');
  await page.getByLabel('표시 이름').fill('Dana');
  await page.getByRole('button', { name: '참여자 추가' }).click();
  await expect(page.getByText('참여자를 추가했습니다.')).toBeVisible();

  await page.getByRole('button', { name: '회차 관리' }).click();
  await expect(page.getByRole('heading', { name: '발표 자료' })).toBeVisible();
  await expect(page.getByText('발표/3회차/chris/devtools-performance.md')).toBeVisible();
  await page.getByRole('button', { name: /2회차.*TypeScript/ }).click();
  await expect(page.getByRole('button', { name: '수정', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '발표자 뽑기' })).not.toBeVisible();
  await expect(page.getByText('발표/2회차/bob/typescript-data-model.md')).toBeVisible();
  await page.getByRole('button', { name: /3회차.*브라우저/ }).click();
  await page.getByRole('button', { name: '뽑기' }).click();
  await expect(page.locator('.winner-box')).not.toContainText('당일 추첨 전');
  await page.getByRole('button', { name: '결과 저장' }).click();
  await expect(page.getByText('발표자를 저장했습니다.')).toBeVisible();

  await page.getByLabel('진행 페이지 수').fill('75');
  await page.getByLabel('목표').fill('회차 수정도 Supabase 저장 흐름으로 검증한다.');
  await page.getByRole('button', { name: '회차 저장' }).click();
  await expect(page.getByText('현재 회차를 저장했습니다.')).toBeVisible();
  await page.getByRole('button', { name: '새 회차 시작' }).click();
  await expect(page.getByText('새 회차를 시작했습니다.')).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-operations.png`, fullPage: true });

  await page.getByRole('button', { name: '대시보드', exact: true }).click();
  await expect(page.getByRole('heading', { name: /4회차/ })).toBeVisible();
});

test('mobile viewport keeps the primary flows reachable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?demo=1#dashboard');

  await expect(page.getByRole('heading', { name: /3회차 · 브라우저 디버깅과 성능/ })).toBeVisible();
  await page.getByRole('button', { name: '발표', exact: true }).click();
  await expect(page.getByRole('heading', { name: '발표실' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'DevTools Performance 실습', level: 2 })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-mobile-presentation.png`, fullPage: true });
});

test('current session and project can be deleted without blocking the page', async ({ page }) => {
  await page.goto('./?demo=1#dashboard');

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '운영', exact: true }).click();
  await page.getByRole('button', { name: '회차 관리' }).click();
  await expect(page.getByRole('button', { name: /3회차.*브라우저/ })).toBeVisible();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByText('회차를 삭제했습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: /3회차.*브라우저/ })).not.toBeVisible();

  await page.getByLabel('주요 메뉴').getByRole('button', { name: '프로젝트', exact: true }).click();
  await expect(page.getByRole('heading', { name: '웹 성능 최적화 가이드' })).toBeVisible();
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByText('프로젝트를 삭제했습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: /웹 성능 최적화 가이드/ })).not.toBeVisible();
});

test('a new session can be started from the empty session state', async ({ page }) => {
  await page.goto('./?demo=1#operations');

  await page.getByRole('button', { name: '회차 관리' }).click();
  for (const sessionName of [/3회차.*브라우저/, /1회차.*운영/, /2회차.*TypeScript/]) {
    await page.getByRole('button', { name: sessionName }).click();
    await page.getByRole('button', { name: '삭제', exact: true }).click();
    await expect(page.getByText('회차를 삭제했습니다.')).toBeVisible();
  }

  await expect(page.getByText('회차가 없습니다.')).toBeVisible();
  await page.getByRole('button', { name: '새 회차 시작' }).click();
  await expect(page.getByText('새 회차를 시작했습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: /1회차/ })).toBeVisible();
});

test('primary demo pages have no detectable accessibility violations', async ({ page }) => {
  await page.goto('./?demo=1#dashboard');
  await expect(page.locator('main')).toBeVisible();

  for (const route of ['대시보드', '프로젝트', '자료', '발표', '운영']) {
    if (route !== '대시보드') {
      await page.getByRole('button', { name: route, exact: true }).click();
    }

    await expect(page.locator('main')).toBeVisible();
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations).toEqual([]);
  }
});



