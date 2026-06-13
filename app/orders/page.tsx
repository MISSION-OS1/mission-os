'use client';

import { useState, useEffect, FormEvent } from "react";
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ===== Replacing Modal State =====
  const [replacingOrder, setReplacingOrder] = useState<any | null>(null);
  const [replacingProductId, setReplacingProductId] = useState("");
  const [replacingQty, setReplacingQty] = useState("1");

  const platforms = ["shopify", "tiktok", "facebook", "instagram", "WhatsApp", "other"];
  const payments  = ["cash on delivery", "instapay", "credit card", "mylerz", "Abanoub", "Youssef", "Mina"];
  const statuses  = ["pending", "shipped", "delivered", "canceled", "replacing"];

  const emptyForm = {
    customer_name: "", customer_phone: "", product_id: "", product: "",
    quantity: "1", platform: "other", payment_method: "cash on delivery",
    total_price: "0", shipping_price: "0", net_profit: "0", status: "pending",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    const [{ data: ordersData }, { data: productsData }] = await Promise.all([
      supabase.from("orders").select("*").order("id", { ascending: false }),
      supabase.from("products").select("id, name, price, cost, stock").order("name"),
    ]);
    if (ordersData)   setOrders(ordersData);
    if (productsData) setProducts(productsData);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const total    = parseFloat(formData.total_price) || 0;
    const shipping = parseFloat(formData.shipping_price) || 0;
    setFormData(prev => ({ ...prev, net_profit: (total - shipping).toString() }));
  }, [formData.total_price, formData.shipping_price]);

  const handleProductChange = (productId: string) => {
    const selected = products.find(p => p.id === parseInt(productId));
    const qty = parseInt(formData.quantity) || 1;
    if (selected) {
      setFormData(prev => ({ ...prev, product_id: productId, product: selected.name, total_price: (selected.price * qty).toString() }));
    } else {
      setFormData(prev => ({ ...prev, product_id: "", product: "" }));
    }
  };

  const handleQuantityChange = (qty: string) => {
    const selected = products.find(p => p.id === parseInt(formData.product_id));
    const q = parseInt(qty) || 1;
    if (selected) {
      setFormData(prev => ({ ...prev, quantity: qty, total_price: (selected.price * q).toString() }));
    } else {
      setFormData(prev => ({ ...prev, quantity: qty }));
    }
  };

  const openNew = () => { setEditingOrder(null); setFormData(emptyForm); setIsModalOpen(true); };
  const openEdit = (order: any) => {
    setEditingOrder(order);
    setFormData({
      customer_name: order.customer_name || "", customer_phone: order.customer_phone || "",
      product_id: order.product_id?.toString() || "", product: order.product || "",
      quantity: String(order.quantity ?? "1"), platform: order.platform || "other",
      payment_method: order.payment_method || "cash on delivery",
      total_price: String(order.total_price ?? "0"), shipping_price: String(order.shipping_price ?? "0"),
      net_profit: String(order.net_profit ?? "0"), status: order.status || "pending",
    });
    setIsModalOpen(true);
  };

  const adjustStock = async (productId: number, qtyChange: number) => {
    // نجيب الـ stock الحالي من الداتابيز مش من الـ state عشان يكون دايما محدث
    const { data } = await supabase.from("products").select("stock").eq("id", productId).single();
    if (!data) return;
    await supabase.from("products").update({ stock: Math.max(0, data.stock + qtyChange) }).eq("id", productId);
  };

  // ===== Replacing Logic =====
  const openReplacingModal = (order: any) => {
    setReplacingOrder(order);
    setReplacingProductId("");
    setReplacingQty("1");
  };

  const handleConfirmReplacing = async () => {
    if (!replacingOrder || !replacingProductId) return;
    const newProduct = products.find(p => p.id === parseInt(replacingProductId));
    if (!newProduct) return;
    const qty = parseInt(replacingQty) || 1;

    // 1. رجّع stock المنتج القديم
    if (replacingOrder.product_id && replacingOrder.status?.toLowerCase() !== "canceled" && replacingOrder.status?.toLowerCase() !== "replacing") {
      await adjustStock(replacingOrder.product_id, replacingOrder.quantity || 1);
    }

    // 2. انقص stock المنتج الجديد
    await adjustStock(newProduct.id, -qty);

    // 3. حدّث الـ order — خزّن المنتج القديم في replaced_product وحط المنتج الجديد
    const newTotal  = newProduct.price * qty;
    const newProfit = newTotal - (parseFloat(replacingOrder.shipping_price) || 0);

    await supabase.from("orders").update({
      status: "replacing",
      replaced_product: replacingOrder.product,        // اسم المنتج القديم للعرض
      replaced_product_id: replacingOrder.product_id,  // id القديم
      product_id: newProduct.id,
      product: newProduct.name,
      quantity: qty,
      total_price: newTotal,
      net_profit: newProfit,
    }).eq("id", replacingOrder.id);

    setReplacingOrder(null);
    fetchData();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formData.quantity) || 1;
    const productId = formData.product_id ? parseInt(formData.product_id) : null;
    const payload = {
      customer_name: formData.customer_name, customer_phone: formData.customer_phone,
      product_id: productId, product: formData.product, quantity: qty,
      platform: formData.platform, payment_method: formData.payment_method,
      total_price: parseFloat(formData.total_price) || 0,
      shipping_price: parseFloat(formData.shipping_price) || 0,
      net_profit: parseFloat(formData.net_profit) || 0, status: formData.status,
    };

    if (editingOrder) {
      const oldQty       = editingOrder.quantity || 1;
      const oldProductId = editingOrder.product_id;
      const oldStatus    = editingOrder.status?.toLowerCase();
      const newStatus    = formData.status.toLowerCase();
      const wasInactive  = ["canceled", "replacing"].includes(oldStatus);
      const nowInactive  = ["canceled", "replacing"].includes(newStatus);

      await supabase.from("orders").update(payload).eq("id", editingOrder.id);

      if (productId) {
        const productChanged = oldProductId !== productId;
        if (productChanged) {
          if (oldProductId && !wasInactive) await adjustStock(oldProductId, oldQty);
          if (!nowInactive) await adjustStock(productId, -qty);
        } else {
          if (wasInactive && !nowInactive) await adjustStock(productId, -qty);
          else if (!wasInactive && nowInactive) await adjustStock(productId, oldQty);
          else if (!wasInactive && !nowInactive && oldQty !== qty) await adjustStock(productId, oldQty - qty);
        }
      }
    } else {
      await supabase.from("orders").insert([payload]);
      if (productId && !["canceled", "replacing"].includes(formData.status.toLowerCase())) {
        await adjustStock(productId, -qty);
        const { data: prod } = await supabase.from("products").select("sales_count").eq("id", productId).single();
        await supabase.from("products").update({ sales_count: (prod?.sales_count || 0) + 1 }).eq("id", productId);
      }
    }
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    const order = orders.find(o => o.id === id);
    const isInactive = ["canceled", "replacing"].includes(order?.status?.toLowerCase());
    if (order?.product_id && !isInactive) await adjustStock(order.product_id, order.quantity || 1);
    await supabase.from("orders").delete().eq("id", id);
    setDeleteConfirmId(null);
    fetchData();
  };

  const statusStyle = (s: string) => ({
    delivered:  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    shipped:    "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    pending:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    canceled:   "bg-red-500/10 text-red-400 border border-red-500/20",
    replacing:  "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  }[s?.toLowerCase()] || "bg-zinc-800 text-zinc-400");

  const platformIcon = (p: string) => ({ shopify:"🛒", tiktok:"🎵", facebook:"📘", instagram:"📸", whatsapp:"💬", other:"🌐" }[p?.toLowerCase()] || "🌐");

  const isInactive   = (o: any) => ["canceled", "replacing"].includes(o.status?.toLowerCase());
  const isReplacing  = (o: any) => o.status?.toLowerCase() === "replacing";

  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));
  const availableStock  = selectedProduct
    ? selectedProduct.stock + (editingOrder?.product_id === selectedProduct.id && !["canceled","replacing"].includes(editingOrder?.status?.toLowerCase()) ? (editingOrder?.quantity || 1) : 0)
    : 0;

  // الـ stock المتاح للمنتج الجديد في modal الـ replacing
  const replacingNewProduct  = products.find(p => p.id === parseInt(replacingProductId));
  const replacingAvailStock  = replacingNewProduct ? replacingNewProduct.stock : 0;

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {orders.length} total · {orders.filter(o => o.status?.toLowerCase() === "canceled").length} canceled · {orders.filter(o => isReplacing(o)).length} replacing
            </p>
          </div>
          <button onClick={openNew} className="bg-white text-black px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors whitespace-nowrap">
            + New Order
          </button>
        </div>

        {/* ===== MOBILE: Cards ===== */}
        <div className="flex flex-col gap-3 md:hidden">
          {orders.length === 0 ? (
            <div className="text-center text-zinc-600 py-16 text-sm border border-zinc-800 rounded-xl bg-[#09090b]">No orders yet.</div>
          ) : orders.map((o) => (
            <div key={o.id} className={`bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3 ${isInactive(o) ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className={`font-mono text-xs text-zinc-500 ${isInactive(o) ? "line-through" : ""}`}>#M{o.id}</span>
                <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusStyle(o.status)}`}>{o.status}</span>
              </div>
              <div>
                <p className={`font-bold text-white ${isInactive(o) ? "line-through text-zinc-500" : ""}`}>{o.customer_name}</p>
                {o.customer_phone && <p className="text-zinc-500 text-xs mt-0.5">{o.customer_phone}</p>}
              </div>
              {/* المنتج — لو replacing بيظهر القديم مشطوب والجديد */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  {isReplacing(o) && o.replaced_product && (
                    <p className="text-zinc-600 text-xs line-through">{o.replaced_product}</p>
                  )}
                  <span className={isInactive(o) && !isReplacing(o) ? "line-through text-zinc-500" : "text-zinc-300"}>
                    {o.product || "—"}
                  </span>
                </div>
                <span className="text-zinc-500 text-xs">× {o.quantity || 1}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{platformIcon(o.platform)} {o.platform}</span>
                <span className="capitalize">{o.payment_method}</span>
              </div>
              <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
                <div className="text-xs text-zinc-500">
                  Total: <span className="text-white font-mono font-medium">EGP {o.total_price?.toLocaleString()}</span>
                  <span className="mx-2">·</span>
                  Ship: <span className="text-blue-400 font-mono">EGP {o.shipping_price?.toLocaleString()}</span>
                </div>
                <span className="text-emerald-400 font-bold font-mono text-sm">EGP {o.net_profit?.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(o)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteConfirmId(o.id)} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg font-medium transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* ===== DESKTOP: Table ===== */}
        <div className="hidden md:block bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Shipping</th>
                <th className="px-4 py-3">Net Profit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {orders.length === 0 ? (
                <tr><td colSpan={11} className="text-center text-zinc-600 py-16 text-sm">No orders yet.</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className={`hover:bg-zinc-900/30 transition-colors ${isInactive(o) ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-mono text-zinc-600 text-xs">
                    <span className={isInactive(o) ? "line-through" : ""}>#M{o.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`font-semibold text-white text-sm ${isInactive(o) ? "line-through text-zinc-500" : ""}`}>{o.customer_name}</p>
                    {o.customer_phone && <p className="text-zinc-500 text-xs mt-0.5">{o.customer_phone}</p>}
                  </td>
                  {/* Product cell — لو replacing يظهر القديم مشطوب فوق والجديد تحت */}
                  <td className="px-4 py-3">
                    {isReplacing(o) && o.replaced_product && (
                      <p className="text-zinc-600 text-xs line-through mb-0.5">{o.replaced_product}</p>
                    )}
                    <p className={`text-sm ${isInactive(o) && !isReplacing(o) ? "line-through text-zinc-500" : "text-zinc-300"}`}>
                      {o.product || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400 text-sm">{o.quantity || 1}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-zinc-400 text-xs capitalize">{platformIcon(o.platform)} {o.platform || "—"}</span></td>
                  <td className="px-4 py-3 text-zinc-400 text-xs capitalize">{o.payment_method || "—"}</td>
                  <td className="px-4 py-3 font-mono text-white text-sm">{o.total_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-blue-400 text-sm">{o.shipping_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-bold text-sm">{o.net_profit?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusStyle(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(o)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors font-medium">Edit</button>
                      <button onClick={() => setDeleteConfirmId(o.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== Replacing Modal ===== */}
        {replacingOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">Replace Order</h2>
                <button onClick={() => setReplacingOrder(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {/* المنتج القديم */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Current Product</p>
                  <p className="text-white font-semibold line-through text-zinc-400">{replacingOrder.product || "—"}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">× {replacingOrder.quantity || 1} · EGP {replacingOrder.total_price?.toLocaleString()}</p>
                </div>

                {/* المنتج الجديد */}
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">New Product</p>
                  <select
                    className={inputClass}
                    value={replacingProductId}
                    onChange={(e) => { setReplacingProductId(e.target.value); setReplacingQty("1"); }}
                  >
                    <option value="">— Select new product —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="bg-zinc-900">
                        {p.name} — EGP {p.price} ({p.stock} left)
                      </option>
                    ))}
                  </select>
                </div>

                {/* الكمية */}
                {replacingProductId && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Quantity</p>
                    <input
                      type="number" min="1" max={replacingAvailStock}
                      className={inputClass}
                      value={replacingQty}
                      onChange={(e) => setReplacingQty(e.target.value)}
                    />
                    <p className="text-[11px] text-zinc-600 mt-1">{replacingAvailStock} available</p>
                    {parseInt(replacingQty) > replacingAvailStock && (
                      <p className="text-xs text-red-400 mt-1">⚠ Exceeds available stock</p>
                    )}
                  </div>
                )}

                {/* Preview */}
                {replacingNewProduct && replacingQty && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-3">
                    <p className="text-[11px] text-orange-400 uppercase tracking-wider mb-1">New Order Preview</p>
                    <p className="text-white font-semibold">{replacingNewProduct.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">× {replacingQty} · EGP {(replacingNewProduct.price * (parseInt(replacingQty) || 1)).toLocaleString()}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setReplacingOrder(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors">Cancel</button>
                  <button
                    onClick={handleConfirmReplacing}
                    disabled={!replacingProductId || parseInt(replacingQty) > replacingAvailStock}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-40"
                  >
                    Confirm Replace
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Delete Order?</h2>
              <p className="text-sm text-zinc-400">Stock will be restored automatically.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">{editingOrder ? "Edit Order" : "New Order"}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Customer</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Full name" required className={inputClass} value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
                    <input type="text" placeholder="Phone number" className={inputClass} value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Product</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <select className={inputClass} value={formData.product_id} onChange={(e) => handleProductChange(e.target.value)}>
                        <option value="">— Select product —</option>
                        {products.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name} — EGP {p.price} ({p.stock} left)</option>)}
                      </select>
                    </div>
                    <div>
                      <input type="number" min="1" max={availableStock || undefined} placeholder="Qty" className={inputClass} value={formData.quantity} onChange={(e) => handleQuantityChange(e.target.value)} />
                      {selectedProduct && <p className="text-[11px] text-zinc-600 mt-1">{availableStock} available</p>}
                    </div>
                  </div>
                  {selectedProduct && parseInt(formData.quantity) > availableStock && (
                    <p className="text-xs text-red-400 mt-1">⚠ Exceeds available stock ({availableStock})</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Platform</p>
                  <select className={inputClass} value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })}>
                    {platforms.map(p => <option key={p} value={p} className="bg-zinc-900 capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Pricing</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-600 mb-1 block">Total Price</label>
                      <input type="number" min="0" className={inputClass} value={formData.total_price} onChange={(e) => setFormData({ ...formData, total_price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-600 mb-1 block">Shipping</label>
                      <input type="number" min="0" className={inputClass} value={formData.shipping_price} onChange={(e) => setFormData({ ...formData, shipping_price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-600 mb-1 block">Net Profit</label>
                      <input type="number" readOnly className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold focus:outline-none cursor-not-allowed" value={formData.net_profit} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {payments.map(p => (
                      <button key={p} type="button" onClick={() => setFormData({ ...formData, payment_method: p })}
                        className={`py-2 px-3 rounded-lg text-xs font-medium text-left capitalize transition-colors border ${formData.payment_method === p ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Status</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {statuses.map(s => (
                      <button key={s} type="button" onClick={() => {
                        if (s === "replacing" && editingOrder) {
                          // أغلق الـ edit modal وافتح replacing modal
                          setIsModalOpen(false);
                          openReplacingModal(editingOrder);
                        } else {
                          setFormData({ ...formData, status: s });
                        }
                      }}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize transition-colors border ${
                          formData.status === s
                            ? s === "canceled"  ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : s === "delivered" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : s === "shipped"   ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                            : s === "replacing" ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                            : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
                        }`}>{s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold">{editingOrder ? "Save Changes" : "Create Order"}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
