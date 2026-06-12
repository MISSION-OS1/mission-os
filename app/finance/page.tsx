// app/finance/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Order {
  total_price: number;
  quantity: number;
  products?: { cost: number } | { cost: number }[];
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  created_at: string;
}

export default function FinancePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // فورم إضافة مصروف جديد
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Marketing',
  });

  const fetchFinanceData = async () => {
    setLoading(true);
    
    // 1. جلب بيانات الأوردرات والتكلفة لحساب مجمل الربح
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total_price, quantity, products(cost)');

    // 2. جلب جدول المصاريف بالكامل (تم تصليح السطر هنا وزيادة select)
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*')
      .order('id', { ascending: false });

    // حل مشكلة النوع لـ TypeScript
    if (ordersData) {
      setOrders(ordersData as unknown as Order[]);
    }
    if (expensesData) {
      setExpenses(expensesData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('expenses').insert([
      {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
      },
    ]);

    if (!error) {
      setIsModalOpen(false);
      setFormData({ title: '', amount: '', category: 'Marketing' });
      fetchFinanceData();
    }
    setIsSubmitting(false);
  };

  // --- العمليات الحسابية الذكية ---
  
  // 1. إجمالي المبيعات (Revenue)
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

  // 2. مجمل ربح البضاعة (Gross Profit)
  const grossProfit = orders.reduce((sum, order) => {
    const productCost = Array.isArray(order.products)
      ? (order.products[0]?.cost || 0)
      : (order.products?.cost || 0);

    const orderCost = productCost * (order.quantity || 0);
    const orderProfit = order.total_price - orderCost;
    return sum + orderProfit;
  }, 0);

  // 3. إجمالي المصاريف الخارجية (Total Expenses)
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // 4. صافي الربح النهائي (Net Profit)
  const netProfit = grossProfit - totalExpenses;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* الهيدر */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Financial Statement</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Track your true net profit, corporate expenses, and cash flow.
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            - Record Expense 💸
          </button>
        </div>

        {/* كروت التحليل المالي */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5 space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Gross Profit (Product Sales)</p>
            <p className="text-2xl font-bold text-white font-mono">EGP {grossProfit.toLocaleString()}</p>
            <p className="text-xs text-zinc-600">Total Revenue: EGP {totalRevenue.toLocaleString()}</p>
          </div>

          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5 space-y-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Total Operating Expenses</p>
            <p className="text-2xl font-bold text-red-400 font-mono">EGP {totalExpenses.toLocaleString()}</p>
            <p className="text-xs text-zinc-600">Ads, Packaging, Logistics, etc.</p>
          </div>

          <div className={`border rounded-xl p-5 space-y-1 ${netProfit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <p className="text-xs font-semibold text-zinc-400 uppercase">Net Profit (Actual Earnings)</p>
            <p className={`text-3xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              EGP {netProfit.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500">What actually goes into MISSION's bank account.</p>
          </div>

        </div>

        {/* جدول سجل المصاريف */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Expenses Ledger</h2>
          
          {loading ? (
            <div className="text-sm text-zinc-500">Analyzing cash outlays...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center text-zinc-600 py-12 border border-zinc-800 rounded-xl bg-[#09090b] text-sm">
              No custom expenses recorded yet. Your net profit matches your gross profit.
            </div>
          ) : (
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/50">
                    <th className="p-4">Expense Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4 font-medium text-white">{exp.title}</td>
                      <td className="p-4">
                        <span className="text-xs bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-medium">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-4 text-right text-red-400 font-mono font-medium">
                        - EGP {exp.amount.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-zinc-500 text-xs">
                        {new Date(exp.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal تسجيل جديد للمصاريف */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Record New Expense</h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Expense Title *
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g., Instagram Ads" 
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Amount (EGP) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="0.00" 
                    value={formData.amount} 
                    onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                    className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Category
                  </label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                  >
                    <option value="Marketing">📢 Marketing / Ads</option>
                    <option value="Packaging">📦 Packaging Material</option>
                    <option value="Shipping">🚚 Logistics / Shipping fees</option>
                    <option value="Salaries">👥 Salaries & Commissions</option>
                    <option value="Others">🛠️ Others / Overhead</option>
                  </select>
                </div>
                <div className="pt-2 flex space-x-3 justify-end text-sm">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="px-4 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:bg-zinc-600"
                  >
                    {isSubmitting ? 'Recording...' : 'Deduct From Profit'}
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