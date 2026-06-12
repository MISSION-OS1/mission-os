// app/products/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  sales_count: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالات Modal الإضافة
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', cost: '', category: 'T-Shirt', stock: '' });

  // حالات Modal التعديل (Edit)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 📝 فتح نافذة التعديل وملء البيانات تلقائياً
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  // 💾 حفظ التعديلات في السيرفر
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        price: parseFloat(editingProduct.price.toString()),
        cost: parseFloat(editingProduct.cost.toString()),
        category: editingProduct.category,
        stock: parseInt(editingProduct.stock.toString()),
      })
      .eq('id', editingProduct.id);

    if (error) {
      console.error(error);
      alert('Failed to update product');
    } else {
      setIsEditModalOpen(false);
      setEditingProduct(null);
      fetchProducts(); // تحديث القائمة
    }
    setIsSubmitting(false);
  };

  // 🗑️ دالة مسح المنتج نهائياً بعد التأكيد
  const handleDeleteProduct = async (id: number, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}" from MISSION inventory?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error(error);
      alert('Cannot delete product. It might be linked to existing orders.');
    } else {
      fetchProducts();
    }
  };

  // دالة إضافة منتج جديد
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { name, price, cost, category, stock } = formData;

    const { error } = await supabase.from('products').insert([
      { name, price: parseFloat(price), cost: parseFloat(cost), category, stock: parseInt(stock), sales_count: 0 }
    ]);

    if (!error) {
      setIsAddModalOpen(false);
      setFormData({ name: '', price: '', cost: '', category: 'T-Shirt', stock: '' });
      fetchProducts();
    }
    setIsSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* هيدر الصفحة */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Products</h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">Manage MISSION clothing catalog, stock numbers, and pricing.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors text-center">
            + Add Product
          </button>
        </div>

        {/* عرض المنتجات */}
        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading inventory status...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">
            No products in stock yet.
          </div>
        ) : (
          <>
            {/* 📱 عرض الموبايل (Cards) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {products.map((product) => (
                <div key={product.id} className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white text-base">{product.name}</h3>
                      <p className="text-xs text-zinc-500 uppercase mt-0.5">{product.category}</p>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded font-medium ${product.stock <= 5 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-900 text-zinc-400'}`}>
                      {product.stock} left
                    </span>
                  </div>
                  <div className="border-t border-zinc-900 pt-3 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="text-white font-medium">Price: EGP {product.price}</p>
                      <p className="text-zinc-500">Cost: EGP {product.cost}</p>
                    </div>
                    {/* أزرار التحكم في الموبايل */}
                    <div className="flex space-x-2">
                      <button onClick={() => openEditModal(product)} className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 hover:text-white">📝</button>
                      <button onClick={() => handleDeleteProduct(product.id, product.name)} className="px-2.5 py-1 bg-red-500/5 border border-red-500/10 rounded text-red-400 hover:bg-red-500/10">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 💻 عرض الكمبيوتر (Table) */}
            <div className="hidden md:block bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/50">
                      <th className="p-4">Product</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-right">Cost</th>
                      <th className="p-4 text-center">Stock</th>
                      <th className="p-4 text-center">Sales</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-4 font-semibold text-white">{product.name}</td>
                        <td className="p-4 text-zinc-500 uppercase text-xs">{product.category}</td>
                        <td className="p-4 text-right font-mono text-white">EGP {product.price}</td>
                        <td className="p-4 text-right font-mono text-zinc-500">EGP {product.cost}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${product.stock <= 5 ? 'bg-red-500/10 text-red-500' : 'text-zinc-400'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-zinc-400">{product.sales_count || 0}</td>
                        <td className="p-4 text-right space-x-2">
                          {/* 📝 زرار التعديل */}
                          <button onClick={() => openEditModal(product)} className="text-zinc-400 hover:text-white transition-colors text-xs border border-zinc-800 bg-zinc-950 px-2 py-1 rounded-md">
                            Edit 📝
                          </button>
                          {/* 🗑️ زرار المسح */}
                          <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-red-400 hover:text-red-300 transition-colors text-xs border border-red-500/10 bg-red-500/5 px-2 py-1 rounded-md">
                            Delete 🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* 📋 نافذة إضافة منتج جديد (Add Product Modal) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Add New Product</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Product Name *</label>
                  <input type="text" required placeholder="e.g., Heavyweight Oversized Tee" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Price (EGP) *</label>
                    <input type="number" required placeholder="650" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Cost (EGP) *</label>
                    <input type="number" required placeholder="250" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
                      <option value="T-Shirt">T-Shirt</option>
                      <option value="Hoodie">Hoodie</option>
                      <option value="Pants">Pants</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Stock Qty *</label>
                    <input type="number" required placeholder="50" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                  </div>
                </div>
                <div className="pt-2 flex space-x-3 justify-end text-sm">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 disabled:bg-zinc-600">{isSubmitting ? 'Adding...' : 'Save Product'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 📋 نافذة تعديل المنتج (Edit Product Modal) */}
        {isEditModalOpen && editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Edit Product</h2>
                <button onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Product Name *</label>
                  <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Price (EGP) *</label>
                    <input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Cost (EGP) *</label>
                    <input type="number" required value={editingProduct.cost} onChange={(e) => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value) || 0})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Category</label>
                    <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
                      <option value="T-Shirt">T-Shirt</option>
                      <option value="Hoodie">Hoodie</option>
                      <option value="Pants">Pants</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Stock Qty *</label>
                    <input type="number" required value={editingProduct.stock} onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                  </div>
                </div>
                <div className="pt-2 flex space-x-3 justify-end text-sm">
                  <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 disabled:bg-zinc-600">{isSubmitting ? 'Saving...' : 'Update Product'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}