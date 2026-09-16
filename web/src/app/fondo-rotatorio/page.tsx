'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Coins,
  HandCoins,
  Receipt,
  Plus,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  FileCheck2,
} from 'lucide-react';

export default function FondoRotatorioPage() {
  const [activeTab, setActiveTab] = useState<'PRESTAMOS' | 'COBRANZAS'>('PRESTAMOS');
  const [loans, setLoans] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);

  // Comerciantes para selector
  const [merchants, setMerchants] = useState<any[]>([]);

  // Form préstamo
  const [loanForm, setLoanForm] = useState({
    merchantId: '',
    borrowerName: '',
    borrowerDni: '',
    amount: 500,
    termMonths: 2,
    interestRate: 5,
    notes: '',
  });

  // Form cobranza
  const [collectionForm, setCollectionForm] = useState({
    loanId: '',
    description: 'Cuota 1 de amortización',
    principalAmount: 250,
    interestAmount: 25,
    paymentMethod: 'EFECTIVO',
    receiptNumber: '',
  });

  // Ticket de cobranza para imprimir
  const [printReceiptData, setPrintReceiptData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [loansRes, collectionsRes, merchantsRes] = await Promise.all([
        apiRequest('/revolving-fund/loans'),
        apiRequest('/revolving-fund/collections'),
        apiRequest('/merchants'),
      ]);
      setLoans(loansRes || []);
      setCollections(collectionsRes || []);
      setMerchants(merchantsRes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectMerchant = (merchantId: string) => {
    const match = merchants.find((m) => m.id === merchantId);
    if (match) {
      setLoanForm((prev) => ({
        ...prev,
        merchantId,
        borrowerName: `${match.lastName}, ${match.firstName}`,
        borrowerDni: match.dni,
      }));
    } else {
      setLoanForm((prev) => ({
        ...prev,
        merchantId: '',
        borrowerName: '',
        borrowerDni: '',
      }));
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/revolving-fund/loans', {
        method: 'POST',
        body: JSON.stringify(loanForm),
      });
      alert('✓ Préstamo de Fondo Rotatorio registrado con éxito');
      setIsLoanModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error al registrar préstamo');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/revolving-fund/collections', {
        method: 'POST',
        body: JSON.stringify(collectionForm),
      });
      alert('✓ Cobranza registrada exitosamente');
      setIsCollectionModalOpen(false);
      setPrintReceiptData(res);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error al registrar cobranza');
    }
  };

  // KPIs
  const totalLent = loans.reduce((acc, l) => acc + Number(l.amount || 0), 0);
  const totalCollected = collections.reduce((acc, c) => acc + Number(c.totalAmount || 0), 0);
  const totalInterests = collections.reduce((acc, c) => acc + Number(c.interestAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Administración de Fondo Rotatorio</h1>
          <p className="text-xs text-slate-500">
            Microcréditos solidarios a comerciantes del mercado, control de colocaciones, amortizaciones e intereses.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsLoanModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Nuevo Préstamo</span>
          </button>

          <button
            onClick={() => setIsCollectionModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition flex items-center space-x-1.5"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Registrar Cobranza</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Colocado en Préstamos</span>
          <p className="text-2xl font-black text-indigo-700 font-mono mt-1">S/ {totalLent.toFixed(2)}</p>
          <span className="text-xs text-slate-400">{loans.length} colocaciones</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Recuperado (Cobranzas)</span>
          <p className="text-2xl font-black text-emerald-700 font-mono mt-1">S/ {totalCollected.toFixed(2)}</p>
          <span className="text-xs text-slate-400">{collections.length} amortizaciones</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400">Intereses Ganados</span>
          <p className="text-2xl font-black text-amber-600 font-mono mt-1">S/ {totalInterests.toFixed(2)}</p>
          <span className="text-xs text-slate-400">Rendimiento financiero</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('PRESTAMOS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'PRESTAMOS' ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HandCoins className="w-4 h-4" />
          <span>1. Préstamos ({loans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COBRANZAS')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            activeTab === 'COBRANZAS' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>2. Cobranzas ({collections.length})</span>
        </button>
      </div>

      {/* Table Content */}
      {activeTab === 'PRESTAMOS' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">N° de Orden</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Nombre y Apellido</th>
                  <th className="p-3">DNI</th>
                  <th className="p-3">Plazo</th>
                  <th className="p-3">Monto (Capital)</th>
                  <th className="p-3">Total con Interés</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">No hay préstamos registrados</td>
                  </tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-indigo-700">{l.orderNumber}</td>
                      <td className="p-3 text-slate-600">{new Date(l.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-slate-900">{l.borrowerName}</td>
                      <td className="p-3 font-mono text-slate-600">{l.borrowerDni}</td>
                      <td className="p-3 text-slate-700">{l.termMonths} meses ({l.interestRate}%)</td>
                      <td className="p-3 font-mono font-bold text-slate-800">S/ {Number(l.amount).toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-indigo-800">S/ {Number(l.totalAmount).toFixed(2)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            l.status === 'CANCELADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'MOROSO'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'COBRANZAS' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">N° de Orden</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Nombre y Apellido</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Capital</th>
                  <th className="p-3">Interés</th>
                  <th className="p-3">Total Cobrado</th>
                  <th className="p-3">Préstamo Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">No hay cobranzas registradas</td>
                  </tr>
                ) : (
                  collections.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono font-bold text-emerald-700">{c.orderNumber}</td>
                      <td className="p-3 text-slate-600">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-slate-900">{c.borrowerName}</td>
                      <td className="p-3 text-slate-600">{c.description}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">S/ {Number(c.principalAmount).toFixed(2)}</td>
                      <td className="p-3 font-mono font-bold text-amber-600">S/ {Number(c.interestAmount).toFixed(2)}</td>
                      <td className="p-3 font-mono font-black text-emerald-800">S/ {Number(c.totalAmount).toFixed(2)}</td>
                      <td className="p-3 font-mono text-slate-500">{c.loan?.orderNumber || 'N/D'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Préstamo */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Registrar Préstamo de Fondo Rotatorio</h2>

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Seleccionar Socio / Comerciante</label>
                <select
                  value={loanForm.merchantId}
                  onChange={(e) => handleSelectMerchant(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Ingresar Manualmente --</option>
                  {merchants.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.lastName}, {m.firstName} ({m.dni})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre y Apellido *</label>
                  <input
                    type="text"
                    required
                    value={loanForm.borrowerName}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">DNI *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={loanForm.borrowerDni}
                    onChange={(e) => setLoanForm({ ...loanForm, borrowerDni: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Monto (S/) *</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={loanForm.amount}
                    onChange={(e) => setLoanForm({ ...loanForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-700 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Plazo (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={loanForm.termMonths}
                    onChange={(e) => setLoanForm({ ...loanForm, termMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Interés (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={loanForm.interestRate}
                    onChange={(e) => setLoanForm({ ...loanForm, interestRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-amber-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Observaciones / Destino</label>
                <textarea
                  rows={2}
                  placeholder="Compra de mercadería, capital de trabajo, etc."
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow"
                >
                  Otorgar Préstamo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Cobranza */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 uppercase mb-4">Registrar Cobranza / Amortización</h2>

            <form onSubmit={handleCreateCollection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Préstamo a Amortizar *</label>
                <select
                  required
                  value={collectionForm.loanId}
                  onChange={(e) => setCollectionForm({ ...collectionForm, loanId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Préstamo --</option>
                  {loans
                    .filter((l) => l.status !== 'CANCELADO')
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.orderNumber} - {l.borrowerName} (Saldo: S/ {l.totalAmount})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción de la Cuota *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Amortización Cuota 1"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm({ ...collectionForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Abono Capital (S/) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={collectionForm.principalAmount}
                    onChange={(e) => setCollectionForm({ ...collectionForm, principalAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Interés (S/) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={collectionForm.interestAmount}
                    onChange={(e) => setCollectionForm({ ...collectionForm, interestAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-900">Total a Cobrar:</span>
                <span className="text-base font-black text-emerald-800 font-mono">
                  S/ {(Number(collectionForm.principalAmount) + Number(collectionForm.interestAmount)).toFixed(2)}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 text-xs hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow"
                >
                  Registrar Cobranza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket de Cobranza Imprimible POS */}
      {printReceiptData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <FileCheck2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-800 uppercase">Cobranza Registrada</h3>
              <p className="text-xs text-slate-500 font-mono">{printReceiptData.orderNumber}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 py-3 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Titular:</span>
                <span className="font-bold text-slate-800">{printReceiptData.borrowerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Concepto:</span>
                <span className="text-slate-700">{printReceiptData.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Capital:</span>
                <span className="font-mono font-bold">S/ {Number(printReceiptData.principalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interés:</span>
                <span className="font-mono font-bold text-amber-600">S/ {Number(printReceiptData.interestAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100 font-black text-sm">
                <span>TOTAL:</span>
                <span className="text-emerald-700 font-mono">S/ {Number(printReceiptData.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setPrintReceiptData(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
