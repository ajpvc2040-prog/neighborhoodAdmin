import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  loading?: boolean;
  error?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, loading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 bg-card rounded-xl shadow-card border border-border">
        <h2 className="text-3xl font-bold mb-6 text-primary text-center">Iniciar sesión</h2>
        <input
          className="block w-full mb-4 p-3 border border-border rounded-xl bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          className="block w-full mb-4 p-3 border border-border rounded-xl bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-error mb-4 text-center">{error}</div>}
        <button
          className="w-full py-3 bg-primary text-white font-semibold rounded-xl shadow-button hover:bg-blue-800 transition disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

export default Login;
