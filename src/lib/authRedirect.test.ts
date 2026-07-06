import { getAuthRedirectUrl } from './authRedirect';

describe('getAuthRedirectUrl', () => {
  it('uses the deployed GitHub Pages URL without the current route state', () => {
    window.history.replaceState(null, '', '/Luddite-Study/?demo=1#operations');

    expect(getAuthRedirectUrl()).toBe('https://unikal1.github.io/Luddite-Study/');
  });
});
