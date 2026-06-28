'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface Order {
  id: number;
  customer_name: string;
  product: string;
  color?: string;
  size?: string;
  quantity?: number;
  total_price: number;
  shipping_price: number;
  flyer_cost?: number;
  net_profit: number;
  status: string;
  was_replaced?: boolean;
  created_at: string;
}

interface Drop {
  id: number;
  name: string;
}

export default function DashboardOverview() {
  const router = useRouter();
  const [dropId, setDropId] = useState<number | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ نقرأ الـ Drop المختار من localStorage أول حاجة
  useEffect(() => {
    const savedDropId = localStorage.getItem('selectedDropId');
    if (!savedDropId) {
      router.replace('/drops');
      return;
    }
    setDropId(parseInt(savedDropId));
  }, [router]);

  useEffect(() => {
    if (!dropId) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      const [{ data: dropData }, { data: productsData }, { data: ordersData }] = await Promise.all([
        supabase.from('drops').select('id, name').eq('id', dropId).single(),
        supabase.from('products').select('*').eq('drop_id', dropId),
        supabase.from('orders').select('*').eq('drop_id', dropId).order('id', { ascending: false }),
      ]);
      if (dropData) setDrop(dropData);
      if (productsData) setProducts(productsData);
      if (ordersData) setOrders(ordersData);
      setLoading(false);
    };
    fetchDashboardData();
  }, [dropId]);

  const isCanceled  = (o: Order) => o.status?.toLowerCase() === 'canceled';
  const isReplacing = (o: Order) => !!o.was_replaced;
  const isInactive  = (o: Order) => isCanceled(o);

  const activeOrders   = orders.filter(o => !isInactive(o));
  const canceledOrders = orders.filter(o => isCanceled(o));
  const replacingOrders = orders.filter(o => isReplacing(o));

  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalProfit  = activeOrders.reduce((sum, o) => sum + (o.net_profit || 0), 0);
  const totalOrdersCount = activeOrders.length;
  const uniqueCustomersCount = new Set(activeOrders.map(o => o.customer_name?.trim().toLowerCase() || '')).size;

  const returnsValue = canceledOrders.reduce((sum, o) => sum + (o.shipping_price || 0) + (o.flyer_cost || 0), 0);
  const returnsCount = canceledOrders.length;

  const replacingCount = replacingOrders.length;

  const lowStockProducts  = products.filter(p => p.stock <= 5).slice(0, 4);
  const recentOrders = orders.slice(0, 5);

  const variantSalesMap: Record<string, { product: string; color?: string; size?: string; qty: number }> = {};
  activeOrders.forEach(o => {
    const key = `${o.product}__${o.color || ''}__${o.size || ''}`;
    if (!variantSalesMap[key]) variantSalesMap[key] = { product: o.product, color: o.color, size: o.size, qty: 0 };
    variantSalesMap[key].qty += o.quantity || 1;
  });
  const topSellingVariants = Object.values(variantSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 4);

  const orderLabel = (o: Order) => [o.product, o.color, o.size].filter(Boolean).join(' · ');

  if (!dropId) return null; // لحد ما يتحدد الـ Drop أو يحصل redirect

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          {/* ✅ شارة صغيرة توضح إنت شغال على أنهي Drop */}
          {drop && (
            <span className="inline-block mb-2 px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
              📦 {drop.name}
            </span>
          )}
          <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Welcome back. Here's what's happening with this drop.</p>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 font-medium text-sm">Syncing MISSION OS metrics...</div>
        ) : (
          <>
            {/* الكروت العلوية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">EGP {totalRevenue.toLocaleString()}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium"><span className="mr-1">↗</span> Live from server</div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">$</div>
              </div>

              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Profit</p>
                  <p className="text-2xl font-bold text-white mt-1">EGP {totalProfit.toLocaleString()}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium"><span className="mr-1">↗</span> Net income</div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">📈</div>
              </div>

              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Orders</p>
                  <p className="text-2xl font-bold text-white mt-1">{totalOrdersCount}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium"><span className="mr-1">↗</span> Active orders only</div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">🛍️</div>
              </div>

              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Customers</p>
                  <p className="text-2xl font-bold text-white mt-1">{uniqueCustomersCount}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium"><span className="mr-1">↗</span> Unique buyers</div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">👥</div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Canceled</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{returnsCount}</p>
                </div>
                <div className="text-[11px] text-red-400/80 flex items-center font-medium">
                  <span className="mr-1">↘</span> EGP {returnsValue.toLocaleString()} (ship + flyer)
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 text-sm text-red-400">↩️</div>
              </div>

              <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Replaced</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{replacingCount}</p>
                </div>
                <div className="text-[11px] text-purple-400/80 flex items-center font-medium"><span className="mr-1">⇄</span> Orders with item swapped</div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20 text-sm text-purple-400">🔁</div>
              </div>
            </div>

            {/* التقسيمة السفلية */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Recent Orders */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-white text-base">Recent Orders</h3>
                <div className="space-y-3.5">
                  {recentOrders.length === 0 ? (
                    <div className="text-center text-xs text-zinc-600 py-10">No recent orders.</div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className={`text-xs space-y-1.5 ${isCanceled(order) ? 'opacity-40' : ''} pb-3 last:pb-0 border-b border-zinc-900 last:border-0`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-zinc-600 shrink-0">#M{order.id}</span>
                            <p className={`font-medium text-zinc-300 truncate ${isCanceled(order) ? 'line-through' : ''}`}>{order.customer_name}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {order.was_replaced && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-purple-500/10 text-purple-400">Replaced</span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                              order.status?.toLowerCase() === 'delivered' ? 'text-green-400 bg-green-500/5' :
                              order.status?.toLowerCase() === 'canceled'  ? 'text-red-400 bg-red-500/5' :
                              order.status?.toLowerCase() === 'shipped'   ? 'text-blue-400 bg-blue-500/5' :
                                                                            'text-yellow-500 bg-yellow-500/5'
                            }`}>{order.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pl-7">
                          <p className="text-[10px] text-zinc-500 truncate min-w-0">{orderLabel(order)}</p>
                          <span className="text-zinc-400 font-medium shrink-0">EGP {order.total_price}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Low Stock */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-white text-base">Low Stock</h3>
                <div className="space-y-3.5">
                  {lowStockProducts.length === 0 ? (
                    <div className="text-center text-xs text-green-400 bg-green-500/5 border border-green-500/10 rounded-lg p-4 font-medium">✓ All products are well stocked.</div>
                  ) : (
                    lowStockProducts.map((product) => (
                      <div key={product.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-[10px]">👕</div>
                          <div>
                            <p className="font-medium text-zinc-300">{product.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{product.category}</p>
                          </div>
                        </div>
                        <span className="text-red-500 font-bold font-mono bg-red-500/5 px-2 py-1 rounded">{product.stock} <span className="text-[10px] font-normal text-zinc-500">left</span></span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Selling */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-white text-base">Top Selling</h3>
                <div className="space-y-3.5">
                  {topSellingVariants.length === 0 ? (
                    <div className="text-center text-xs text-zinc-600 py-10">No sales yet.</div>
                  ) : (
                    topSellingVariants.map((v, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="font-mono font-bold text-zinc-600 w-3 text-center shrink-0">{idx + 1}</span>
                          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-[10px] shrink-0">🔥</div>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-300 truncate">{v.product}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{[v.color, v.size].filter(Boolean).join(' · ') || '—'}</p>
                          </div>
                        </div>
                        <span className="font-mono text-zinc-400 font-medium shrink-0">{v.qty} <span className="text-[10px] text-zinc-600">sold</span></span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
