import React, { useEffect, useState } from 'react';

interface Neighbor {
  user_id: string;
  name: string;
  house_id: string;
  email?: string | null;
  phone?: string | null;
}

interface House { id: string; owner?: string }

const Neighbors: React.FC<{ token: string }> = ({ token }) => {
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [houses, setHouses] = useState<House[]>([]);

  // Create form
  const [cUserId, setCUserId] = useState(''); // opcional (si se deja vacío, el backend genera)
  const [cPassword, setCPassword] = useState('');
  const [cName, setCName] = useState('');
  const [cHouseId, setCHouseId] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eHouseId, setEHouseId] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [ePassword, setEPassword] = useState(''); // opcional, para reestablecer

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const api = (path: string, init?: RequestInit) =>
    fetch(`http://localhost:4000${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.headers || {}),
      },
    });

  const fetchNeighbors = async () => {
    try {
      const res = await api('/neighbors');
      if (!res.ok) throw new Error('No se pudo obtener vecinos');
      setNeighbors(await res.json());
    } catch (e) {
      setError('No se pudo obtener la lista de vecinos.');
    }
  };

  const fetchHouses = async () => {
    try {
      const res = await api('/houses', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No se pudo obtener casas');
      setHouses(await res.json());
    } catch (e) {
      setError('No se pudo obtener la lista de casas.');
    }
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchNeighbors(), fetchHouses()])
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    if (!cPassword || !cName || !cHouseId) {
      setError('password, name y house son requeridos.');
      setLoading(false);
      return;
    }
    try {
      const body: any = { password: cPassword, name: cName, house_id: cHouseId, email: cEmail || undefined, phone: cPhone || undefined };
      if (cUserId) body.user_id = cUserId;
      const res = await api('/neighbors', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear');
      setSuccess('Vecino creado.');
      setCUserId(''); setCPassword(''); setCName(''); setCHouseId(''); setCEmail(''); setCPhone('');
      fetchNeighbors();
    } catch (err: any) {
      setError(err.message || 'No se pudo crear el vecino.');
    } finally {
      setLoading(false);
    }
  };

  const beginEdit = (n: Neighbor) => {
    setEditId(n.user_id);
    setEName(n.name);
    setEHouseId(n.house_id);
    setEEmail(n.email || '');
    setEPhone(n.phone || '');
    setEPassword('');
  };

  const cancelEdit = () => {
    setEditId(null);
    setEName(''); setEHouseId(''); setEEmail(''); setEPhone(''); setEPassword('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const body: any = { name: eName, house_id: eHouseId, email: eEmail, phone: ePhone };
      if (ePassword) body.password = ePassword;
      const res = await api(`/neighbors/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar');
      setSuccess('Vecino actualizado.');
      cancelEdit();
      fetchNeighbors();
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar el vecino.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user_id: string) => {
    if (!confirm('¿Eliminar este vecino?')) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await api(`/neighbors/${user_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar');
      setSuccess('Vecino eliminado.');
      fetchNeighbors();
    } catch (err: any) {
      setError(err.message || 'No se pudo eliminar el vecino.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-card border border-border">
      <h2 className="text-2xl font-bold mb-6 text-primary">Vecinos</h2>

      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <input className="border border-border rounded-lg px-3 py-2 md:col-span-1" placeholder="ID (opcional)" value={cUserId} onChange={e=>setCUserId(e.target.value.toUpperCase())} />
        <input className="border border-border rounded-lg px-3 py-2 md:col-span-2" placeholder="Nombre" value={cName} onChange={e=>setCName(e.target.value)} required />
        <select className="border border-border rounded-lg px-3 py-2 md:col-span-1" value={cHouseId} onChange={e=>setCHouseId(e.target.value)} required>
          <option value="">Casa</option>
          {houses.map(h => (
            <option key={h.id} value={h.id}>{h.id}</option>
          ))}
        </select>
        <input className="border border-border rounded-lg px-3 py-2 md:col-span-1" type="password" placeholder="Password" value={cPassword} onChange={e=>setCPassword(e.target.value)} required />
        <input className="border border-border rounded-lg px-3 py-2 md:col-span-1" placeholder="Email (opcional)" value={cEmail} onChange={e=>setCEmail(e.target.value)} />
        <input className="border border-border rounded-lg px-3 py-2 md:col-span-1" placeholder="Teléfono (opcional)" value={cPhone} onChange={e=>setCPhone(e.target.value)} />
        <div className="md:col-span-6 flex justify-end">
          <button type="submit" className="bg-primary text-white font-bold px-6 py-2 rounded-lg hover:bg-primary/90" disabled={loading}>Agregar</button>
        </div>
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
              <th className="p-3 border-b border-border text-left text-textSecondary">Nombre</th>
              <th className="p-3 border-b border-border text-left text-textSecondary">Casa</th>
              <th className="p-3 border-b border-border text-left text-textSecondary">Email</th>
              <th className="p-3 border-b border-border text-left text-textSecondary">Teléfono</th>
              <th className="p-3 border-b border-border text-left text-textSecondary">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map(n => (
              <tr key={n.user_id} className="hover:bg-background/70">
                <td className="p-3 border-b border-border text-text font-medium">{n.user_id}</td>
                <td className="p-3 border-b border-border text-text">
                  {editId === n.user_id ? (
                    <input className="border border-border rounded-lg px-2 py-1" value={eName} onChange={e=>setEName(e.target.value)} />
                  ) : n.name}
                </td>
                <td className="p-3 border-b border-border text-text">
                  {editId === n.user_id ? (
                    <select className="border border-border rounded-lg px-2 py-1" value={eHouseId} onChange={e=>setEHouseId(e.target.value)}>
                      {houses.map(h => <option key={h.id} value={h.id}>{h.id}</option>)}
                    </select>
                  ) : n.house_id}
                </td>
                <td className="p-3 border-b border-border text-text">
                  {editId === n.user_id ? (
                    <input className="border border-border rounded-lg px-2 py-1" value={eEmail} onChange={e=>setEEmail(e.target.value)} />
                  ) : (n.email || '-')}
                </td>
                <td className="p-3 border-b border-border text-text">
                  {editId === n.user_id ? (
                    <input className="border border-border rounded-lg px-2 py-1" value={ePhone} onChange={e=>setEPhone(e.target.value)} />
                  ) : (n.phone || '-')}
                </td>
                <td className="p-3 border-b border-border text-text">
                  {editId === n.user_id ? (
                    <form onSubmit={handleUpdate} className="flex flex-col md:flex-row gap-2 items-center">
                      <input className="border border-border rounded-lg px-2 py-1" type="password" placeholder="Nuevo password (opcional)" value={ePassword} onChange={e=>setEPassword(e.target.value)} />
                      <div className="flex gap-2">
                        <button type="submit" className="bg-primary text-white px-3 rounded-lg">Guardar</button>
                        <button type="button" className="text-error px-3" onClick={cancelEdit}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-3">
                      <button className="text-primary font-bold" onClick={()=>beginEdit(n)}>Editar</button>
                      <button className="text-error font-bold" onClick={()=>handleDelete(n.user_id)}>Eliminar</button>
                    </div>
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

export default Neighbors;
