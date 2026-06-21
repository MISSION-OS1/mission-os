'use client';

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase';

interface Drop {
  id: number;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface DropStats {
  productCount: number;
  orderCount: number;
  revenue: number;
}

export default function DropsPage() {
  const router = useRouter();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [stats, setStats] = useState<Record<number, DropStats>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchDrops = async () => {
    setLoading(true);
    const { data: dropsData } = await supabase.from('drops').select('*').order('id', { ascending: false });
    if (dropsData) {
      setDrops(dropsData);

      // هنحسب إحصائيات بسيطة لكل Drop
      const statsMap: Record<number, DropStats> = {};
      for (const drop of dropsData) {
        const [{ count: productCount }, { data: ordersData }] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('drop_id', drop.id),
          supabase.from('orders').select('total_price, status').eq('drop_id', drop.id),
        ]);
        const activeOrders = (ordersData || []).filter(o => o.status?.toLowerCase() !== 'canceled');
        statsMap[drop.id] = {
          productCount: productCount || 0,
          orderCount: ordersData?.length || 0,
          revenue: activeOrders.reduce((s, o) => s + (o.total_price || 0), 0),
        };
      }
      setStats(statsMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDrops(); }, []);

  const openNew = () => { setFormData({ name: '', description: '' }); setIsModalOpen(true); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    await supabase.from('drops').insert([{ name: formData.name.trim(), description: formData.description.trim() || null, status: 'active' }]);
    setIsModalOpen(false);
    setIsSubmitting(false);
    fetchDrops();
  };

  const enterDrop = (dropId: number) => {
    // بنخزن الـ Drop المختار محلياً عشان كل الصفحات تقدر تقرأه
    localStorage.setItem('selectedDropId', dropId.toString());
    router.push('/dashboard');
  };

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">MISSION OS</h1>
            <p className="text-zinc-500 text-sm mt-1">Select a drop to manage its orders, products, inventory, and finances.</p>
          </div>
          <button onClick={openNew} className="bg-white text-black px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors whitespace-nowrap">
            + New Drop
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading drops...</div>
        ) : drops.length === 0 ? (
          <div className="text-center text-zinc-600 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">
            No drops yet. Create your first one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drops.map((drop) => {
              const s = stats[drop.id] || { productCount: 0, orderCount: 0, revenue: 0 };
              return (
                <button
                  key={drop.id}
                  onClick={() => enterDrop(drop.id)}
                  className="text-left bg-[#09090b] border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors space-y-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-zinc-200">{drop.name}</h3>
                      {drop.description && <p className="text-xs text-zinc-500 mt-1">{drop.description}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide ${
                      drop.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}>{drop.status}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800">
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase">Products</p>
                      <p className="text-sm font-bold text-white mt-0.5">{s.productCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase">Orders</p>
                      <p className="text-sm font-bold text-white mt-0.5">{s.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase">Revenue</p>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5 font-mono">{s.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* New Drop Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">New Drop</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Drop Name *</label>
                  <input type="text" required placeholder="e.g., Drop 002" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Description (optional)</label>
                  <textarea placeholder="A short note about this drop" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className={inputClass} rows={3} />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Drop'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
