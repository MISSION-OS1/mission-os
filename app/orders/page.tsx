// app/orders/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  product_id: number;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  products?: { name: string; price: number };
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  sales_count: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    payment_method: 'Cash on Delivery',
    product_id: '',
    quantity: '1',
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, products(name, price)')
      .order('id', { ascending: false });

    const { data: productsData } = await supabase.from('products').select('*');

    if (ordersData) setOrders(ordersData);
    if (productsData) setProducts(productsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { customer_name, customer_phone, payment_method, product_id, quantity } = formData;

    if (!customer_name || !product_id || !quantity) return;

    const selectedProduct = products.find(p => p.id === parseInt(product_id));
    const qty = parseInt(quantity);

    if (!selectedProduct || selectedProduct.stock < qty) {
      alert('Insufficient stock!');
      return;
    }

    setIsSubmitting(true);
    const totalPrice = selectedProduct.price * qty;

    const { error: orderError } = await supabase
      .from('orders')
      .insert([
        { 
          customer_name, 
          customer_phone, 
          payment_method, 
          product_id: parseInt(product_id), 
          quantity: qty, 
          total_price: totalPrice, 
          status: 'Pending' 
        }
      ]);

    if (!orderError) {
      await supabase
        .from('products')
        .update({ stock: selectedProduct.stock - qty, sales_count: (selectedProduct.sales_count || 0) + qty })
        .eq('id', selectedProduct.id);

      setIsModalOpen(false);
      setFormData({ customer_name: '', customer_phone: '', payment_method: 'Cash on Delivery', product_id: '', quantity: '1' });
      fetchData();
    }
    setIsSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* الهيدر */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Orders</h1>
            <p className="text-zinc-500 text-sm mt-1">Track customer orders and payment details.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            + New Order
          </button>
        </div>

        {/* جدول الأوردرات */}
        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading orders...</div>
        ) : (
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/50">
                  <th className="p-4">Order</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Product</th>
                  <th className="p-4 text-center">Qty</th>
                  <th className="p-4 text-center">Payment</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 text-zinc-500 font-mono">#M{order.id}</td>
                    <td className="p-4">
                      <p className="font-semibold text-white">{order.customer_name}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{order.customer_phone || 'No Phone'}</p>
                    </td>
                    <td className="p-4 text-zinc-400">{order.products?.name || 'Product'}</td>
                    <td className="p-4 text-center font-mono">{order.quantity}</td>
                    <td className="p-4 text-center text-xs text-zinc-400">
                      <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{order.payment_method || 'Cash'}</span>
                    </td>
                    <td className="p-4 text-right text-white font-medium">EGP {order.total_price}</td>
                    <td className="p-4 text-right">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-xs font-medium rounded-lg px-2.5 py-1 bg-zinc-950 border border-zinc-800 focus:outline-none ${
                          order.status === 'Delivered' ? 'text-green-400' : order.status === 'Shipped' ? 'text-blue-400' : 'text-yellow-500'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal الإضافة الجديد مع الخانات الجديدة */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#09090b] border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Create New Order</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Customer Name *</label>
                  <input type="text" required placeholder="e.g., Abanoub Kamal" value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                </div>
                
                {/* خانة رقم التليفون */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Phone Number</label>
                  <input type="text" placeholder="e.g., 012XXXXXXXX" value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                </div>

                {/* خانة طريقة الدفع */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Payment Method</label>
                  <select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
                    <option value="Cash on Delivery">💵 Cash on Delivery</option>
                    <option value="InstaPay">⚡ InstaPay</option>
                    <option value="Credit/Debit Card">💳 Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Select Product *</label>
                  <select required value={formData.product_id} onChange={(e) => setFormData({...formData, product_id: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
                    <option value="">-- Choose --</option>
                    {products.map(p => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} ({p.stock} left)</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Quantity *</label>
                  <input type="number" required min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600" />
                </div>
                <div className="pt-2 flex space-x-3 justify-end text-sm">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 disabled:bg-zinc-600">{isSubmitting ? 'Processing...' : 'Place Order'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}