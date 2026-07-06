import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPanel } from './AuthPanel';

const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn()
}));

vi.mock('../lib/authRedirect', () => ({
  getAuthRedirectUrl: () => 'https://unikal1.github.io/Luddite-Study/'
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth
    }
  }
}));

describe('AuthPanel', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
  });

  it('only exposes GitHub login', () => {
    render(<AuthPanel />);

    expect(screen.getByRole('button', { name: 'GitHub로 로그인' })).toBeInTheDocument();
    expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
    expect(screen.queryByText('계정 만들기')).not.toBeInTheDocument();
    expect(screen.queryByText('재설정')).not.toBeInTheDocument();
  });

  it('starts GitHub OAuth with the deployed redirect URL', async () => {
    render(<AuthPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'GitHub로 로그인' }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: 'https://unikal1.github.io/Luddite-Study/'
        }
      });
    });
  });
});
