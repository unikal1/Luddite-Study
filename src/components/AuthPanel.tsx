import { Github, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { getAuthRedirectUrl } from '../lib/authRedirect';
import { supabase } from '../lib/supabase';

type AuthPanelProps = {
  onDemo?: () => void;
};

export function AuthPanel({ onDemo }: AuthPanelProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setStatus('');

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: displayName || email.split('@')[0] }
          }
        });
        if (error) throw error;
        setStatus('회원가입 요청이 처리됐습니다. 이메일 확인이 켜져 있으면 메일 확인 후 로그인하세요.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl()
        });
        if (error) throw error;
        setStatus('비밀번호 재설정 메일을 보냈습니다.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '인증 처리에 실패했습니다.');
    } finally {
      setPending(false);
    }
  }

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
        <p className="lead">GitHub OAuth 또는 이메일/비밀번호로 로그인합니다. 읽기와 쓰기는 활성 스터디 멤버에게만 열립니다.</p>

        <button className="primary-button auth-wide-button" type="button" onClick={() => void signInWithGithub()} disabled={pending}>
          <Github size={18} aria-hidden="true" />
          GitHub로 로그인
        </button>

        <div className="tool-tabs" aria-label="인증 방식">
          <button className={mode === 'signin' ? 'tool-tab tool-tab--active' : 'tool-tab'} type="button" onClick={() => setMode('signin')}>
            로그인
          </button>
          <button className={mode === 'signup' ? 'tool-tab tool-tab--active' : 'tool-tab'} type="button" onClick={() => setMode('signup')}>
            계정 만들기
          </button>
          <button className={mode === 'reset' ? 'tool-tab tool-tab--active' : 'tool-tab'} type="button" onClick={() => setMode('reset')}>
            재설정
          </button>
        </div>

        <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          {mode === 'signup' ? (
            <label>
              이름
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </label>
          ) : null}
          <label>
            이메일
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          {mode !== 'reset' ? (
            <label>
              비밀번호
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
            </label>
          ) : null}
          <button className="secondary-button auth-wide-button" type="submit" disabled={pending}>
            {mode === 'signin' ? <LogIn size={18} aria-hidden="true" /> : mode === 'signup' ? <UserPlus size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
            {pending ? '처리 중' : mode === 'signin' ? '이메일로 로그인' : mode === 'signup' ? '계정 만들기' : '재설정 메일 보내기'}
          </button>
        </form>

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
