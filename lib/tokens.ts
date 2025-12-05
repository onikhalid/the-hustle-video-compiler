const TOKEN_KEY = 'SALARY4LIFEADMIN_TOKEN';
const USER_KEY = 'SALARY4LIFEADMIN_USER';

export const tokenStorage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    }
  },

  clearToken: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
  },

  setUser: (user: any) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  getUser: () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
};
