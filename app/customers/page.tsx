// app/customers/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface CustomerSummary {
  name: string;
  phone: string;
  paymentMethod: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCustomersData = async () => {
      setLoading(true);
      const { data: ordersData } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, payment_method, total_price, created_at');

      if (ordersData) {
        const customerMap: { [key: string]: CustomerSummary } = {};

        ordersData.forEach((order) => {
          const name = order.customer_name.trim();
          const phone = order.customer_phone || 'N/A';
          const paymentMethod = order.payment_method || 'Cash';
          const price = order.total_price || 0;
          const date = new Date(order.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });

          if (customerMap[name]) {
            customerMap[name].totalOrders += 1;
            customerMap[name].totalSpent += price;
            customerMap[name].paymentMethod = paymentMethod; // تحديث بأحدث طريقة دفع استخدمها
            if (new Date(order.created_at) > new Date(customerMap[name].lastOrderDate)) {
              customerMap[name].lastOrderDate = date;
              customerMap[name].phone = phone; // تحديث بأحدث تليفون
            }
          } else {
            customerMap[name] = {
              name,
              phone,
              paymentMethod,
              totalOrders: 1,
              totalSpent: price,
              lastOrderDate: date,
            };
          }
        });

        const sortedCustomers = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
        setCustomers(sortedCustomers);
      }
      setLoading(false);
    };

    fetchCustomersData();
  }, []);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Customers</h1>
          <p className="text-zinc-500 text-sm mt-1">View buyer contact info, orders, and preferred payment methods.</p>
        </div>

        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 placeholder-zinc-600"
          />
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-20 text-sm">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center text-zinc-500 py-20 border border-zinc-800 rounded-xl bg-[#09090b]">
            No customers found.
          </div>
        ) : (
          <div className="bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase bg-zinc-950/50">
                  <th className="p-4">Customer Info</th>
                  <th className="p-4 text-center">Total Orders</th>
                  <th className="p-4 text-center">Last Payment Method</th>
                  <th className="p-4 text-right">Total Spent</th>
                  <th className="p-4 text-right">Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                {filteredCustomers.map((customer, index) => (
                  <tr key={index} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 flex items-center space-x-3">
                      <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-xs text-zinc-400 uppercase font-bold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{customer.name}</p>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono">{customer.totalOrders}</td>
                    <td className="p-4 text-center text-xs text-zinc-400">
                      <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded">
                        {customer.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right text-white font-medium font-mono">
                      EGP {customer.totalSpent.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-zinc-500 text-xs font-medium">
                      {customer.lastOrderDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}