import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  path: string;
  params: Record<string, string>;
  navigate: (to: string) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialPath = () => {
    if (typeof window === 'undefined') return '/dashboard';
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
    const pathname = window.location.pathname;
    return pathname && pathname !== '/' ? pathname : '/dashboard';
  };

  const [path, setPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace('#', '');
      const current = hash || window.location.pathname || '/dashboard';
      setPath(current === '/' ? '/dashboard' : current);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to === '/' ? '/dashboard' : to;
    setPath(target);
    try {
      window.history.pushState(null, '', target);
    } catch {
      window.location.hash = target;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Extract params (e.g. /properties/:id or /properties/:id/edit)
  const params: Record<string, string> = {};
  if (path.startsWith('/properties/') && path !== '/properties/new') {
    const sub = path.replace('/properties/', '');
    if (sub.endsWith('/edit')) {
      params.id = sub.replace('/edit', '');
      params.mode = 'edit';
    } else {
      params.id = sub;
    }
  } else if (path.startsWith('/clients/') && path !== '/clients/new') {
    const sub = path.replace('/clients/', '');
    if (sub.endsWith('/edit')) {
      params.id = sub.replace('/edit', '');
      params.mode = 'edit';
    } else {
      params.id = sub;
    }
  }

  return (
    <RouterContext.Provider value={{ path, params, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter(): RouterContextType {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
}
