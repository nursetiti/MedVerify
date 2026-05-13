import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('medverify_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData) => {
    sessionStorage.setItem('medverify_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}