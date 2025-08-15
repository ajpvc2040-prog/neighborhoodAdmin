import React, { useEffect, useState } from 'react';

interface Balance { total_charges: number; total_payments: number; balance: number; }
interface Payment { id: number; amount: number; method?: string | null; reference?: string | null; paid_at: string; note?: string | null }
interface PeriodDue { user_id: string; period: string; due_amount: number }

const NeighborPay: React.FC<{ token: string }> = ({ token }) => {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [dues, setDues] = useState<PeriodDue[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const api = (path: string, init?: RequestInit) => fetch(`http://localhost:4000${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [bRes, dRes, pRes] = await Promise.all([
        api('/me/balance'),
        api('/me/period-dues'),
        api('/me/payments'),
      ]);
      if (!bRes.ok) throw new Error('No se pudo obtener balance');
      if (!dRes.ok) throw new Error('No se pudo obtener deudas');
      if (!pRes.ok) throw new Error('No se pudo obtener pagos');
      setBalance(await bRes.json());
      setDues(await dRes.json());
      setPayments(await pRes.json());
    } catch (e: any) {
      setError(e.message || 'Error de carga');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    const val = Number(amount);
    if (!val || val <= 0) { setError('Ingresa un monto válido (> 0)'); return; }
    setLoading(true);
    try {
      const res = await api('/me/payments', { method: 'POST', body: JSON.stringify({ amount: val, method: method || undefined, reference: reference || undefined, note: note || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el pago');
      setSuccess('Pago registrado');
      setAmount(''); setMethod(''); setReference(''); setNote('');
      // Refresh
      await load();
    } catch (err: any) {
      setError(err.message || 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const suggested = balance ? Math.max(0, Number(balance.balance)) : 0;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-card border border-border">
      <h2 className="text-2xl font-bold mb-4 text-primary">Realizar pago</h2>
      {loading && <div className="text-textSecondary mb-3">Cargando...</div>}
      {error && <div className="text-error mb-3">{error}</div>}
      {success && <div className="text-green-600 mb-3">{success}</div>}

      <div className="mb-6 p-4 border border-border rounded-lg bg-background/40">
        <div className="font-semibold">Balance actual</div>
        <div className="text-sm text-textSecondary">Cargos: ${balance?.total_charges?.toFixed?.(2) || '0.00'} | Pagos: ${balance?.total_payments?.toFixed?.(2) || '0.00'}</div>
        <div className="text-xl font-bold mt-1">Adeudo: ${balance?.balance?.toFixed?.(2) || '0.00'}</div>
      </div>

      <form onSubmit={submitPayment} className="flex flex-col gap-3 mb-8">
        <label className="text-sm text-textSecondary">Monto a pagar</label>
        <input className="border border-border rounded-lg px-3 py-2" type="number" step="0.01" min="0" placeholder={suggested ? `Sugerido: ${suggested.toFixed(2)}` : '0.00'} value={amount} onChange={e=>setAmount(e.target.value)} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border border-border rounded-lg px-3 py-2" placeholder="Método (opcional)" value={method} onChange={e=>setMethod(e.target.value)} />
          <input className="border border-border rounded-lg px-3 py-2" placeholder="Referencia (opcional)" value={reference} onChange={e=>setReference(e.target.value)} />
          <input className="border border-border rounded-lg px-3 py-2" placeholder="Nota (opcional)" value={note} onChange={e=>setNote(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="bg-primary text-white font-bold px-6 py-2 rounded-lg hover:bg-primary/90" disabled={loading}>Pagar</button>
          <button type="button" className="px-4 py-2 rounded-lg border border-border" onClick={()=>setAmount(suggested ? suggested.toString() : '')}>Usar sugerido</button>
        </div>
      </form>

      <div>
        <div className="font-semibold mb-2">Deudas por periodo</div>
        <table className="w-full border border-border rounded-xl overflow-hidden mb-6">
          <thead>
            <tr className="bg-background">
              <th className="p-2 border-b border-border text-left text-textSecondary">Periodo</th>
              <th className="p-2 border-b border-border text-left text-textSecondary">Monto</th>
            </tr>
          </thead>
          <tbody>
            {dues.map(d => (
              <tr key={d.user_id + d.period}>
                <td className="p-2 border-b border-border">{new Date(d.period).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</td>
                <td className="p-2 border-b border-border">${d.due_amount.toFixed(2)}</td>
              </tr>
            ))}
            {dues.length === 0 && (
              <tr><td className="p-2 border-b border-border text-textSecondary" colSpan={2}>Sin cargos generados</td></tr>
            )}
          </tbody>
        </table>

        <div className="font-semibold mb-2">Pagos recientes</div>
        <table className="w-full border border-border rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-background">
              <th className="p-2 border-b border-border text-left text-textSecondary">Fecha</th>
              <th className="p-2 border-b border-border text-left text-textSecondary">Monto</th>
              <th className="p-2 border-b border-border text-left text-textSecondary">Método</th>
              <th className="p-2 border-b border-border text-left text-textSecondary">Referencia</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="p-2 border-b border-border">{new Date(p.paid_at).toLocaleString()}</td>
                <td className="p-2 border-b border-border">${p.amount.toFixed(2)}</td>
                <td className="p-2 border-b border-border">{p.method || '-'}</td>
                <td className="p-2 border-b border-border">{p.reference || '-'}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td className="p-2 border-b border-border text-textSecondary" colSpan={4}>Sin pagos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NeighborPay;
