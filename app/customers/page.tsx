'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface OrderEntry {
  status: string;
  total_price: number;
  created_at: string;
  payment_method: string;
  product: string;
  color: string;
  size: string;
  quantity: number;
}

interface CustomerSummary {
  name: string;
  phone: string;
  paymentMethod: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  latestStatus: string;
  orders: OrderEntry[];
}

const statusStyle = (s: string) => ({
  delivered: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  shipped:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  pending:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  canceled:  'bg-red-500/10 text-red-400 border border-red-500/20',
  replacing: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
}[s?.toLowerCase()] || 'bg-zinc-800 text-zinc-400');

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomersData = async () => {
      setLoading(true);
      const { data: ordersData } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, payment_method, total_price, created_at, status, product, color, size, quantity')
        .order('created_at', { ascending: false });

      if (ordersData) {
        const customerMap: { [key: string]: CustomerSummary } = {};
        ordersData.forEach((order) => {
          if (!order.customer_name) return;
          const name = order.customer_name.trim();
          const phone = order.customer_phone || 'N/A';
          const paymentMethod = order.payment_method || 'Cash';
          const price = order.total_price || 0;
          const status = order.status || 'pending';
          const date = order.created_at
            ? new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : 'N/A';
          const entry: OrderEntry = {
            status, total_price: price, created_at: date, payment_method: paymentMethod,
            product: order.product || '', color: order.color || '', size: order.size || '',
            quantity: order.quantity || 1,
          };

          if (customerMap[name]) {
            customerMap[name].totalOrders += 1;
            customerMap[name].totalSpent += price;
            customerMap[name].orders.push(entry);
            if (order.created_at && new Date(order.created_at) > new Date(customerMap[name].lastOrderDate)) {
              customerMap[name].lastOrderDate = date;
              customerMap[name].latestStatus = status;
              customerMap[name].paymentMethod = paymentMethod;
              customerMap[name].phone = phone;
            }
          } else {
            customerMap[name] = { name, phone, paymentMethod, totalOrders: 1, totalSpent: price, lastOrderDate: date, latestStatus: status, orders: [entry] };
          }
        });
        setCustomers(Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent));
      }
      setLoading(false);
    };
    fetchCustomersData();
  }, []);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  const variantLabel = (o: OrderEntry) => [o.color, o.size].filter(Boolean).join(' · ');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Customers</h1>
          <p className="text-zinc-500 text-sm mt-1">View buyer contact info, orders, and preferred payment methods.</p>
        </div>

        <div className="max-w-md">
          <input type="text" placeholder="Search by name or phone number..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#09090b] border border-zinc-900 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-700 placeholder-zinc-600" />
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-900 rounded-xl bg-[#09090b]">No customers found.</div>
        ) : (
          <>
            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredCustomers.map((customer, index) => (
                <div key={index} className="bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-xs text-zinc-400 uppercase font-bold shrink-0">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{customer.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{customer.phone}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusStyle(customer.latestStatus)}`}>{customer.latestStatus}</span>
                  </div>

                  {/* أحدث طلب */}
                  {customer.orders[0] && (
                    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
                      <p className="text-xs text-zinc-300">{customer.orders[0].product}</p>
                      {variantLabel(customer.orders[0]) && (
                        <p className="text-[11px] text-zinc-500 mt-0.5">{variantLabel(customer.orders[0])} · ×{customer.orders[0].quantity}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3">
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-600 uppercase">Orders</p>
                      <p className="text-sm font-bold text-white mt-0.5">{customer.totalOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-600 uppercase">Spent</p>
                      <p className="text-sm font-bold text-white mt-0.5 font-mono">EGP {customer.totalSpent.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-600 uppercase">Payment</p>
                      <p className="text-xs text-zinc-400 mt-0.5 capitalize truncate">{customer.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-600">Last order: {customer.lastOrderDate}</p>
                    {customer.totalOrders > 1 && (
                      <button onClick={() => setExpandedCustomer(expandedCustomer === customer.name ? null : customer.name)}
                        className="text-xs text-zinc-500 hover:text-white border border-zinc-800 bg-zinc-900 px-2.5 py-1 rounded-lg transition-colors">
                        {expandedCustomer === customer.name ? '▲ Hide' : `▼ ${customer.totalOrders} orders`}
                      </button>
                    )}
                  </div>

                  {expandedCustomer === customer.name && (
                    <div className="border-t border-zinc-800 pt-3 space-y-2">
                      <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Order History</p>
                      {customer.orders.map((o, i) => (
                        <div key={i} className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{o.created_at}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${statusStyle(o.status)}`}>{o.status}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-300">{o.product} {variantLabel(o) && <span className="text-zinc-500">({variantLabel(o)})</span>} ×{o.quantity}</span>
                            <span className="font-mono text-white">EGP {o.total_price?.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block bg-[#09090b] border border-zinc-900 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 text-[11px] font-semibold uppercase tracking-wider bg-zinc-950/50">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Last Order</th>
                      <th className="p-4 text-center">Orders</th>
                      <th className="p-4 text-center">Latest Status</th>
                      <th className="p-4 text-center">Payment</th>
                      <th className="p-4 text-right">Total Spent</th>
                      <th className="p-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-zinc-300">
                    {filteredCustomers.map((customer, index) => (
                      <React.Fragment key={index}>
                        <tr className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-xs text-zinc-400 uppercase font-bold shrink-0">
                                {customer.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{customer.name}</p>
                                <p className="text-xs text-zinc-500 font-mono mt-0.5">{customer.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            {customer.orders[0] && (
                              <div>
                                <p className="text-xs text-zinc-300">{customer.orders[0].product}</p>
                                {variantLabel(customer.orders[0]) && <p className="text-[11px] text-zinc-500">{variantLabel(customer.orders[0])} · ×{customer.orders[0].quantity}</p>}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center font-mono text-zinc-300">{customer.totalOrders}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusStyle(customer.latestStatus)}`}>{customer.latestStatus}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-xs capitalize text-zinc-400">{customer.paymentMethod}</span>
                          </td>
                          <td className="p-4 text-right text-white font-medium font-mono">EGP {customer.totalSpent.toLocaleString()}</td>
                          <td className="p-4 text-right text-zinc-500 text-xs font-medium">{customer.lastOrderDate}</td>
                          <td className="p-4 text-right">
                            {customer.totalOrders > 1 && (
                              <button onClick={() => setExpandedCustomer(expandedCustomer === customer.name ? null : customer.name)}
                                className="text-xs text-zinc-500 hover:text-white border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition-colors">
                                {expandedCustomer === customer.name ? '▲ Hide' : `▼ ${customer.totalOrders} orders`}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedCustomer === customer.name && (
                          <tr className="border-b border-zinc-900 bg-zinc-950/60">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="space-y-2">
                                <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">Order History</p>
                                {customer.orders.map((o, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-4 py-2.5">
                                    <span className="text-zinc-500 font-mono w-24">{o.created_at}</span>
                                    <span className="text-zinc-300 flex-1">{o.product} {variantLabel(o) && <span className="text-zinc-500">({variantLabel(o)})</span>} ×{o.quantity}</span>
                                    <span className="text-zinc-400 capitalize w-32">{o.payment_method}</span>
                                    <span className="font-mono text-white w-24 text-right">EGP {o.total_price?.toLocaleString()}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${statusStyle(o.status)}`}>{o.status}</span>
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
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
