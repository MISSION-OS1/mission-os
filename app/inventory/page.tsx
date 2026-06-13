'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [restockModal, setRestockModal] = useState<{ id: number; name: string; stock: number } | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const fetchInventoryData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, category, price, cost, stock')
      .order('stock', { ascending: true });
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchInventoryData(); }, []);

  const handleQuickRestock = async () => {
    if (!restockModal) return;
    const qty = parseInt(restockQty);
    if (isNaN(qty) || qty <= 0) return;
    await supabase.from('products').update({ stock: restockModal.stock + qty }).eq('id', restockModal.id);
    setRestockModal(null);
    setRestockQty('');
    fetchInventoryData();
  };

  const totalItemsInStock  = products.reduce((s, p) => s + p.stock, 0);
  const totalInventoryCost = products.reduce((s, p) => s + (p.stock * p.cost), 0);
  const potentialRevenue   = products.reduce((s, p) => s + (p.stock * p.price), 0);
  const lowStockAlerts     = products.filter(p => p.stock <= 5).length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch   = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = showLowStockOnly ? p.stock <= 5 : true;
    return matchesSearch && matchesLowStock;
  });

  const stockBadge = (stock: number) => {
    if (stock === 0) return 'bg-red-500/20 text-red-500 border border-red-500/30';
    if (stock <= 5)  return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    return 'bg-zinc-900 text-zinc-400';
  };
  const stockLabel = (stock: number) => stock === 0 ? 'Out' : stock <= 5 ? 'Low' : 'OK';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time stock valuation, asset tracking, and restock alerts.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total in Stock</p>
            <p className="text-xl font-bold text-white font-mono mt-1">{totalItemsInStock} <span className="text-xs text-zinc-500 font-sans font-normal">pcs</span></p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Inventory Cost</p>
            <p className="text-xl font-bold text-white font-mono mt-1">EGP {totalInventoryCost.toLocaleString()}</p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Potential Revenue</p>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-1">EGP {potentialRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Low Stock Alerts</p>
            <p className={`text-xl font-bold mt-1 ${lowStockAlerts > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
              {lowStockAlerts} <span className="text-xs font-sans font-normal text-zinc-500">items</span>
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <input type="text" placeholder="Search stock items..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 placeholder-zinc-600" />
          <button onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`w-full sm:w-auto text-xs font-medium px-4 py-2 rounded-lg border transition-colors ${
              showLowStockOnly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            {showLowStockOnly ? 'Showing: Low Stock ⚠️' : 'Filter: All Items'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Calculating warehouse assets...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">No inventory items found.</div>
        ) : (
          <>
            {/* ===== MOBILE: Cards ===== */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredProducts.map((product) => {
                const isOut = product.stock === 0;
                const isLow = product.stock <= 5;
                const totalValue = product.stock * product.cost;
                return (
                  <div key={product.id} className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3">
                    {/* Row 1: Name + Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-white">{product.name}</p>
                        <p className="text-xs text-zinc-500 uppercase mt-0.5">{product.category}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${stockBadge(product.stock)}`}>
                        {product.stock} pcs · {stockLabel(product.stock)}
                      </span>
                    </div>

                    {/* Row 2: Financials */}
                    <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3 text-center">
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase">Cost/Unit</p>
                        <p className="text-sm font-mono text-zinc-400 mt-0.5">EGP {product.cost}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase">Price</p>
                        <p className="text-sm font-mono text-white mt-0.5">EGP {product.price}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase">Asset Value</p>
                        <p className="text-sm font-mono text-white font-medium mt-0.5">EGP {totalValue.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Row 3: Restock button */}
                    <button
                      onClick={() => { setRestockModal({ id: product.id, name: product.name, stock: product.stock }); setRestockQty(''); }}
                      className="w-full py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg transition-colors"
                    >
                      + Restock 📦
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ===== DESKTOP: Table ===== */}
            <div className="hidden md:block bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider bg-zinc-950/50">
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Stock Status</th>
                    <th className="p-4 text-right">Cost / Unit</th>
                    <th className="p-4 text-right">Total Asset Value</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                  {filteredProducts.map((product) => {
                    const totalValue = product.stock * product.cost;
                    return (
                      <tr key={product.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-4 font-semibold text-white">{product.name}</td>
                        <td className="p-4 text-zinc-500 uppercase text-xs">{product.category}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-medium ${stockBadge(product.stock)}`}>
                            {product.stock} pcs ({stockLabel(product.stock)})
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-500">EGP {product.cost}</td>
                        <td className="p-4 text-right font-mono text-white font-medium">EGP {totalValue.toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => { setRestockModal({ id: product.id, name: product.name, stock: product.stock }); setRestockQty(''); }}
                            className="text-xs bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                            + Restock 📦
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Restock Modal */}
        {restockModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Restock</h2>
                <button onClick={() => setRestockModal(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <p className="text-sm text-zinc-400">
                Adding stock to <span className="text-white font-semibold">{restockModal.name}</span>
                <span className="text-zinc-600 ml-1">(currently {restockModal.stock} pcs)</span>
              </p>
              <input
                type="number"
                min="1"
                placeholder="How many pieces to add?"
                value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                autoFocus
              />
              {restockQty && parseInt(restockQty) > 0 && (
                <p className="text-xs text-emerald-400">New stock: {restockModal.stock + parseInt(restockQty)} pcs</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setRestockModal(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button onClick={handleQuickRestock} disabled={!restockQty || parseInt(restockQty) <= 0}
                  className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold transition-colors disabled:opacity-40">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
