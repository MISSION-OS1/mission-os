// app/inventory/page.tsx
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

  const fetchInventoryData = async () => {
    setLoading(true);
    // جلب المنتجات وترتيبها من الأقل في المخزن للأعلى عشان النواقص تظهر الأول
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, price, cost, stock')
      .order('stock', { ascending: true });

    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // دالة تحديث السريع للمخزن (Restock) من غير ما تفتح صفحة التعديل
  const handleQuickRestock = async (id: number, currentStock: number, name: string) => {
    const amount = prompt(`How many pieces do you want to ADD to "${name}" stock?`);
    if (amount === null) return; // إلغاء

    const qtyToAdd = parseInt(amount);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      alert('Please enter a valid positive number.');
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ stock: currentStock + qtyToAdd })
      .eq('id', id);

    if (error) {
      alert('Failed to update stock');
    } else {
      fetchInventoryData(); // تحديث الداتا
    }
  };

  // الحسابات الإحصائية للمخزن
  const totalItemsInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalInventoryCost = products.reduce((sum, p) => sum + (p.stock * p.cost), 0); // رأس المال اللي في المخزن
  const potentialRevenue = products.reduce((sum, p) => sum + (p.stock * p.price), 0); // القيمة السوقية للبضاعة
  const lowStockAlerts = products.filter(p => p.stock <= 5).length;

  // الفلترة والبحث
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLowStock = showLowStockOnly ? p.stock <= 5 : true;
    return matchesSearch && matchesLowStock;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* الهيدر */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Inventory</h1>
          <p className="text-zinc-500 text-sm mt-1">Real-time stock valuation, asset tracking, and restock alerts.</p>
        </div>

        {/* كروت الإحصائيات السريعة للمخزن */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Total Items in Stock</p>
            <p className="text-2xl font-bold text-white font-mono mt-1">{totalItemsInStock} <span className="text-xs text-zinc-500 font-sans font-normal">pcs</span></p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Inventory Value (Cost)</p>
            <p className="text-2xl font-bold text-white font-mono mt-1">EGP {totalInventoryCost.toLocaleString()}</p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Potential Revenue</p>
            <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">EGP {potentialRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase">Low Stock Alerts</p>
            <p className={`text-2xl font-bold mt-1 ${lowStockAlerts > 0 ? 'text-red-400' : 'text-zinc-400'}`}>{lowStockAlerts} <span className="text-xs font-sans font-normal text-zinc-500">items</span></p>
          </div>
        </div>

        {/* أدوات البحث والفلترة */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <input
            type="text"
            placeholder="Search stock items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`w-full sm:w-auto text-xs font-medium px-4 py-2 rounded-lg border transition-colors ${
              showLowStockOnly 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {showLowStockOnly ? 'Showing: Low Stock ⚠️' : 'Filter: All Items'}
          </button>
        </div>

        {/* الجدول */}
        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Calculating warehouse assets...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">
            No inventory items found.
          </div>
        ) : (
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/50">
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">Stock Status</th>
                  <th className="p-4 text-right">Cost per Unit</th>
                  <th className="p-4 text-right">Total Asset Value</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                {filteredProducts.map((product) => {
                  const isLow = product.stock <= 5;
                  const isOut = product.stock === 0;
                  const totalValue = product.stock * product.cost;

                  return (
                    <tr key={product.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4 font-semibold text-white">{product.name}</td>
                      <td className="p-4 text-zinc-500 uppercase text-xs">{product.category}</td>
                      
                      {/* حالة المخزون بالألوان */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-medium ${
                          isOut ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                          isLow ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                          'bg-zinc-900 text-zinc-400'
                        }`}>
                          {product.stock} pcs {isOut ? '(Out)' : isLow ? '(Low)' : '(OK)'}
                        </span>
                      </td>

                      <td className="p-4 text-right font-mono text-zinc-500">EGP {product.cost}</td>
                      <td className="p-4 text-right font-mono text-white font-medium">EGP {totalValue.toLocaleString()}</td>
                      
                      {/* زرار تزويد سريع للمخزن */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleQuickRestock(product.id, product.stock, product.name)}
                          className="text-xs bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-white px-2.5 py-1 rounded transition-colors"
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
        )}

      </div>
    </DashboardLayout>
  );
}