'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Order {
  id: number;
  net_profit: number;
  total_price: number;
  status: string;
  quantity: number;
  product_id: number;
  created_at: string;
  products?: { cost: number };
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  created_at: string;
}

interface AdditionalCostItem {
  id: number;
  title: string;
  amount: number;
  drop_id: number;
}

interface MonthlyAdjustment {
  id: number;
  drop_id: number;
  month: string;
  ads_percent: number;
  returns_percent: number;
}

const expenseCategories = ['Marketing', 'Packaging', 'Shipping', 'Salaries', 'Others'];
const categoryLabel: Record<string, string> = {
  Marketing: '📢 Marketing / Ads',
  Packaging: '📦 Packaging Material',
  Shipping:  '🚚 Logistics / Shipping',
  Salaries:  '👥 Salaries & Commissions',
  Others:    '🛠️ Others / Overhead',
};

const MONTHS = [
  { value: '01', label: 'January' },  { value: '02', label: 'February' },
  { value: '03', label: 'March' },    { value: '04', label: 'April' },
  { value: '05', label: 'May' },      { value: '06', label: 'June' },
  { value: '07', label: 'July' },     { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

export default function FinancePage() {
  const router = useRouter();
  const [dropId, setDropId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<AdditionalCostItem[]>([]);
  const [monthlyAdjustments, setMonthlyAdjustments] = useState<MonthlyAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExpenseSubmitting, setIsExpenseSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<number | null>(null);
  const emptyExpenseForm = { title: '', amount: '', category: 'Marketing' };
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  // Additional cost modal
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isCostSubmitting, setIsCostSubmitting] = useState(false);
  const [editingCost, setEditingCost] = useState<AdditionalCostItem | null>(null);
  const [deleteCostId, setDeleteCostId] = useState<number | null>(null);
  const emptyCostForm = { title: '', amount: '' };
  const [costForm, setCostForm] = useState(emptyCostForm);

  // Monthly adjustment modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [isAdjSubmitting, setIsAdjSubmitting] = useState(false);
  const [editingAdj, setEditingAdj] = useState<MonthlyAdjustment | null>(null);
  const [deleteAdjId, setDeleteAdjId] = useState<number | null>(null);
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const emptyAdjForm = { year: currentYear, month: currentMonth, ads_percent: '0', returns_percent: '0' };
  const [adjForm, setAdjForm] = useState(emptyAdjForm);

  const inputClass = "w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors placeholder-zinc-600";

  useEffect(() => {
    const savedDropId = localStorage.getItem('selectedDropId');
    if (!savedDropId) { router.replace('/drops'); return; }
    setDropId(parseInt(savedDropId));
  }, [router]);

  const fetchData = async () => {
    if (!dropId) return;
    setLoading(true);
    const [{ data: ordersData }, { data: expensesData }, { data: costsData }, { data: productsData }, { data: adjData }] = await Promise.all([
      supabase.from('orders').select('id, net_profit, total_price, status, quantity, product_id, created_at').eq('drop_id', dropId),
      supabase.from('expenses').select('*').eq('drop_id', dropId).order('id', { ascending: false }),
      supabase.from('additional_costs').select('*').eq('drop_id', dropId).order('id', { ascending: true }),
      supabase.from('products').select('id, cost').eq('drop_id', dropId),
      supabase.from('monthly_adjustments').select('*').eq('drop_id', dropId).order('month', { ascending: false }),
    ]);
    if (expensesData) setExpenses(expensesData);
    if (costsData) setAdditionalCosts(costsData);
    if (adjData) setMonthlyAdjustments(adjData);
    if (ordersData && productsData) {
      const enriched = ordersData.map((o: any) => ({
        ...o,
        products: productsData.find((p: any) => p.id === o.product_id) || null,
      }));
      setOrders(enriched);
    }
    setLoading(false);
  };

  useEffect(() => { if (dropId) fetchData(); }, [dropId]);

  // ===== Expense handlers =====
  const openNewExpense = () => { setEditingExpense(null); setExpenseForm(emptyExpenseForm); setIsExpenseModalOpen(true); };
  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseForm({ title: exp.title, amount: exp.amount.toString(), category: exp.category });
    setIsExpenseModalOpen(true);
  };
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || !dropId) return;
    setIsExpenseSubmitting(true);
    const payload = { title: expenseForm.title, amount: parseFloat(expenseForm.amount), category: expenseForm.category, drop_id: dropId };
    if (editingExpense) {
      await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
    } else {
      await supabase.from('expenses').insert([payload]);
    }
    setIsExpenseModalOpen(false); setExpenseForm(emptyExpenseForm); setEditingExpense(null); setIsExpenseSubmitting(false);
    fetchData();
  };
  const handleExpenseDelete = async (id: number) => {
    await supabase.from('expenses').delete().eq('id', id);
    setDeleteExpenseId(null);
    fetchData();
  };

  // ===== Additional Cost handlers =====
  const openNewCost = () => { setEditingCost(null); setCostForm(emptyCostForm); setIsCostModalOpen(true); };
  const openEditCost = (cost: AdditionalCostItem) => {
    setEditingCost(cost);
    setCostForm({ title: cost.title, amount: cost.amount.toString() });
    setIsCostModalOpen(true);
  };
  const handleCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costForm.title || !costForm.amount || !dropId) return;
    setIsCostSubmitting(true);
    const payload = { title: costForm.title, amount: parseFloat(costForm.amount), drop_id: dropId };
    if (editingCost) {
      await supabase.from('additional_costs').update(payload).eq('id', editingCost.id);
    } else {
      await supabase.from('additional_costs').insert([payload]);
    }
    setIsCostModalOpen(false); setCostForm(emptyCostForm); setEditingCost(null); setIsCostSubmitting(false);
    fetchData();
  };
  const handleCostDelete = async (id: number) => {
    await supabase.from('additional_costs').delete().eq('id', id);
    setDeleteCostId(null);
    fetchData();
  };

  // ===== Monthly Adjustment handlers =====
  const openNewAdj = () => { setEditingAdj(null); setAdjForm(emptyAdjForm); setIsAdjModalOpen(true); };
  const openEditAdj = (adj: MonthlyAdjustment) => {
    setEditingAdj(adj);
    const [year, month] = adj.month.split('-');
    setAdjForm({ year, month, ads_percent: adj.ads_percent.toString(), returns_percent: adj.returns_percent.toString() });
    setIsAdjModalOpen(true);
  };
  const handleAdjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropId) return;
    setIsAdjSubmitting(true);
    const monthKey = `${adjForm.year}-${adjForm.month}`;
    const payload = {
      drop_id: dropId,
      month: monthKey,
      ads_percent: parseFloat(adjForm.ads_percent) || 0,
      returns_percent: parseFloat(adjForm.returns_percent) || 0,
    };
    if (editingAdj) {
      await supabase.from('monthly_adjustments').update(payload).eq('id', editingAdj.id);
    } else {
      await supabase.from('monthly_adjustments').upsert([payload], { onConflict: 'drop_id,month' });
    }
    setIsAdjModalOpen(false); setAdjForm(emptyAdjForm); setEditingAdj(null); setIsAdjSubmitting(false);
    fetchData();
  };
  const handleAdjDelete = async (id: number) => {
    await supabase.from('monthly_adjustments').delete().eq('id', id);
    setDeleteAdjId(null);
    fetchData();
  };

  // ===== Calculations =====
  const activeOrders = orders.filter(o => o.status?.toLowerCase() !== 'canceled');
  const totalRevenue = activeOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const grossProfit = activeOrders.reduce((s, o) => {
    const cogs = (o.products?.cost || 0) * (o.quantity || 1);
    return s + ((o.total_price || 0) - cogs);
  }, 0);
  const baseNetProfit = orders.reduce((s, o) => s + (o.net_profit || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalPerOrder = additionalCosts.reduce((s, c) => s + (c.amount || 0), 0);

  // حساب الـ monthly adjustments — كل شهر بياخد % من الـ net profit بتاعه
  const totalAdjDeductions = monthlyAdjustments.reduce((s, adj) => {
    const monthOrders = activeOrders.filter(o => o.created_at?.startsWith(adj.month));
    const monthNetProfit = monthOrders.reduce((ms, o) => ms + (o.net_profit || 0), 0);
    const adsDeduction = (adj.ads_percent / 100) * monthNetProfit;
    const returnsDeduction = (adj.returns_percent / 100) * monthNetProfit;
    return s + adsDeduction + returnsDeduction;
  }, 0);

  const totalNetProfit = baseNetProfit - totalAdjDeductions;

  const monthLabel = (monthKey: string) => {
    const [year, m] = monthKey.split('-');
    const monthName = MONTHS.find(mo => mo.value === m)?.label || m;
    return `${monthName} ${year}`;
  };

  if (!dropId) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Finance</h1>
            <p className="text-zinc-500 text-sm mt-1">Revenue, profit, and all recorded expenses.</p>
          </div>
          <button onClick={openNewExpense} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap">
            − Record Expense
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading...</div>
        ) : (
          <>
            {/* ===== Summary Cards ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Revenue</p>
                <p className="text-xl font-bold text-white font-mono">EGP {totalRevenue.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-600">{activeOrders.length} active orders</p>
              </div>
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Gross Profit</p>
                <p className={`text-xl font-bold font-mono ${grossProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                  EGP {grossProfit.toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-600">Price − factory cost</p>
              </div>
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Expenses</p>
                <p className="text-xl font-bold text-red-400 font-mono">− EGP {totalExpenses.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-600">{expenses.length} recorded</p>
              </div>
              <div className={`col-span-2 md:col-span-1 border rounded-xl p-4 space-y-1 ${totalNetProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Net Profit</p>
                <p className={`text-xl font-black font-mono ${totalNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  EGP {totalNetProfit.toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-600">After all deductions</p>
              </div>
            </div>

            {/* ===== Monthly Adjustments ===== */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Monthly Adjustments</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Ads & returns % applied per month on net profit</p>
                </div>
                <button onClick={openNewAdj}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
                  + Add Month
                </button>
              </div>
              {monthlyAdjustments.length === 0 ? (
                <div className="text-center text-zinc-600 py-10 text-sm">No monthly adjustments yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800/40">
                  {monthlyAdjustments.map((adj) => {
                    const monthOrders = activeOrders.filter(o => o.created_at?.startsWith(adj.month));
                    const monthNetProfit = monthOrders.reduce((s, o) => s + (o.net_profit || 0), 0);
                    const adsDeduction = (adj.ads_percent / 100) * monthNetProfit;
                    const returnsDeduction = (adj.returns_percent / 100) * monthNetProfit;
                    const totalDeduction = adsDeduction + returnsDeduction;
                    return (
                      <div key={adj.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{monthLabel(adj.month)}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {monthOrders.length} orders · Net EGP {monthNetProfit.toLocaleString()}
                            <span className="mx-1.5">·</span>
                            Ads {adj.ads_percent}% · Returns {adj.returns_percent}%
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-sm font-mono text-red-400 font-medium">− EGP {totalDeduction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditAdj(adj)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg transition-colors">Edit</button>
                            <button onClick={() => setDeleteAdjId(adj.id)}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors">Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/40">
                    <p className="text-sm font-bold text-white">Total Adjustments</p>
                    <p className="text-sm font-bold text-red-400 font-mono">− EGP {totalAdjDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ===== Additional Cost per Order ===== */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Additional Cost per Order</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Fixed items added per order (packaging, card, etc.)</p>
                </div>
                <button onClick={openNewCost}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap">
                  + Add Item
                </button>
              </div>
              {additionalCosts.length === 0 ? (
                <div className="text-center text-zinc-600 py-10 text-sm">No items added yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800/40">
                  {additionalCosts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-5 py-3">
                      <p className="text-sm text-zinc-300">{item.title}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-mono text-zinc-300">EGP {item.amount}</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditCost(item)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                          <button onClick={() => setDeleteCostId(item.id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg font-medium transition-colors">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/40">
                    <p className="text-sm font-bold text-white">Total per Order</p>
                    <p className="text-sm font-bold text-white font-mono">EGP {totalPerOrder.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ===== Expenses Ledger ===== */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Expenses Ledger</h2>
              {expenses.length === 0 ? (
                <div className="text-center text-zinc-600 py-12 border border-zinc-800 rounded-xl bg-[#09090b] text-sm">No expenses recorded yet.</div>
              ) : (
                <>
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
                            <button onClick={() => openEditExpense(exp)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                            <button onClick={() => setDeleteExpenseId(exp.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg font-medium transition-colors">Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                                <button onClick={() => openEditExpense(exp)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                                <button onClick={() => setDeleteExpenseId(exp.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg font-medium transition-colors">Delete</button>
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
          </>
        )}

        {/* ===== Delete Adj Confirm ===== */}
        {deleteAdjId !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Delete Adjustment?</h2>
              <p className="text-sm text-zinc-400">This month's ads and returns adjustment will be removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteAdjId(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => handleAdjDelete(deleteAdjId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Delete Cost Confirm ===== */}
        {deleteCostId !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Delete Item?</h2>
              <p className="text-sm text-zinc-400">This item will be removed from the additional costs list.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteCostId(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => handleCostDelete(deleteCostId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Delete Expense Confirm ===== */}
        {deleteExpenseId !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Delete Expense?</h2>
              <p className="text-sm text-zinc-400">This will be removed from the expenses ledger.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteExpenseId(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => handleExpenseDelete(deleteExpenseId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== Monthly Adjustment Modal ===== */}
        {isAdjModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">{editingAdj ? 'Edit Adjustment' : 'Add Monthly Adjustment'}</h2>
                <button onClick={() => setIsAdjModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleAdjSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Year</label>
                    <input type="number" min="2020" max="2099" value={adjForm.year}
                      onChange={(e) => setAdjForm({ ...adjForm, year: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Month</label>
                    <select value={adjForm.month} onChange={(e) => setAdjForm({ ...adjForm, month: e.target.value })} className={inputClass}>
                      {MONTHS.map(m => <option key={m.value} value={m.value} className="bg-zinc-900">{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Ads %</label>
                  <input type="number" min="0" max="100" step="0.1" placeholder="0" value={adjForm.ads_percent}
                    onChange={(e) => setAdjForm({ ...adjForm, ads_percent: e.target.value })} className={inputClass} />
                  <p className="text-[11px] text-zinc-600 mt-1">% من الـ net profit بتاع الشهر ده</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Returns %</label>
                  <input type="number" min="0" max="100" step="0.1" placeholder="0" value={adjForm.returns_percent}
                    onChange={(e) => setAdjForm({ ...adjForm, returns_percent: e.target.value })} className={inputClass} />
                  <p className="text-[11px] text-zinc-600 mt-1">% من الـ net profit بتاع الشهر ده</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAdjModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isAdjSubmitting} className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold disabled:opacity-50">
                    {isAdjSubmitting ? 'Saving...' : editingAdj ? 'Save Changes' : 'Add Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Additional Cost Modal ===== */}
        {isCostModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">{editingCost ? 'Edit Item' : 'Add Cost Item'}</h2>
                <button onClick={() => setIsCostModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleCostSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Item Name *</label>
                  <input type="text" required placeholder="e.g., Packaging Bag" value={costForm.title}
                    onChange={(e) => setCostForm({ ...costForm, title: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Cost (EGP) *</label>
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={costForm.amount}
                    onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} className={inputClass} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsCostModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isCostSubmitting} className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold disabled:opacity-50">
                    {isCostSubmitting ? 'Saving...' : editingCost ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== Expense Modal ===== */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">{editingExpense ? 'Edit Expense' : 'Record New Expense'}</h2>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Title *</label>
                  <input type="text" required placeholder="e.g., Instagram Ads" value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Amount (EGP) *</label>
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {expenseCategories.map(cat => (
                      <button key={cat} type="button" onClick={() => setExpenseForm({ ...expenseForm, category: cat })}
                        className={`py-2 px-3 rounded-lg text-xs font-medium text-left transition-colors border ${expenseForm.category === cat ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'}`}>
                        {categoryLabel[cat]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isExpenseSubmitting} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                    {isExpenseSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Record Expense'}
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
