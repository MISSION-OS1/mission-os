'use client';

import { useState, useEffect, FormEvent } from "react";
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

const SIZES = ['One Size', 'S', 'M', 'L', 'XL', 'XXL'];

interface Variant {
  id: number;
  product_id: number;
  color: string;
  size: string;
  stock: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  variants?: Variant[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [replacingOrder, setReplacingOrder] = useState<any | null>(null);
  const [replacingProductId, setReplacingProductId] = useState("");
  const [replacingVariantId, setReplacingVariantId] = useState("");
  const [replacingQty, setReplacingQty] = useState("1");

  const platforms = ["shopify", "tiktok", "facebook", "instagram", "WhatsApp", "other"];
  const payments  = ["cash on delivery", "instapay", "credit card", "mylerz", "Abanoub", "Youssef", "Mina"];
  const statuses  = ["pending", "shipped", "delivered", "canceled", "replacing"];

  const emptyForm = {
    customer_name: "", customer_phone: "",
    product_id: "", product: "", variant_id: "", color: "", size: "",
    quantity: "1", platform: "other", payment_method: "cash on delivery",
    total_price: "0", shipping_price: "0", net_profit: "0", status: "pending",
  };
  const [formData, setFormData] = useState(emptyForm);

  const fetchData = async () => {
    const [{ data: ordersData }, { data: productsData }] = await Promise.all([
      supabase.from("orders").select("*").order("id", { ascending: false }),
      supabase.from("products").select("id, name, price, cost, stock, product_variants(*)").order("name"),
    ]);
    if (ordersData) setOrders(ordersData);
    if (productsData) setProducts(productsData.map((p: any) => ({ ...p, variants: p.product_variants || [] })));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const total    = parseFloat(formData.total_price) || 0;
    const shipping = parseFloat(formData.shipping_price) || 0;
    setFormData(prev => ({ ...prev, net_profit: (total - shipping).toString() }));
  }, [formData.total_price, formData.shipping_price]);

  // الـ variants للمنتج المختار في الـ form
  const selectedProduct   = products.find(p => p.id === parseInt(formData.product_id));
  const selectedVariants  = selectedProduct?.variants || [];
  const availableColors   = [...new Set(selectedVariants.map(v => v.color))];
  const availableSizes    = selectedVariants.filter(v => v.color === formData.color).map(v => v.size);
  const selectedVariant   = selectedVariants.find(v => v.color === formData.color && v.size === formData.size);
  const availableStock    = selectedVariant
    ? selectedVariant.stock + (editingOrder?.variant_id === selectedVariant.id && !["canceled","replacing"].includes(editingOrder?.status?.toLowerCase()) ? (editingOrder?.quantity || 1) : 0)
    : 0;

