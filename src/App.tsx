import { BookOpen, ClipboardList, FilePenLine, Gauge, Presentation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { allDocs, materialDocs, presentationDocs } from './content';
import { getCurrentSession } from './data';
import { Composer } from './components/Composer';
import { Dashboard } from './components/Dashboard';
import { Explorer } from './components/Explorer';
import { Operations } from './components/Operations';
import type { RouteKey } from './types';

const routes: Array<{ key: RouteKey; label: string; icon: React.ReactNode }> = [
  { key: 'dashboard', label: '대시보드', icon: <Gauge size={18} /> },
  { key: 'materials', label: '자료', icon: <BookOpen size={18} /> },
  { key: 'presentations', label: '발표', icon: <Presentation size={18} /> },
  { key: 'compose', label: '작성', icon: <FilePenLine size={18} /> },
  { key: 'tools', label: '운영', icon: <ClipboardList size={18} /> }
];

export default function App() {
  const [route, setRoute] = useState<RouteKey>(() => readRoute());
  const currentSession = getCurrentSession();
  const recentDocs = useMemo(() => allDocs.slice(0, 8), []);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(nextRoute: RouteKey) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="주 메뉴">
        <div className="brand-block">
          <span className="brand-mark">LS</span>
          <div>
            <strong>Luddite Study</strong>
            <span>정적 운영 도구</span>
          </div>
        </div>
        <nav className="side-nav">
          {routes.map((item) => (
            <button
              className={route === item.key ? 'nav-item nav-item--active' : 'nav-item'}
              key={item.key}
              type="button"
              aria-current={route === item.key ? 'page' : undefined}
              onClick={() => navigate(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="mobile-nav" role="navigation" aria-label="모바일 메뉴">
        {routes.map((item) => (
          <button
            className={route === item.key ? 'mobile-nav-item mobile-nav-item--active' : 'mobile-nav-item'}
            key={item.key}
            type="button"
            aria-current={route === item.key ? 'page' : undefined}
            onClick={() => navigate(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <main className="app-main">
        {route === 'dashboard' ? <Dashboard currentSession={currentSession} recentDocs={recentDocs} onNavigate={navigate} /> : null}
        {route === 'materials' ? <Explorer kind="material" docs={materialDocs} /> : null}
        {route === 'presentations' ? <Explorer kind="presentation" docs={presentationDocs} /> : null}
        {route === 'compose' ? <Composer /> : null}
        {route === 'tools' ? <Operations /> : null}
      </main>
    </div>
  );
}

function readRoute(): RouteKey {
  const hash = window.location.hash.replace('#', '') as RouteKey;
  return routes.some((route) => route.key === hash) ? hash : 'dashboard';
}
