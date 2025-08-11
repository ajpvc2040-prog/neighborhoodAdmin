import React, { useState, useEffect, useRef } from 'react';
import Login from './Login';
import UserIcon from './UserIcon';
import './App.css';


interface User {
  id: number;
  username: string;
  role?: string;
}

const App: React.FC = () => {
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [role, setRole] = useState<string>(localStorage.getItem('role') || '');
  const [username, setUsername] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      fetchUsers();
      // Decodificar el token para obtener el username
      try {
        const base64 = token.split('.')[1] || '';
        const payload = JSON.parse(atob(base64));
        setUsername(payload.username);
      } catch {
        setUsername('');
      }
    } else {
      setUsername('');
    }
  }, [token]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogin = async (username: string, password: string) => {
    setLoading(true);
    setError('');
    try {
  const res = await fetch('http://localhost:4000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        if (data.role) {
          setRole(data.role);
          localStorage.setItem('role', data.role);
        } else {
          setRole('');
          localStorage.removeItem('role');
        }
      } else {
        setError(data.message || 'Error de autenticación');
      }
    } catch {
      setError('No se pudo conectar con el backend');
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
  const res = await fetch('http://localhost:4000/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        setError(data.message || 'No se pudo obtener la lista de usuarios.');
      }
    } catch {
      setError('No se pudo conectar con el backend');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    setRole('');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUsers([]);
  };

  if (!token) {
    return <Login onLogin={handleLogin} loading={loading} error={error} />;
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col items-center justify-start py-12">
      <div className="w-full max-w-2xl p-8 bg-card rounded-xl shadow-card border border-border">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">Usuarios</h1>
            {role === 'admin' && (
              <span className="ml-2 px-3 py-1 bg-yellow-400 text-black rounded-full text-xs font-bold">ADMIN</span>
            )}
          </div>
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-background/70 border border-border"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Abrir menú de usuario"
            >
              <UserIcon className="w-8 h-8 text-primary" />
              <span className="font-semibold text-text">{username}</span>
              <svg className="w-4 h-4 ml-1 text-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-border rounded-xl shadow-lg z-10 animate-fade-in">
                <div className="px-4 py-3 border-b border-border">
                  <div className="font-bold text-primary">{username}</div>
                  <div className="text-xs text-textSecondary">Rol: {role || 'user'}</div>
                </div>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-background/60 text-error font-semibold rounded-b-xl"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
        {error && <div className="text-error mb-4 text-center">{error}</div>}
        {loading ? (
          <div className="text-textSecondary text-center">Cargando...</div>
        ) : (
          <table className="w-full border border-border rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-background">
                <th className="p-3 border-b border-border text-left text-textSecondary">ID</th>
                <th className="p-3 border-b border-border text-left text-textSecondary">Usuario</th>
                <th className="p-3 border-b border-border text-left text-textSecondary">Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="hover:bg-background/70">
                  <td className="p-3 border-b border-border text-text font-medium">{u.id}</td>
                  <td className="p-3 border-b border-border text-text">{u.username}</td>
                  <td className="p-3 border-b border-border text-text">{u.role || 'user'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default App;
