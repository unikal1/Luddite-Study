const defaultAuthRedirectUrl = 'https://unikal1.github.io/Luddite-Study/';

export function getAuthRedirectUrl(): string {
  return import.meta.env.VITE_AUTH_REDIRECT_URL ?? defaultAuthRedirectUrl;
}
