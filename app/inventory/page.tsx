'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

const SIZES = ['One Size', 'S', 'M', 'L', 'XL', 'XXL'];

interface Variant {
  id: number;
  product_id: number;
  color: string;
  size: string;
  stock: number;
  product_name?: string;
  product_category?: string;
  product_cost?: number;
  product_price?: number;
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [restockModal, setRestockModal] = useState<Variant | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_variants')
      .select('*, products(name, category, cost, price)')
      .order('product_id');

    if (data) {
      setVariants(data.map((v: any) => ({
        ...v,
        product_name: v.products?.name,
        product_category: v.products?.category,
        product_cost: v.products?.cost,
        product_price: v.products?.price,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRestock = async () => {
    if (!restockModal) return;
    const qty = parseInt(restockQty);
    if (isNaN(qty) || qty <= 0) return;
    const newStock = restockModal.stock + qty;
    await supabase.from('product_variants').update({ stock: newStock }).eq('id', restockModal.id);
    // حدث الـ stock الكلي في products
    const productVariants = variants.filter(v => v.product_id === restockModal.product_id);
    const newTotal = productVariants.reduce((s, v) => s + (v.id === restockModal.id ? newStock : v.stock), 0);
    await supabase.from('products').update({ stock: newTotal }).eq('id', restockModal.product_id);
    setRestockModal(null);
    setRestockQty('');
    fetchData();
  };

  // تجميع الـ variants حسب المنتج
  const productIds = [...new Set(variants.map(v => v.product_id))];
  const groupedByProduct = productIds.map(pid => {
    const pvs = variants.filter(v => v.product_id === pid);
    return {
      product_id: pid,
      product_name: pvs[0]?.product_name || '',
      product_category: pvs[0]?.product_category || '',
      product_cost: pvs[0]?.product_cost || 0,
      product_price: pvs[0]?.product_price || 0,
      totalStock: pvs.reduce((s, v) => s + v.stock, 0),
      variants: pvs,
    };
  });

  const filtered = groupedByProduct.filter(p => {
    const matchSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLow = showLowStockOnly ? p.totalStock <= 5 : true;
    return matchSearch && matchLow;
  });

  const totalItemsInStock  = variants.reduce((s, v) => s + v.stock, 0);
  const totalInventoryCost = variants.reduce((s, v) => s + (v.stock * (v.product_cost || 0)), 0);
  const potentialRevenue   = variants.reduce((s, v) => s + (v.stock * (v.product_price || 0)), 0);
  const lowStockAlerts     = groupedByProduct.filter(p => p.totalStock <= 5).length;

  const stockBadge = (stock: number) => {
    if (stock === 0) return 'bg-red-500/20 text-red-500 border border-red-500/30';
    if (stock <= 3)  return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    return 'bg-zinc-900 text-zinc-400 border border-zinc-800';
  };

  const colors = (pvs: Variant[]) => [...new Set(pvs.map(v => v.color))];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
          <p className="text-zinc-500 text-sm mt-1">Stock by variant — color and size.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase">Total in Stock</p>
            <p className="text-xl font-bold text-white font-mono mt-1">{totalItemsInStock} <span className="text-xs text-zinc-500 font-sans">pcs</span></p>
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
            <p className={`text-xl font-bold mt-1 ${lowStockAlerts > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{lowStockAlerts} <span className="text-xs font-sans font-normal text-zinc-500">items</span></p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <input type="text" placeholder="Search products..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 placeholder-zinc-600" />
          <button onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`w-full sm:w-auto text-xs font-medium px-4 py-2 rounded-lg border transition-colors ${showLowStockOnly ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'}`}>
            {showLowStockOnly ? 'Showing: Low Stock ⚠️' : 'Filter: All Items'}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">No items found.</div>
        ) : (
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider bg-zinc-950/50">
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">Total Stock</th>
                    <th className="p-4 text-right">Cost/Unit</th>
                    <th className="p-4 text-right">Asset Value</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-zinc-300">
                  {filtered.map((p) => (
                    <React.Fragment key={p.product_id}>
                      <tr className="border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4 font-semibold text-white">{p.product_name}</td>
                        <td className="p-4 text-zinc-500 uppercase text-xs">{p.product_category}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-medium ${p.totalStock === 0 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : p.totalStock <= 5 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-900 text-zinc-400'}`}>
                            {p.totalStock} pcs
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-zinc-500">EGP {p.product_cost}</td>
                        <td className="p-4 text-right font-mono text-white font-medium">EGP {(p.totalStock * p.product_cost).toLocaleString()}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => setExpandedProduct(expandedProduct === p.product_id ? null : p.product_id)}
                            className="text-xs bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                            {expandedProduct === p.product_id ? '▲ Hide' : '▼ Variants'}
                          </button>
                        </td>
                      </tr>
                      {expandedProduct === p.product_id && (
                        <tr className="border-b border-zinc-800/60 bg-zinc-950/50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="space-y-4">
                              {colors(p.variants).map(color => (
                                <div key={color}>
                                  <p className="text-xs text-zinc-400 font-semibold mb-2">{color}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {SIZES.map(size => {
                                      const v = p.variants.find(vv => vv.color === color && vv.size === size);
                                      if (!v) return null;
                                      return (
                                        <div key={size} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${stockBadge(v.stock)}`}>
                                          <span className="text-zinc-500 font-medium">{size}</span>
                                          <span className="font-bold font-mono">{v.stock}</span>
                                          <button onClick={() => { setRestockModal(v); setRestockQty(''); }}
                                            className="ml-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-1.5 py-0.5 rounded transition-colors text-zinc-300">
                                            +
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-zinc-800">
              {filtered.map((p) => (
                <div key={p.product_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white">{p.product_name}</p>
                      <p className="text-xs text-zinc-500 uppercase mt-0.5">{p.product_category}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-mono font-medium ${p.totalStock === 0 ? 'bg-red-500/20 text-red-500 border border-red-500/30' : p.totalStock <= 5 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-900 text-zinc-400'}`}>
                      {p.totalStock} pcs
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center border-t border-zinc-800 pt-3">
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase">Cost/Unit</p>
                      <p className="text-sm font-mono text-zinc-400 mt-0.5">EGP {p.product_cost}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase">Asset Value</p>
                      <p className="text-sm font-mono text-white mt-0.5">EGP {(p.totalStock * p.product_cost).toLocaleString()}</p>
                    </div>
                  </div>
                  <button onClick={() => setExpandedProduct(expandedProduct === p.product_id ? null : p.product_id)}
                    className="w-full py-2 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg transition-colors">
                    {expandedProduct === p.product_id ? '▲ Hide Variants' : '▼ Show Variants'}
                  </button>
                  {expandedProduct === p.product_id && (
                    <div className="space-y-3 border-t border-zinc-800 pt-3">
                      {colors(p.variants).map(color => (
                        <div key={color}>
                          <p className="text-xs text-zinc-400 font-medium mb-2">{color}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SIZES.map(size => {
                              const v = p.variants.find(vv => vv.color === color && vv.size === size);
                              if (!v) return null;
                              return (
                                <button key={size} onClick={() => { setRestockModal(v); setRestockQty(''); }}
                                  className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border font-mono transition-colors ${stockBadge(v.stock)}`}>
                                  <span className="text-zinc-500">{size}</span>
                                  <span className="font-bold">{v.stock}</span>
                                  <span className="text-[9px] opacity-60">+</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restock Modal */}
        {restockModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Restock</h2>
                <button onClick={() => setRestockModal(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm">
                <p className="text-white font-semibold">{restockModal.product_name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">{restockModal.color} · {restockModal.size} · currently {restockModal.stock} pcs</p>
              </div>
              <input type="number" min="1" placeholder="How many pieces to add?" value={restockQty}
                onChange={(e) => setRestockQty(e.target.value)} autoFocus
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
              {restockQty && parseInt(restockQty) > 0 && (
                <p className="text-xs text-emerald-400">New stock: {restockModal.stock + parseInt(restockQty)} pcs</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setRestockModal(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleRestock} disabled={!restockQty || parseInt(restockQty) <= 0}
                  className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold disabled:opacity-40">Confirm</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
