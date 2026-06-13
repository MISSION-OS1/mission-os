'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Order {
  net_profit: number;
  total_price: number;
  shipping_price: number;
  status: string;
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  created_at: string;
}

const categories = ['Marketing', 'Packaging', 'Shipping', 'Salaries', 'Others'];
const categoryLabel: Record<string, string> = {
  Marketing: '📢 Marketing / Ads',
  Packaging: '📦 Packaging Material',
  Shipping:  '🚚 Logistics / Shipping',
  Salaries:  '👥 Salaries & Commissions',
  Others:    '🛠️ Others / Overhead',
};

export default function FinancePage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const emptyForm = { title: '', amount: '', category: 'Marketing' };
  const [formData, setFormData] = useState(emptyForm);

  const fetchFinanceData = async () => {
    setLoading(true);
    const [{ data: ordersData }, { data: expensesData }] = await Promise.all([
      supabase.from('orders').select('net_profit, total_price, shipping_price, status'),
      supabase.from('expenses').select('*').order('id', { ascending: false }),
    ]);
    if (ordersData)   setOrders(ordersData);
    if (expensesData) setExpenses(expensesData);
    setLoading(false);
  };

  useEffect(() => { fetchFinanceData(); }, []);

  const openNew = () => { setEditingExpense(null); setFormData(emptyForm); setIsModalOpen(true); };
  const openEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({ title: exp.title, amount: exp.amount.toString(), category: exp.category });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;
    setIsSubmitting(true);
    const payload = { title: formData.title, amount: parseFloat(formData.amount), category: formData.category };
    if (editingExpense) {
      await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
    } else {
      await supabase.from('expenses').insert([payload]);
    }
    setIsModalOpen(false); setFormData(emptyForm); setEditingExpense(null); setIsSubmitting(false);
    fetchFinanceData();
  };

  const handleDelete = async (id: number) => {
    await supabase.from('expenses').delete().eq('id', id);
    setDeleteConfirmId(null);
    fetchFinanceData();
  };

  const activeOrders  = orders.filter(o => o.status?.toLowerCase() !== 'canceled');
  const totalRevenue  = activeOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const totalShipping = activeOrders.reduce((s, o) => s + (o.shipping_price || 0), 0);
  const grossProfit   = activeOrders.reduce((s, o) => s + (o.net_profit || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit     = grossProfit - totalExpenses;

  const inputClass = "w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Financial Statement</h1>
            <p className="text-zinc-500 text-sm mt-1">Track your true net profit, expenses, and cash flow.</p>
          </div>
          <button onClick={openNew} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap">
            − Record Expense
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total Revenue</p>
            <p className="text-xl font-bold text-white font-mono">EGP {totalRevenue.toLocaleString()}</p>
            <p className="text-[11px] text-zinc-600">Active orders only</p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Gross Profit</p>
            <p className="text-xl font-bold text-white font-mono">EGP {grossProfit.toLocaleString()}</p>
            <p className="text-[11px] text-zinc-600">After shipping EGP {totalShipping.toLocaleString()}</p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total Expenses</p>
            <p className="text-xl font-bold text-red-400 font-mono">EGP {totalExpenses.toLocaleString()}</p>
            <p className="text-[11px] text-zinc-600">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
          </div>
          <div className={`border rounded-xl p-4 space-y-1 ${netProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase">Net Profit</p>
            <p className={`text-xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>EGP {netProfit.toLocaleString()}</p>
            <p className="text-[11px] text-zinc-500">Gross − Expenses</p>
          </div>
        </div>

        {/* Expenses */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Expenses Ledger</h2>

          {loading ? (
            <div className="text-sm text-zinc-500">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center text-zinc-600 py-12 border border-zinc-800 rounded-xl bg-[#09090b] text-sm">No expenses recorded yet.</div>
          ) : (
            <>
              {/* ===== MOBILE: Cards ===== */}
              <div className="flex flex-col gap-3 md:hidden">
                {expenses.map((exp) => (
                  <div key={exp.id} className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white text-sm">{exp.title}</p>
                        <span className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 mt-1 inline-block">{exp.category}</span>
                      </div>
                      <p className="text-red-400 font-mono font-bold text-sm">− EGP {exp.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <p className="text-xs text-zinc-500">
                        {new Date(exp.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(exp)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                        <button onClick={() => setDeleteConfirmId(exp.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg font-medium transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== DESKTOP: Table ===== */}
              <div className="hidden md:block bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider bg-zinc-950/50">
                      <th className="p-4">Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-right">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-4 font-medium text-white">{exp.title}</td>
                        <td className="p-4"><span className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">{exp.category}</span></td>
                        <td className="p-4 text-right text-red-400 font-mono font-medium">− EGP {exp.amount.toLocaleString()}</td>
                        <td className="p-4 text-right text-zinc-500 text-xs">
                          {new Date(exp.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openEdit(exp)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                            <button onClick={() => setDeleteConfirmId(exp.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg font-medium transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirm */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Delete Expense?</h2>
              <p className="text-sm text-zinc-400">This will affect your net profit calculation.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">{editingExpense ? 'Edit Expense' : 'Record New Expense'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Title *</label>
                  <input type="text" required placeholder="e.g., Instagram Ads" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Amount (EGP) *</label>
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                      <button key={cat} type="button" onClick={() => setFormData({ ...formData, category: cat })}
                        className={`py-2 px-3 rounded-lg text-xs font-medium text-left transition-colors border ${formData.category === cat ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}>
                        {categoryLabel[cat]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Deduct From Profit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
