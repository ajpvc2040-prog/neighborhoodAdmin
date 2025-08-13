import React, { useState, useEffect } from 'react';

interface NeighborhoodConfig {
  name: string;
  periodicity: 'Semanal' | 'Mensual';
  amount: number;
}

const Neighborhood: React.FC = () => {
  const [config, setConfig] = useState<NeighborhoodConfig>({
    name: '',
    periodicity: 'Mensual',
    amount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Obtener token del localStorage
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('http://localhost:4000/neighborhood', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) setConfig({
            name: data.name,
            periodicity: data.periodicity,
            amount: parseFloat(data.amount)
          });
        } else {
          setError('No se pudo obtener la configuración.');
        }
      } catch {
        setError('No se pudo conectar con el backend.');
      }
      setLoading(false);
    };
    fetchConfig();
    // eslint-disable-next-line
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:4000/neighborhood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSuccess('¡Configuración guardada!');
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo guardar la configuración.');
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-xl shadow-card border border-border">
      <h2 className="text-2xl font-bold mb-6 text-primary">Configuración del Vecindario</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col text-left">
          <span className="mb-1 font-semibold">Nombre del vecindario</span>
          <input
            type="text"
            name="name"
            value={config.name}
            onChange={handleChange}
            className="border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>
        <label className="flex flex-col text-left">
          <span className="mb-1 font-semibold">Periodicidad de aportación</span>
          <select
            name="periodicity"
            value={config.periodicity}
            onChange={handleChange}
            className="border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Semanal">Semanal</option>
            <option value="Mensual">Mensual</option>
          </select>
        </label>
        <label className="flex flex-col text-left">
          <span className="mb-1 font-semibold">Monto de aportación</span>
          <input
            type="number"
            name="amount"
            value={config.amount}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>
        <button
          type="submit"
          className="mt-4 bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary/90 transition"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Guardar configuración'}
        </button>
        {error && <div className="text-error text-center mt-2">{error}</div>}
        {success && <div className="text-green-600 text-center mt-2">{success}</div>}
      </form>
    </div>
  );
};

export default Neighborhood;
