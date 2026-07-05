import type { Session } from '@supabase/supabase-js';
import { ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MemberDraft } from '../types';

type BootstrapPanelProps = {
  session: Session;
  onCreateOwner: (draft: MemberDraft) => Promise<void>;
};

export function BootstrapPanel({ session, onCreateOwner }: BootstrapPanelProps) {
  const fallbackUid = useMemo(() => {
    const source = session.user.email?.split('@')[0] ?? 'owner';
    return source.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'owner';
  }, [session.user.email]);
  const [draft, setDraft] = useState<MemberDraft>({
    memberUid: fallbackUid,
    displayName: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'Owner',
    inviteEmail: session.user.email ?? '',
    githubUsername: session.user.user_metadata?.user_name ?? '',
    role: 'owner',
    roleLabel: '운영자',
    color: '#0f766e'
  });
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setStatus('');

    try {
      await onCreateOwner(draft);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '운영자 등록에 실패했습니다.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="bootstrap-title">
        <div className="section-heading">
          <ShieldCheck size={20} aria-hidden="true" />
          <h1 id="bootstrap-title">첫 운영자 등록</h1>
        </div>
        <p className="lead">아직 로그인 계정과 연결된 운영자가 없습니다. 현재 계정을 첫 운영자로 연결하면 RLS가 일반 운영 모드로 전환됩니다.</p>
        <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label>
            멤버 ID
            <input value={draft.memberUid} onChange={(event) => setDraft({ ...draft, memberUid: event.target.value })} />
          </label>
          <label>
            표시 이름
            <input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
          </label>
          <label>
            이메일
            <input value={draft.inviteEmail} onChange={(event) => setDraft({ ...draft, inviteEmail: event.target.value })} type="email" />
          </label>
          <label>
            GitHub 사용자명
            <input value={draft.githubUsername} onChange={(event) => setDraft({ ...draft, githubUsername: event.target.value })} />
          </label>
          <button className="primary-button auth-wide-button" type="submit" disabled={pending}>
            <ShieldCheck size={18} aria-hidden="true" />
            {pending ? '등록 중' : '운영자로 등록'}
          </button>
        </form>
        {status ? <p className="form-status form-status--error">{status}</p> : null}
      </section>
    </main>
  );
}
