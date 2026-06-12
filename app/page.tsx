// app/page.tsx
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

interface Order {
  id: number;
  customer_name: string;
  product_id: number;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  products?: { name: string; price: number; cost: number };
}

export default function DashboardOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // 1. جلب المنتجات
      const { data: productsData } = await supabase.from('products').select('*');
      // 2. جلب الأوردرات مع بيانات المنتج المربوط لحساب التكلفة والربح
      const { data: ordersData } = await supabase.from('orders').select('*, products(name, price, cost)').order('id', { ascending: false });

      if (productsData) setProducts(productsData);
      if (ordersData) setOrders(ordersData);
      
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  // 📊 العمليات الحسابية الذكية بناءً على الداتا الحقيقية 100%
  
  // 1. حساب الإيرادات (Revenue)
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

  // 2. حساب صافي الربح (Profit = سعر البيع - التكلفة)
  const totalProfit = orders.reduce((sum, order) => {
    const productCost = order.products?.cost || 0;
    const orderCost = productCost * order.quantity;
    const orderProfit = order.total_price - orderCost;
    return sum + orderProfit;
  }, 0);

  // 3. عدد الأوردرات الكلي
  const totalOrdersCount = orders.length;

  // 4. عدد العملاء بدون تكرار
  const uniqueCustomersCount = new Set(orders.map(o => o.customer_name.trim().toLowerCase())).size;

  // 5. النواقص (مخزن أقل من أو يساوي 5)
  const lowStockProducts = products.filter(p => p.stock <= 5).slice(0, 4);

  // 6. الأكثر مبيعاً
  const topSellingProducts = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 4);

  // 7. آخر 5 أوردرات للعرض السريع
  const recentOrders = orders.slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        
        {/* هيدر الصفحة */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Welcome back. Here's what's happening with Mission.</p>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 font-medium text-sm">
            Syncing MISSION OS metrics...
          </div>
        ) : (
          <>
            {/* 📈 الكروت العلوية الأربعة ديناميكية بالكامل الآن */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Revenue Card */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Revenue</p>
                  <p className="text-2xl font-bold text-white mt-1">EGP {totalRevenue.toLocaleString()}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium">
                  <span className="mr-1">↗</span> Live from server
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">$</div>
              </div>

              {/* Profit Card */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Profit</p>
                  <p className="text-2xl font-bold text-white mt-1">EGP {totalProfit.toLocaleString()}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium">
                  <span className="mr-1">↗</span> Net income
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">📈</div>
              </div>

              {/* Orders Card */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Orders</p>
                  <p className="text-2xl font-bold text-white mt-1">{totalOrdersCount}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium">
                  <span className="mr-1">↗</span> Total sales invoices
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">🛍️</div>
              </div>

              {/* Customers Card */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 flex flex-col justify-between h-32 relative">
                <div>
                  <p className="text-xs font-medium text-zinc-500">Customers</p>
                  <p className="text-2xl font-bold text-white mt-1">{uniqueCustomersCount}</p>
                </div>
                <div className="text-[11px] text-green-400 flex items-center font-medium">
                  <span className="mr-1">↗</span> Unique buyers
                </div>
                <div className="absolute top-5 right-5 w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 text-sm text-zinc-400">👥</div>
              </div>

            </div>

            {/* 3. التقسيمة الثلاثية السفلية */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* القائمة الأولى: Recent Orders (ديناميكية بالكامل) */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-base">Recent Orders</h3>
                  <button className="text-xs text-zinc-500 hover:text-white">View all</button>
                </div>
                <div className="space-y-3.5">
                  {recentOrders.length === 0 ? (
                    <div className="text-center text-xs text-zinc-600 py-10">No recent orders.</div>
                  ) : (
                    recentOrders.map((order) => (
                      <div key={order.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-zinc-600">#M{order.id}</span>
                          <span className="font-medium text-zinc-300 max-w-[100px] truncate">{order.customer_name}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-zinc-400 font-medium">EGP {order.total_price}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            order.status === 'Delivered' ? 'text-green-400 bg-green-500/5' : 'text-yellow-500 bg-yellow-500/5'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* القائمة الثانية: Low Stock Products */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-base">Low Stock Products</h3>
                  <button className="text-xs text-zinc-500 hover:text-white">View all</button>
                </div>
                <div className="space-y-3.5">
                  {lowStockProducts.length === 0 ? (
                    <div className="text-center text-xs text-green-400 bg-green-500/5 border border-green-500/10 rounded-lg p-4 font-medium">
                      ✓ All products are well stocked.
                    </div>
                  ) : (
                    lowStockProducts.map((product) => (
                      <div key={product.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-[10px]">
                            👕
                          </div>
                          <div>
                            <p className="font-medium text-zinc-300">{product.name}</p>
                            <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{product.category}</p>
                          </div>
                        </div>
                        <span className="text-red-500 font-bold font-mono bg-red-500/5 px-2 py-1 rounded">
                          {product.stock} <span className="text-[10px] font-normal text-zinc-500">left</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* القائمة الثالثة: Top Selling Products */}
              <div className="bg-[#09090b] border border-zinc-900 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white text-base">Top Selling Products</h3>
                  <button className="text-xs text-zinc-500 hover:text-white">View all</button>
                </div>
                <div className="space-y-3.5">
                  {products.length === 0 ? (
                    <div className="text-center text-xs text-zinc-600 py-10">No products found.</div>
                  ) : (
                    topSellingProducts.map((product, idx) => (
                      <div key={product.id} className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-zinc-600 w-3 text-center">{idx + 1}</span>
                          <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-[10px]">
                            🔥
                          </div>
                          <div>
                            <p className="font-medium text-zinc-300">{product.name}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">EGP {product.price}</p>
                          </div>
                        </div>
                        <span className="font-mono text-zinc-400 font-medium">
                          {product.sales_count || 0} <span className="text-[10px] text-zinc-600">sold</span>
                        </span>
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