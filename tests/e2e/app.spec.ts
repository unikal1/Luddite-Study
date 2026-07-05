import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('dashboard, material reader, composer, and tools work on desktop', async ({ page }, testInfo) => {
  await page.goto('./');

  await expect(page.getByRole('heading', { name: '브라우저 디버깅과 성능' })).toBeVisible();
  await expect(page.getByText('현재 회차')).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘 볼 것' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '운영 상태' })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dashboard.png`, fullPage: true });

  await page.getByRole('button', { name: '자료', exact: true }).click();
  await expect(page.getByRole('heading', { name: '자료 탐색' })).toBeVisible();
  await page.getByRole('button', { name: /스터디 운영 규칙/ }).click();
  await expect(page.getByRole('heading', { name: '스터디 운영 규칙', level: 2 })).toBeVisible();
  await expect(page.getByText('GitHub Pages에서는 브라우저가 저장소에 직접 쓰지 않는다.')).toBeVisible();
  await page.getByRole('button', { name: '문서 경로 복사' }).click();
  await expect(page.getByRole('button', { name: '문서 경로 복사됨' })).toBeVisible();

  await page.getByRole('button', { name: '작성', exact: true }).click();
  await expect(page.getByText('새 문서 초안은 이 브라우저에 자동 저장됩니다.')).toBeVisible();
  await page.getByLabel('제목').fill('브라우저 검증 노트');
  await page.getByText('세부 설정').click();
  await page.getByLabel('파일명').fill('browser-check');
  await page.getByRole('button', { name: '체크리스트 삽입' }).click();
  await expect(page.getByRole('textbox', { name: 'Markdown' })).toHaveValue(/- \[ \] 확인할 일/);
  await page.getByRole('textbox', { name: 'Markdown' }).fill('# 검증\n\n- [x] 대시보드 확인\n- [ ] 모바일 확인');
  await expect(page.getByText('자료/alice/browser-check.md')).toBeVisible();
  await expect(page.getByRole('heading', { name: '검증' })).toBeVisible();
  await page.getByText('gh CLI로 준비').click();
  await expect(page.getByText('gh auth login --hostname github.com --scopes repo')).toBeVisible();

  const repositoryRequests: string[] = [];
  const corsHeaders = {
    'access-control-allow-headers': 'authorization,content-type,x-github-api-version,accept',
    'access-control-allow-methods': 'GET,PUT,DELETE,OPTIONS',
    'access-control-allow-origin': '*'
  };
  await page.route('https://api.github.com/repos/unikal1/Luddite-Study/contents/**', async (route) => {
    const request = route.request();
    repositoryRequests.push(request.method());

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ headers: corsHeaders, status: 204 });
      return;
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        body: JSON.stringify({ message: 'Not Found' }),
        contentType: 'application/json',
        headers: corsHeaders,
        status: 404
      });
      return;
    }

    if (request.method() === 'PUT') {
      expect(request.headers().authorization).toBe('Bearer credential-value');
      expect(request.postDataJSON()).toEqual(expect.objectContaining({
        branch: 'main',
        message: 'Add study document: 브라우저 검증 노트'
      }));

      await route.fulfill({
        body: JSON.stringify({
          commit: {
            html_url: 'https://github.com/unikal1/Luddite-Study/commit/abc123',
            sha: 'abc123'
          },
          content: {
            path: '자료/alice/browser-check.md',
            sha: 'file123'
          }
        }),
        contentType: 'application/json',
        headers: corsHeaders,
        status: 200
      });
      return;
    }

    await route.fulfill({ body: JSON.stringify({ message: 'Unexpected method' }), contentType: 'application/json', headers: corsHeaders, status: 405 });
  });
  await page.getByLabel('GitHub 쓰기 인증값').fill('credential-value');
  await page.getByRole('button', { name: '저장소에 저장' }).click();
  await expect(page.getByText('저장소에 반영됐습니다. GitHub Pages는 보통 1-2분 뒤 새 빌드로 갱신됩니다.')).toBeVisible();
  expect(repositoryRequests).toEqual(expect.arrayContaining(['GET', 'PUT']));

  await page.reload();
  await expect(page.getByLabel('제목')).toHaveValue('브라우저 검증 노트');
  await expect(page.getByLabel('파일명')).toHaveValue('browser-check');
  await expect(page.getByRole('heading', { name: '검증' })).toBeVisible();

  await page.getByRole('button', { name: '수정' }).click();
  await page.getByLabel('기존 문서').selectOption('자료/공유/스터디-운영-규칙.md');
  await expect(page.getByRole('button', { name: '공유 자료' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: '사용자' })).toBeDisabled();
  await page.getByText('세부 설정').click();
  await expect(page.getByRole('textbox', { name: '파일명' })).toBeDisabled();
  await page.getByText('세부 설정').click();
  await expect(page.getByLabel('미리보기').getByText('자료/공유/스터디-운영-규칙.md')).toBeVisible();
  await expect(page.getByRole('heading', { name: '스터디 운영 규칙' })).toBeVisible();

  await page.getByRole('button', { name: '삭제 준비' }).click();
  await expect(page.getByRole('button', { name: '삭제 체크리스트 복사' })).toBeVisible();
  await expect(page.getByText('삭제할 문서를 선택하세요.')).not.toBeVisible();
  await expect(page.getByText('삭제 대상: 스터디 운영 규칙')).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-composer.png`, fullPage: true });

  await page.getByRole('button', { name: '운영', exact: true }).click();
  await expect(page.getByRole('heading', { name: '데이터 상태' })).toBeVisible();
  await expect(page.getByText('검증 통과')).toBeVisible();
  await expect(page.getByRole('heading', { name: '변경 초안' })).toBeVisible();
  await expect(page.getByText('data/sessions.json')).toBeVisible();
  await page.getByText('초안 보기').first().click();
  await expect(page.getByText('"status": "upcoming"')).toBeVisible();
  await page.getByRole('button', { name: '회의록' }).click();
  await expect(page.getByText('자료/공유/회의록/3회차-운영-기록.md')).toBeVisible();
  await expect(page.getByRole('link', { name: /회의록 만들기/ })).toBeVisible();
  await page.getByRole('button', { name: '진도' }).click();
  await page.getByLabel('현재 진도').fill('-3');
  await expect(page.getByLabel('현재 진도')).toHaveValue('0');
  await page.getByRole('button', { name: '벌칙' }).click();
  await page.getByLabel('금액').fill('-500');
  await expect(page.getByLabel('금액')).toHaveValue('0');
  await page.getByRole('button', { name: '뽑기' }).click();
  await expect(page.locator('.winner-box')).toContainText(/Alice|Bob|Chris/);
  await page.getByRole('button', { name: '일정' }).click();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-tools.png`, fullPage: true });
});

test('mobile viewport keeps primary flows reachable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');

  await expect(page.getByRole('heading', { name: '브라우저 디버깅과 성능' })).toBeVisible();
  await page.getByRole('button', { name: '발표', exact: true }).click();
  await expect(page.getByRole('heading', { name: '발표 탐색' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'TypeScript로 운영 데이터 설명하기', level: 2 })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-presentations.png`, fullPage: true });
});

test('primary pages have no detectable accessibility violations', async ({ page }) => {
  await page.goto('./');

  const dashboardScan = await new AxeBuilder({ page }).analyze();
  expect(dashboardScan.violations).toEqual([]);

  for (const route of ['자료', '발표', '작성', '운영']) {
    await page.getByRole('button', { name: route, exact: true }).click();
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations).toEqual([]);
  }
});
