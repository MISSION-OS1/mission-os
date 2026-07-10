'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Order {
  id: number;
  total_price: number;
  net_profit: number;
  status: string;
  platform: string;
  payment_method: string;
  customer_name: string;
  product_id: number;
  quantity: number;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  sales_count: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function ReportsPage() {
  const router = useRouter();
  const [dropId, setDropId] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedDropId = localStorage.getItem('selectedDropId');
    if (!savedDropId) { router.replace('/drops'); return; }
    setDropId(parseInt(savedDropId));
  }, [router]);

  useEffect(() => {
    if (!dropId) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: ordersData }, { data: productsData }] = await Promise.all([
        supabase.from('orders').select('id, total_price, net_profit, status, platform, payment_method, customer_name, product_id, quantity, created_at').eq('drop_id', dropId),
        supabase.from('products').select('id, name, sales_count').eq('drop_id', dropId),
      ]);
      if (ordersData) setOrders(ordersData);
      if (productsData) setProducts(productsData);
      setLoading(false);
    };
    fetchData();
  }, [dropId]);

  if (!dropId) return null;

  const activeOrders = orders.filter(o => o.status?.toLowerCase() !== 'canceled');

  // ===== Monthly Sales =====
  const monthlySales = MONTHS.map((month, i) => {
    const monthOrders = activeOrders.filter(o => {
      const d = new Date(o.created_at);
      return d.getMonth() === i;
    });
    return {
      month,
      revenue: monthOrders.reduce((s, o) => s + (o.total_price || 0), 0),
      orders: monthOrders.length,
    };
  }).filter(m => m.revenue > 0 || m.orders > 0);

  const maxRevenue = Math.max(...monthlySales.map(m => m.revenue), 1);

  // ===== KPIs =====
  const totalRevenue = activeOrders.reduce((s, o) => s + (o.total_price || 0), 0);
  const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
  const totalNetProfit = orders.reduce((s, o) => s + (o.net_profit || 0), 0);
  const grossMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  const uniqueCustomers = new Set(activeOrders.map(o => o.customer_name)).size;
  const repeatCustomers = Object.values(
    activeOrders.reduce((acc, o) => {
      acc[o.customer_name] = (acc[o.customer_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).filter(count => count > 1).length;
  const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

  // ===== Platform Breakdown =====
  const platformMap = activeOrders.reduce((acc, o) => {
    const p = o.platform || 'other';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const platformData = Object.entries(platformMap)
    .sort((a, b) => b[1] - a[1])
    .map(([platform, count]) => ({
      platform,
      count,
      pct: activeOrders.length > 0 ? Math.round((count / activeOrders.length) * 100) : 0,
    }));

  // ===== Payment Breakdown =====
  const paymentMap = activeOrders.reduce((acc, o) => {
    const p = o.payment_method || 'other';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const paymentData = Object.entries(paymentMap)
    .sort((a, b) => b[1] - a[1])
    .map(([method, count]) => ({
      method,
      count,
      pct: activeOrders.length > 0 ? Math.round((count / activeOrders.length) * 100) : 0,
    }));

  // ===== Top Selling Products =====
  const topProducts = [...products]
    .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
    .slice(0, 5)
    .filter(p => p.sales_count > 0);

  const maxSales = Math.max(...topProducts.map(p => p.sales_count), 1);

  const platformIcon: Record<string, string> = {
    shopify: '🛒', tiktok: '🎵', facebook: '📘',
    instagram: '📸', whatsapp: '💬', other: '🌐',
  };

  const paymentIcon: Record<string, string> = {
    'cash on delivery': '💵', instapay: '📱', 'credit card': '💳',
    'mobile wallet': '📲', mylerz: '🚚', abanoub: '👤', youssef: '👤', mina: '👤',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">Performance breakdown and analytics for this drop.</p>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading...</div>
        ) : (
          <>
            {/* ===== KPIs ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Avg Order Value</p>
                <p className="text-xl font-bold text-white font-mono">EGP {avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-[11px] text-zinc-600">{activeOrders.length} active orders</p>
              </div>
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Net Profit Margin</p>
                <p className={`text-xl font-bold font-mono ${grossMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{grossMargin.toFixed(1)}%</p>
                <p className="text-[11px] text-zinc-600">Of total revenue</p>
              </div>
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Repeat Customers</p>
                <p className="text-xl font-bold text-white font-mono">{repeatRate.toFixed(1)}%</p>
                <p className="text-[11px] text-zinc-600">{repeatCustomers} of {uniqueCustomers} buyers</p>
              </div>
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-xl font-bold text-white font-mono">EGP {totalRevenue.toLocaleString()}</p>
                <p className="text-[11px] text-zinc-600">Active orders only</p>
              </div>
            </div>

            {/* ===== Monthly Sales Chart ===== */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Monthly Sales</h2>
              {monthlySales.length === 0 ? (
                <div className="text-center text-zinc-600 py-10 text-sm">No sales data yet.</div>
              ) : (
                <div className="space-y-4">
                  {monthlySales.map((m) => (
                    <div key={m.month} className="flex items-center gap-4">
                      <p className="text-xs text-zinc-500 w-8 shrink-0">{m.month}</p>
                      <div className="flex-1 bg-zinc-900 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-xs text-zinc-400 font-mono w-24 text-right">EGP {m.revenue.toLocaleString()}</p>
                        <p className="text-[11px] text-zinc-600 w-16 text-right">{m.orders} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ===== Platform Breakdown ===== */}
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Platform Breakdown</h2>
                {platformData.length === 0 ? (
                  <div className="text-center text-zinc-600 py-10 text-sm">No data yet.</div>
                ) : (
                  <div className="space-y-3">
                    {platformData.map(({ platform, count, pct }) => (
                      <div key={platform}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{platformIcon[platform.toLowerCase()] || '🌐'}</span>
                            <p className="text-sm text-zinc-300 capitalize">{platform}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-500">{count} orders</p>
                            <p className="text-xs font-mono text-white w-10 text-right">{pct}%</p>
                          </div>
                        </div>
                        <div className="bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ===== Payment Breakdown ===== */}
              <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Payment Methods</h2>
                {paymentData.length === 0 ? (
                  <div className="text-center text-zinc-600 py-10 text-sm">No data yet.</div>
                ) : (
                  <div className="space-y-3">
                    {paymentData.map(({ method, count, pct }) => (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{paymentIcon[method.toLowerCase()] || '💰'}</span>
                            <p className="text-sm text-zinc-300 capitalize">{method}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-500">{count} orders</p>
                            <p className="text-xs font-mono text-white w-10 text-right">{pct}%</p>
                          </div>
                        </div>
                        <div className="bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ===== Top Selling Products ===== */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-5">Top Selling Products</h2>
              {topProducts.length === 0 ? (
                <div className="text-center text-zinc-600 py-10 text-sm">No sales yet.</div>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-4">
                      <p className="text-xs text-zinc-600 w-4 shrink-0">#{i + 1}</p>
                      <p className="text-sm text-zinc-300 flex-1 truncate">{p.name}</p>
                      <div className="flex-1 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(p.sales_count / maxSales) * 100}%` }} />
                      </div>
                      <p className="text-xs font-mono text-zinc-400 w-16 text-right shrink-0">{p.sales_count} sold</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
