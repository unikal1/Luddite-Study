import { getAuthRedirectUrl } from './authRedirect';

describe('getAuthRedirectUrl', () => {
  it('uses the app base URL without the current route state', () => {
    window.history.replaceState(null, '', '/Luddite-Study/?demo=1#operations');

    expect(getAuthRedirectUrl()).toBe('http://localhost:3000/Luddite-Study/');
  });
});