  const handleProductChange = (productId: string) => {
    const p = products.find(pr => pr.id === parseInt(productId));
    setFormData(prev => ({ ...prev, product_id: productId, product: p?.name || "", color: "", size: "", variant_id: "", total_price: "0", quantity: "1" }));
  };

  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color, size: "", variant_id: "" }));
  };

  const handleSizeChange = (size: string) => {
    const variant = selectedVariants.find(v => v.color === formData.color && v.size === size);
    const qty = parseInt(formData.quantity) || 1;
    setFormData(prev => ({
      ...prev, size,
      variant_id: variant?.id?.toString() || "",
      total_price: variant ? (selectedProduct!.price * qty).toString() : "0",
    }));
  };

  const handleQuantityChange = (qty: string) => {
    const q = parseInt(qty) || 1;
    if (selectedProduct && selectedVariant) {
      setFormData(prev => ({ ...prev, quantity: qty, total_price: (selectedProduct.price * q).toString() }));
    } else {
      setFormData(prev => ({ ...prev, quantity: qty }));
    }
  };

  const openNew = () => { setEditingOrder(null); setFormData(emptyForm); setIsModalOpen(true); };
  const openEdit = (order: any) => {
    setEditingOrder(order);
    setFormData({
      customer_name:  order.customer_name  || "",
      customer_phone: order.customer_phone || "",
      product_id:     order.product_id?.toString() || "",
      product:        order.product        || "",
      variant_id:     order.variant_id?.toString()  || "",
      color:          order.color          || "",
      size:           order.size           || "",
      quantity:       String(order.quantity  ?? "1"),
      platform:       order.platform       || "other",
      payment_method: order.payment_method || "cash on delivery",
      total_price:    String(order.total_price    ?? "0"),
      shipping_price: String(order.shipping_price ?? "0"),
      net_profit:     String(order.net_profit     ?? "0"),
      status:         order.status         || "pending",
    });
    setIsModalOpen(true);
  };

  const adjustVariantStock = async (variantId: number, qtyChange: number) => {
    const { data } = await supabase.from("product_variants").select("stock, product_id").eq("id", variantId).single();
    if (!data) return;
    const newStock = Math.max(0, data.stock + qtyChange);
    await supabase.from("product_variants").update({ stock: newStock }).eq("id", variantId);
    // تحديث الـ stock الكلي في products
    const { data: allVariants } = await supabase.from("product_variants").select("stock").eq("product_id", data.product_id);
    if (allVariants) {
      const total = allVariants.reduce((s: number, v: any) => s + v.stock, 0);
      await supabase.from("products").update({ stock: total }).eq("id", data.product_id);
    }
  };

  const isInactiveStatus = (s: string) => ["canceled", "replacing"].includes(s?.toLowerCase());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const qty       = parseInt(formData.quantity) || 1;
    const productId = formData.product_id ? parseInt(formData.product_id) : null;
    const variantId = formData.variant_id ? parseInt(formData.variant_id) : null;

    const payload = {
      customer_name:  formData.customer_name,
      customer_phone: formData.customer_phone,
      product_id:     productId,
      product:        formData.product,
      variant_id:     variantId,
      color:          formData.color,
      size:           formData.size,
      quantity:       qty,
      platform:       formData.platform,
      payment_method: formData.payment_method,
      total_price:    parseFloat(formData.total_price)    || 0,
      shipping_price: parseFloat(formData.shipping_price) || 0,
      net_profit:     parseFloat(formData.net_profit)     || 0,
      status:         formData.status,
    };

    if (editingOrder) {
      const oldQty      = editingOrder.quantity || 1;
      const oldVariantId = editingOrder.variant_id;
      const oldStatus   = editingOrder.status?.toLowerCase();
      const newStatus   = formData.status.toLowerCase();
      const wasInactive = isInactiveStatus(oldStatus);
      const nowInactive = isInactiveStatus(newStatus);

      await supabase.from("orders").update(payload).eq("id", editingOrder.id);

      if (variantId) {
        const variantChanged = oldVariantId !== variantId;
        if (variantChanged) {
          if (oldVariantId && !wasInactive) await adjustVariantStock(oldVariantId, oldQty);
          if (!nowInactive) await adjustVariantStock(variantId, -qty);
        } else {
          if (wasInactive && !nowInactive) await adjustVariantStock(variantId, -qty);
          else if (!wasInactive && nowInactive) await adjustVariantStock(variantId, oldQty);
          else if (!wasInactive && !nowInactive && oldQty !== qty) await adjustVariantStock(variantId, oldQty - qty);
        }
      }
    } else {
      await supabase.from("orders").insert([payload]);
      if (variantId && !isInactiveStatus(formData.status)) {
        await adjustVariantStock(variantId, -qty);
        const { data: prod } = await supabase.from("products").select("sales_count").eq("id", productId!).single();
        await supabase.from("products").update({ sales_count: (prod?.sales_count || 0) + 1 }).eq("id", productId!);
      }
    }
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    const order = orders.find(o => o.id === id);
    if (order?.variant_id && !isInactiveStatus(order.status)) await adjustVariantStock(order.variant_id, order.quantity || 1);
    await supabase.from("orders").delete().eq("id", id);
    setDeleteConfirmId(null);
    fetchData();
  };

  // Replacing
  const openReplacingModal = (order: any) => { setReplacingOrder(order); setReplacingProductId(""); setReplacingVariantId(""); setReplacingQty("1"); };

  const replacingProduct  = products.find(p => p.id === parseInt(replacingProductId));
  const replacingVariants = replacingProduct?.variants || [];
  const replacingColors   = [...new Set(replacingVariants.map(v => v.color))];
  const [replacingColor, setReplacingColor] = useState("");
  const [replacingSize, setReplacingSize]   = useState("");
  const replacingSizes    = replacingVariants.filter(v => v.color === replacingColor).map(v => v.size);
  const replacingVariant  = replacingVariants.find(v => v.color === replacingColor && v.size === replacingSize);
  const replacingAvailStock = replacingVariant?.stock || 0;

  const handleConfirmReplacing = async () => {
    if (!replacingOrder || !replacingVariant || !replacingProduct) return;
    const qty = parseInt(replacingQty) || 1;

    if (replacingOrder.variant_id && !isInactiveStatus(replacingOrder.status)) {
      await adjustVariantStock(replacingOrder.variant_id, replacingOrder.quantity || 1);
    }
    await adjustVariantStock(replacingVariant.id, -qty);

    const newTotal  = replacingProduct.price * qty;
    const newProfit = newTotal - (parseFloat(replacingOrder.shipping_price) || 0);

    await supabase.from("orders").update({
      status: "replacing",
      replaced_product: replacingOrder.product,
      replaced_product_id: replacingOrder.product_id,
      product_id: replacingProduct.id,
      product: replacingProduct.name,
      variant_id: replacingVariant.id,
      color: replacingColor,
      size: replacingSize,
      quantity: qty,
      total_price: newTotal,
      net_profit: newProfit,
    }).eq("id", replacingOrder.id);

    setReplacingOrder(null);
    fetchData();
  };

  const statusStyle = (s: string) => ({
    delivered: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    shipped:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    pending:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    canceled:  "bg-red-500/10 text-red-400 border border-red-500/20",
    replacing: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  }[s?.toLowerCase()] || "bg-zinc-800 text-zinc-400");

  const platformIcon = (p: string) => ({ shopify:"🛒", tiktok:"🎵", facebook:"📘", instagram:"📸", whatsapp:"💬", other:"🌐" }[p?.toLowerCase()] || "🌐");
  const isInactive  = (o: any) => isInactiveStatus(o.status);
  const isReplacing = (o: any) => o.status?.toLowerCase() === "replacing";

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {orders.length} total · {orders.filter(o => o.status?.toLowerCase() === "canceled").length} canceled · {orders.filter(o => isReplacing(o)).length} replacing
            </p>
          </div>
          <button onClick={openNew} className="bg-white text-black px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors whitespace-nowrap">+ New Order</button>
        </div>

        {/* Mobile Cards */}
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
              <div className="space-y-0.5">
                {isReplacing(o) && o.replaced_product && (
                  <p className="text-zinc-600 text-xs line-through">{o.replaced_product}</p>
                )}
                <p className={`text-sm ${isInactive(o) && !isReplacing(o) ? "line-through text-zinc-500" : "text-zinc-300"}`}>{o.product || "—"}</p>
                {(o.color || o.size) && (
                  <p className="text-xs text-zinc-500">{o.color} · {o.size} · ×{o.quantity || 1}</p>
                )}
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

        {/* Desktop Table */}
        <div className="hidden md:block bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-500 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Shipping</th>
                <th className="px-4 py-3">Profit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {orders.length === 0 ? (
                <tr><td colSpan={12} className="text-center text-zinc-600 py-16 text-sm">No orders yet.</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className={`hover:bg-zinc-900/30 transition-colors ${isInactive(o) ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-mono text-zinc-600 text-xs"><span className={isInactive(o) ? "line-through" : ""}>#M{o.id}</span></td>
                  <td className="px-4 py-3">
                    <p className={`font-semibold text-white text-sm ${isInactive(o) ? "line-through text-zinc-500" : ""}`}>{o.customer_name}</p>
                    {o.customer_phone && <p className="text-zinc-500 text-xs mt-0.5">{o.customer_phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {isReplacing(o) && o.replaced_product && <p className="text-zinc-600 text-xs line-through mb-0.5">{o.replaced_product}</p>}
                    <p className={`text-sm ${isInactive(o) && !isReplacing(o) ? "line-through text-zinc-500" : "text-zinc-300"}`}>{o.product || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {(o.color || o.size) && (
                      <div className="flex gap-1">
                        {o.color && <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">{o.color}</span>}
                        {o.size  && <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">{o.size}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400 text-sm">{o.quantity || 1}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-zinc-400 text-xs capitalize">{platformIcon(o.platform)} {o.platform || "—"}</span></td>
                  <td className="px-4 py-3 text-zinc-400 text-xs capitalize">{o.payment_method || "—"}</td>
                  <td className="px-4 py-3 font-mono text-white text-sm">{o.total_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-blue-400 text-sm">{o.shipping_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-bold text-sm">{o.net_profit?.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusStyle(o.status)}`}>{o.status}</span></td>
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

        {/* Replacing Modal */}
        {replacingOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-base font-bold text-white">Replace Order</h2>
                <button onClick={() => setReplacingOrder(null)} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-3">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Current Product</p>
                  <p className="text-zinc-400 font-semibold line-through">{replacingOrder.product}</p>
                  {(replacingOrder.color || replacingOrder.size) && (
                    <p className="text-xs text-zinc-600 mt-0.5">{replacingOrder.color} · {replacingOrder.size}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">New Product</p>
                  <select className={inputClass} value={replacingProductId} onChange={(e) => { setReplacingProductId(e.target.value); setReplacingColor(""); setReplacingSize(""); setReplacingVariantId(""); }}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name} — EGP {p.price}</option>)}
                  </select>
                </div>
                {replacingProductId && replacingColors.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {replacingColors.map(c => (
                        <button key={c} type="button" onClick={() => { setReplacingColor(c); setReplacingSize(""); setReplacingVariantId(""); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${replacingColor === c ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {replacingColor && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Size</p>
                    <div className="flex flex-wrap gap-2">
                      {replacingSizes.map(s => {
                        const v = replacingVariants.find(vv => vv.color === replacingColor && vv.size === s);
                        return (
                          <button key={s} type="button" onClick={() => { setReplacingSize(s); setReplacingVariantId(v?.id?.toString() || ""); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${replacingSize === s ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"} ${v?.stock === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                            disabled={v?.stock === 0}>
                            {s} <span className="text-[10px] opacity-60">({v?.stock || 0})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {replacingVariant && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Quantity</p>
                    <input type="number" min="1" max={replacingAvailStock} className={inputClass} value={replacingQty} onChange={(e) => setReplacingQty(e.target.value)} />
                    <p className="text-[11px] text-zinc-600 mt-1">{replacingAvailStock} available</p>
                  </div>
                )}
                {replacingVariant && replacingQty && (
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-4 py-3">
                    <p className="text-[11px] text-orange-400 uppercase tracking-wider mb-1">New Order</p>
                    <p className="text-white font-semibold">{replacingProduct?.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{replacingColor} · {replacingSize} · ×{replacingQty} · EGP {((replacingProduct?.price || 0) * (parseInt(replacingQty) || 1)).toLocaleString()}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setReplacingOrder(null)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button onClick={handleConfirmReplacing} disabled={!replacingVariant || parseInt(replacingQty) > replacingAvailStock}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-40">
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
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium">Cancel</button>
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

                {/* Customer */}
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Customer</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Full name" required className={inputClass} value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
                    <input type="text" placeholder="Phone number" className={inputClass} value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
                  </div>
                </div>

                {/* Product */}
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Product</p>
                  <select className={inputClass} value={formData.product_id} onChange={(e) => handleProductChange(e.target.value)}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name} — EGP {p.price}</option>)}
                  </select>
                </div>

                {/* Color */}
                {availableColors.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                      {availableColors.map(c => (
                        <button key={c} type="button" onClick={() => handleColorChange(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${formData.color === c ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size */}
                {formData.color && availableSizes.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Size</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSizes.map(s => {
                        const v = selectedVariants.find(vv => vv.color === formData.color && vv.size === s);
                        const adjustedStock = v ? v.stock + (editingOrder?.variant_id === v.id && !isInactiveStatus(editingOrder?.status) ? editingOrder?.quantity || 0 : 0) : 0;
                        return (
                          <button key={s} type="button" onClick={() => handleSizeChange(s)}
                            disabled={adjustedStock === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${formData.size === s ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"} ${adjustedStock === 0 ? "opacity-40 cursor-not-allowed" : ""}`}>
                            {s} <span className="text-[10px] opacity-60">({adjustedStock})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Qty */}
                {formData.size && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Quantity</p>
                    <input type="number" min="1" max={availableStock || undefined} className={inputClass} value={formData.quantity} onChange={(e) => handleQuantityChange(e.target.value)} />
                    {selectedVariant && <p className="text-[11px] text-zinc-600 mt-1">{availableStock} available</p>}
                    {parseInt(formData.quantity) > availableStock && <p className="text-xs text-red-400 mt-1">⚠ Exceeds available stock</p>}
                  </div>
                )}

                {/* Platform */}
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Platform</p>
                  <select className={inputClass} value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })}>
                    {platforms.map(p => <option key={p} value={p} className="bg-zinc-900 capitalize">{p}</option>)}
                  </select>
                </div>

                {/* Pricing */}
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

                {/* Payment */}
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

                {/* Status */}
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Status</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {statuses.map(s => (
                      <button key={s} type="button" onClick={() => {
                        if (s === "replacing" && editingOrder) { setIsModalOpen(false); openReplacingModal(editingOrder); }
                        else setFormData({ ...formData, status: s });
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
