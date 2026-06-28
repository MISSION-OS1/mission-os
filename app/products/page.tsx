'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import VariantEditor, { VariantRow } from '@/components/VariantEditor';

const SIZES = ['One Size', 'S', 'M', 'L', 'XL', 'XXL'];

interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  category: string;
  sales_count: number;
  variants?: VariantRow[];
}

const inputClass = "w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors";

export default function ProductsPage() {
  const router = useRouter();
  const [dropId, setDropId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const emptyForm = { name: '', price: '', cost: '', category: 'T-Shirt' };
  const [formData, setFormData] = useState(emptyForm);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // ✅ نقرأ الـ Drop المختار من localStorage
  useEffect(() => {
    const savedDropId = localStorage.getItem('selectedDropId');
    if (!savedDropId) {
      router.replace('/drops');
      return;
    }
    setDropId(parseInt(savedDropId));
  }, [router]);

  const fetchProducts = async () => {
    if (!dropId) return;
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('drop_id', dropId)
      .order('id', { ascending: false });
    if (data) setProducts(data.map(p => ({ ...p, variants: p.product_variants || [] })));
    setLoading(false);
  };

  useEffect(() => { if (dropId) fetchProducts(); }, [dropId]);

  const getColors = (vars: VariantRow[]) => [...new Set(vars.map(v => v.color))];
  const totalStock = (vars: VariantRow[]) => vars.reduce((s, v) => s + v.stock, 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropId) return;
    if (variants.length === 0) { alert('Please add at least one color.'); return; }
    setIsSubmitting(true);

    const { data: product, error } = await supabase
      .from('products')
      .insert([{ name: formData.name, price: parseFloat(formData.price), cost: parseFloat(formData.cost), category: formData.category, stock: 0, sales_count: 0, drop_id: dropId }])
      .select().single();

    if (!error && product) {
      await supabase.from('product_variants').insert(variants.map(v => ({ product_id: product.id, color: v.color, size: v.size, stock: v.stock, total_added: v.stock })));
      await supabase.from('products').update({ stock: variants.reduce((s, v) => s + v.stock, 0) }).eq('id', product.id);
    }

    setIsAddModalOpen(false);
    setFormData(emptyForm);
    setVariants([]);
    setIsSubmitting(false);
    fetchProducts();
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setVariants(product.variants?.map(v => ({ id: v.id, color: v.color, size: v.size, stock: v.stock, total_added: v.total_added })) || []);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSubmitting(true);

    await supabase.from('products').update({
      name: editingProduct.name,
      price: parseFloat(editingProduct.price.toString()),
      cost: parseFloat(editingProduct.cost.toString()),
      category: editingProduct.category,
    }).eq('id', editingProduct.id);

    // ✅ تعديل الـ stock يدوياً من هنا (سواء زيادة أو نقصان) معناه إنك بتصحح رأس المال فعلياً
    // فالـ total_added بيتحرك بنفس قد الفرق اللي عملته. البيع (من الأوردرات) ما بيلمسش الرقم ده خالص
    const oldVariants = editingProduct.variants || [];

    await supabase.from('product_variants').delete().eq('product_id', editingProduct.id);
    await supabase.from('product_variants').insert(variants.map(v => {
      const oldMatch = oldVariants.find(ov => ov.color === v.color && ov.size === v.size);
      if (oldMatch) {
        const oldStock = oldMatch.stock;
        const oldTotalAdded = oldMatch.total_added ?? oldMatch.stock;
        const delta = v.stock - oldStock; // الفرق اللي عملته يدوياً
        const newTotalAdded = Math.max(0, oldTotalAdded + delta);
        return { product_id: editingProduct.id, color: v.color, size: v.size, stock: v.stock, total_added: newTotalAdded };
      }
      // variant جديد كامل (لون جديد مثلاً) — رأس ماله = الكمية اللي كتبتها أول مرة
      return { product_id: editingProduct.id, color: v.color, size: v.size, stock: v.stock, total_added: v.stock };
    }));
    await supabase.from('products').update({ stock: variants.reduce((s, v) => s + v.stock, 0) }).eq('id', editingProduct.id);

    setIsEditModalOpen(false);
    setEditingProduct(null);
    setVariants([]);
    setIsSubmitting(false);
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    await supabase.from('products').delete().eq('id', id);
    setDeleteConfirmId(null);
    fetchProducts();
  };

  if (!dropId) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Products</h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">Manage MISSION clothing catalog, variants, and pricing.</p>
          </div>
          <button onClick={() => { setFormData(emptyForm); setVariants([]); setIsAddModalOpen(true); }}
            className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            + Add Product
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">No products yet.</div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="flex flex-col gap-4 md:hidden">
              {products.map((product) => {
                const vars = product.variants || [];
                const colors = getColors(vars);
                const total = totalStock(vars);
                return (
                  <div key={product.id} className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white">{product.name}</h3>
                        <p className="text-xs text-zinc-500 uppercase mt-0.5">{product.category}</p>
                      </div>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded font-medium ${total <= 5 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-900 text-zinc-400'}`}>
                        {total} pcs
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {colors.map(c => <span key={c} className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 text-xs">{c}</span>)}
                    </div>
                    <div className="border-t border-zinc-900 pt-3 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="text-white">Price: EGP {product.price}</p>
                        <p className="text-zinc-500">Cost: EGP {product.cost}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                          className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 text-xs">
                          {expandedProduct === product.id ? '▲' : '▼ Sizes'}
                        </button>
                        <button onClick={() => openEditModal(product)} className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-300">📝</button>
                        <button onClick={() => setDeleteConfirmId(product.id)} className="px-2.5 py-1 bg-red-500/5 border border-red-500/10 rounded text-red-400">🗑️</button>
                      </div>
                    </div>
                    {expandedProduct === product.id && vars.length > 0 && (
                      <div className="border-t border-zinc-800 pt-3 space-y-2">
                        {colors.map(color => (
                          <div key={color}>
                            <p className="text-xs text-zinc-500 font-medium mb-1">{color}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {SIZES.map(size => {
                                const v = vars.find(vv => vv.color === color && vv.size === size);
                                if (!v) return null;
                                return (
                                  <span key={size} className={`text-[11px] px-2 py-0.5 rounded border font-mono ${v.stock === 0 ? 'border-red-500/20 text-red-400 bg-red-500/5' : v.stock <= 3 ? 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5' : 'border-zinc-800 text-zinc-400 bg-zinc-900'}`}>
                                    {size}: {v.stock}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider bg-zinc-950/50">
                    <th className="p-4">Product</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Colors</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-right">Cost</th>
                    <th className="p-4 text-center">Stock</th>
                    <th className="p-4 text-center">Sales</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-zinc-300">
                  {products.map((product) => {
                    const vars = product.variants || [];
                    const colors = getColors(vars);
                    const total = totalStock(vars);
                    return (
                      <React.Fragment key={product.id}>
                        <tr className="border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors">
                          <td className="p-4 font-semibold text-white">{product.name}</td>
                          <td className="p-4 text-zinc-500 uppercase text-xs">{product.category}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {colors.map(c => <span key={c} className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">{c}</span>)}
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-white">EGP {product.price}</td>
                          <td className="p-4 text-right font-mono text-zinc-500">EGP {product.cost}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${total <= 5 ? 'bg-red-500/10 text-red-500' : 'text-zinc-400'}`}>{total}</span>
                          </td>
                          <td className="p-4 text-center font-mono text-zinc-400">{product.sales_count || 0}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                className="text-zinc-400 hover:text-white text-xs border border-zinc-800 bg-zinc-950 px-2 py-1 rounded-md transition-colors">
                                {expandedProduct === product.id ? '▲ Hide' : '▼ Variants'}
                              </button>
                              <button onClick={() => openEditModal(product)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit </button>
                              <button onClick={() => setDeleteConfirmId(product.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors font-medium">Delete </button>
                            </div>
                          </td>
                        </tr>
                        {expandedProduct === product.id && (
                          <tr className="border-b border-zinc-800/60 bg-zinc-950/40">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="space-y-3">
                                <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Stock by Variant</p>
                                {colors.map(color => (
                                  <div key={color}>
                                    <p className="text-xs text-zinc-400 font-medium mb-2">{color}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {SIZES.map(size => {
                                        const v = vars.find(vv => vv.color === color && vv.size === size);
                                        if (!v) return null;
                                        return (
                                          <div key={size} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-mono ${v.stock === 0 ? 'border-red-500/20 text-red-400 bg-red-500/5' : v.stock <= 3 ? 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5' : 'border-zinc-800 text-zinc-400 bg-zinc-900'}`}>
                                            <span className="text-zinc-500">{size}</span>
                                            <span className="font-bold">{v.stock}</span>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Delete Confirm */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Delete Product?</h2>
              <p className="text-sm text-zinc-400">This will delete the product and all its variants.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">Add New Product</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Product Name *</label>
                    <input type="text" required placeholder="e.g., Heavyweight Oversized Tee" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Price (EGP) *</label>
                    <input type="number" required placeholder="650" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Cost (EGP) *</label>
                    <input type="number" required placeholder="250" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className={inputClass}>
                      <option>T-Shirt</option><option>Hoodie</option><option>Pants</option><option>Accessories</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Colors & Stock per Size *</label>
                  <VariantEditor variants={variants} onChange={setVariants} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-200 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && editingProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">Edit Product</h2>
                <button onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Product Name *</label>
                    <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Price (EGP) *</label>
                    <input type="number" required value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Cost (EGP) *</label>
                    <input type="number" required value={editingProduct.cost} onChange={(e) => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Category</label>
                    <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className={inputClass}>
                      <option>T-Shirt</option><option>Hoodie</option><option>Pants</option><option>Accessories</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-2">Colors & Stock per Size</label>
                  <VariantEditor variants={variants} onChange={setVariants} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-200 disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Update Product'}
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
