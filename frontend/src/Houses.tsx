import React, { useEffect, useState } from 'react';

interface House {
  id: string;
  owner?: string;
}

const Houses: React.FC<{ token: string }> = ({ token }) => {
  const [houses, setHouses] = useState<House[]>([]);
  const [id, setId] = useState('');
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editOwner, setEditOwner] = useState('');

  const fetchHouses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/houses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHouses(await res.json());
      } else {
        setError('No se pudo obtener la lista de casas.');
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHouses();
    // eslint-disable-next-line
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('http://localhost:4000/houses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id, owner })
      });
      if (res.ok) {
        setSuccess('Casa agregada.');
        setId('');
        setOwner('');
        fetchHouses();
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo agregar la casa.');
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    }
    setLoading(false);
  };

  const handleEdit = (house: House) => {
    setEditId(house.id);
    setEditOwner(house.owner || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:4000/houses/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ owner: editOwner })
      });
      if (res.ok) {
        setSuccess('Casa actualizada.');
        setEditId(null);
        setEditOwner('');
        fetchHouses();
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo actualizar la casa.');
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    }
    setLoading(false);
  };

  const handleDelete = async (houseId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta casa?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`http://localhost:4000/houses/${houseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess('Casa eliminada.');
        fetchHouses();
      } else {
        const data = await res.json();
        setError(data.error || 'No se pudo eliminar la casa.');
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-xl shadow-card border border-border">
      <h2 className="text-2xl font-bold mb-6 text-primary">Casas del Vecindario</h2>
      <form onSubmit={handleAdd} className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="ID de casa (ej. 12, 12A, B1)"
          value={id}
          onChange={e => setId(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 w-32"
          required
        />
        <input
          type="text"
          placeholder="Propietario (opcional)"
          value={owner}
          onChange={e => setOwner(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 w-48"
        />
        <button type="submit" className="bg-primary text-white font-bold px-6 rounded-lg hover:bg-primary/90 transition" disabled={loading}>
          Agregar
        </button>
      </form>
      {error && <div className="text-error mb-4 text-center">{error}</div>}
      {success && <div className="text-green-600 mb-4 text-center">{success}</div>}
      {loading ? (
        <div className="text-textSecondary text-center">Cargando...</div>
      ) : (
        <table className="w-full border border-border rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-background">
              <th className="p-3 border-b border-border text-left text-textSecondary">ID</th>
              <th className="p-3 border-b border-border text-left text-textSecondary">Propietario</th>
              <th className="p-3 border-b border-border text-left text-textSecondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {houses.map(house => (
              <tr key={house.id} className="hover:bg-background/70">
                <td className="p-3 border-b border-border text-text font-medium">{house.id}</td>
                <td className="p-3 border-b border-border text-text">{house.owner || '-'}</td>
                <td className="p-3 border-b border-border">
                  {editId === house.id ? (
                    <form onSubmit={handleUpdate} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editOwner}
                        onChange={e => setEditOwner(e.target.value)}
                        className="border border-border rounded-lg px-2 py-1 w-32"
                      />
                      <button type="submit" className="bg-primary text-white px-3 rounded-lg">Guardar</button>
                      <button type="button" className="text-error px-2" onClick={() => setEditId(null)}>Cancelar</button>
                    </form>
                  ) : (
                    <>
                      <button className="text-primary font-bold mr-2" onClick={() => handleEdit(house)}>Editar</button>
                      <button className="text-error font-bold" onClick={() => handleDelete(house.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Houses;
