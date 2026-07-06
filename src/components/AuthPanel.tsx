import { Github } from 'lucide-react';
import { useState } from 'react';
import { getAuthRedirectUrl } from '../lib/authRedirect';
import { supabase } from '../lib/supabase';

type AuthPanelProps = {
  onDemo?: () => void;
};

export function AuthPanel({ onDemo }: AuthPanelProps) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function signInWithGithub() {
    setPending(true);
    setStatus('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: getAuthRedirectUrl()
        }
      });
      if (error) throw error;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'GitHub 로그인에 실패했습니다.');
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-block auth-brand">
          <span className="brand-mark">LS</span>
          <div>
            <strong>Luddite Study</strong>
            <span>Supabase 기반 스터디 운영</span>
          </div>
        </div>

        <p className="eyebrow">로그인 필요</p>
        <h1 id="auth-title">스터디 데이터에 접근하려면 로그인하세요</h1>
        <p className="lead">GitHub OAuth로만 로그인합니다. 읽기와 쓰기는 활성 스터디 멤버에게만 열립니다.</p>

        <button className="primary-button auth-wide-button" type="button" onClick={() => void signInWithGithub()} disabled={pending}>
          <Github size={18} aria-hidden="true" />
          {pending ? 'GitHub로 이동 중' : 'GitHub로 로그인'}
        </button>

        {onDemo ? (
          <button className="text-button" type="button" onClick={onDemo}>
            데모 데이터로 확인
          </button>
        ) : null}

        {status ? <p className="form-status">{status}</p> : null}
      </section>
    </main>
  );
}
