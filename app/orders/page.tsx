'use client';

import { useState, useEffect, FormEvent, useRef } from "react";
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import Papa from 'papaparse';

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

interface CsvRow {
  customer_name: string;
  customer_phone: string;
  product_name: string;
  color: string;
  quantity: number;
  total_price: number;
  shipping_price: number;
  created_at: string;
  // matching result
  matched_product?: Product;
  matched_variant?: Variant;
  matchStatus: 'matched' | 'product_not_found' | 'variant_not_found';
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
  const [replacingColor, setReplacingColor] = useState("");
  const [replacingSize, setReplacingSize] = useState("");

  const [cancelingOrder, setCancelingOrder] = useState<any | null>(null);
  const [flyerCostInput, setFlyerCostInput] = useState("5");

  // ===== CSV Import State =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const [csvPlatform, setCsvPlatform] = useState("shopify");
  const [csvPayment, setCsvPayment] = useState("cash on delivery");
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null);

  const platforms = ["shopify", "tiktok", "facebook", "instagram", "WhatsApp", "other"];
  const payments  = ["cash on delivery", "instapay", "credit card", "mylerz", "Abanoub", "Youssef", "Mina"];
  const statuses  = ["pending", "shipped", "delivered", "canceled"];

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

  const selectedProduct   = products.find(p => p.id === parseInt(formData.product_id));
  const selectedVariants  = selectedProduct?.variants || [];
  const availableColors   = [...new Set(selectedVariants.map(v => v.color))];
  const availableSizes    = SIZES.filter(s => selectedVariants.some(v => v.color === formData.color && v.size === s));
  const selectedVariant   = selectedVariants.find(v => v.color === formData.color && v.size === formData.size);
  const isInactiveStatus  = (s: string) => s?.toLowerCase() === "canceled";
  const availableStock    = selectedVariant
    ? selectedVariant.stock + (editingOrder?.variant_id === selectedVariant.id && !isInactiveStatus(editingOrder?.status) ? (editingOrder?.quantity || 1) : 0)
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
    const { data: allVariants } = await supabase.from("product_variants").select("stock").eq("product_id", data.product_id);
    if (allVariants) {
      const total = allVariants.reduce((s: number, v: any) => s + v.stock, 0);
      await supabase.from("products").update({ stock: total }).eq("id", data.product_id);
    }
  };

  // ===== Cancel flow with flyer cost =====
  const openCancelModal = (order: any) => {
    setCancelingOrder(order);
    setFlyerCostInput("5");
  };

  const confirmCancel = async () => {
    if (!cancelingOrder) return;
    const flyerCost = parseFloat(flyerCostInput) || 0;

    if (cancelingOrder.variant_id && !isInactiveStatus(cancelingOrder.status)) {
      await adjustVariantStock(cancelingOrder.variant_id, cancelingOrder.quantity || 1);
    }

    await supabase.from("orders").update({ status: "canceled", flyer_cost: flyerCost }).eq("id", cancelingOrder.id);

    if (editingOrder?.id === cancelingOrder.id) setIsModalOpen(false);
    setCancelingOrder(null);
    fetchData();
  };

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
      const oldQty       = editingOrder.quantity || 1;
      const oldVariantId = editingOrder.variant_id;
      const wasInactive  = isInactiveStatus(editingOrder.status);
      const nowInactive  = isInactiveStatus(formData.status);

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

  // ===== Replacing =====
  const openReplacingModal = (order: any) => {
    setReplacingOrder(order);
    setReplacingProductId("");
    setReplacingVariantId("");
    setReplacingQty("1");
    setReplacingColor("");
    setReplacingSize("");
  };

  const replacingProduct  = products.find(p => p.id === parseInt(replacingProductId));
  const replacingVariants = replacingProduct?.variants || [];
  const replacingColors   = [...new Set(replacingVariants.map(v => v.color))];
  const replacingSizes    = SIZES.filter(s => replacingVariants.some(v => v.color === replacingColor && v.size === s));
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

    const keepStatus = isInactiveStatus(replacingOrder.status) ? "pending" : replacingOrder.status;

    await supabase.from("orders").update({
      was_replaced: true,
      status: keepStatus,
      replaced_product: replacingOrder.product,
      replaced_product_id: replacingOrder.product_id,
      replaced_color: replacingOrder.color,
      replaced_size: replacingOrder.size,
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

  // ===== CSV Import =====
  // اسم المنتج في Shopify بيبقى "Product Name - Color"، نفصل الاسم عن اللون
  const splitProductColor = (itemName: string) => {
    const parts = itemName.split(' - ');
    if (parts.length >= 2) {
      const color = parts[parts.length - 1].trim();
      const name = parts.slice(0, -1).join(' - ').trim();
      return { name, color };
    }
    return { name: itemName.trim(), color: '' };
  };

  const matchCsvRow = (productName: string, color: string): { product?: Product; variant?: Variant; status: CsvRow['matchStatus'] } => {
    const product = products.find(p => p.name.trim().toLowerCase() === productName.trim().toLowerCase());
    if (!product) return { status: 'product_not_found' };
    const variant = product.variants?.find(v => v.color.trim().toLowerCase() === color.trim().toLowerCase());
    if (!variant) return { product, status: 'variant_not_found' };
    return { product, variant, status: 'matched' };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows: CsvRow[] = results.data.map((row: any) => {
          const itemName = row['Item Name'] || '';
          const { name, color } = splitProductColor(itemName);
          const match = matchCsvRow(name, color);

          return {
            customer_name: row['Billing Name'] || row['Shipping Name'] || row['Name'] || 'Unknown',
            customer_phone: row['Billing Phone'] || row['Shipping Phone'] || '',
            product_name: name,
            color,
            quantity: parseInt(row['Item Quantity']) || 1,
            total_price: parseFloat(row['Item Total Price']) || 0,
            shipping_price: parseFloat(row['Shipping']) || 0,
            created_at: row['Created At'] || '',
            matched_product: match.product,
            matched_variant: match.variant,
            matchStatus: match.status,
          };
        }).filter((r: CsvRow) => r.product_name); // skip totally empty rows

        setCsvRows(rows);
        setIsCsvPreviewOpen(true);
        setImportSummary(null);
      },
    });

    // reset input so the same file can be re-selected later
    e.target.value = '';
  };

  const confirmCsvImport = async () => {
    setIsImporting(true);
    let imported = 0;
    let skipped = 0;

    for (const row of csvRows) {
      if (row.matchStatus !== 'matched' || !row.matched_product || !row.matched_variant) {
        skipped++;
        continue;
      }

      const netProfit = row.total_price - row.shipping_price;
      const payload = {
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        product_id: row.matched_product.id,
        product: row.matched_product.name,
        variant_id: row.matched_variant.id,
        color: row.matched_variant.color,
        size: row.matched_variant.size,
        quantity: row.quantity,
        platform: csvPlatform,
        payment_method: csvPayment,
        total_price: row.total_price,
        shipping_price: row.shipping_price,
        net_profit: netProfit,
        status: "pending",
      };

      await supabase.from("orders").insert([payload]);
      await adjustVariantStock(row.matched_variant.id, -row.quantity);
      const { data: prod } = await supabase.from("products").select("sales_count").eq("id", row.matched_product.id).single();
      await supabase.from("products").update({ sales_count: (prod?.sales_count || 0) + 1 }).eq("id", row.matched_product.id);

      imported++;
    }

    setImportSummary({ imported, skipped });
    setIsImporting(false);
    fetchData();
  };

  const closeCsvModal = () => {
    setIsCsvPreviewOpen(false);
    setCsvRows([]);
    setImportSummary(null);
  };

  const statusStyle = (s: string) => ({
    delivered: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    shipped:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    pending:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    canceled:  "bg-red-500/10 text-red-400 border border-red-500/20",
  }[s?.toLowerCase()] || "bg-zinc-800 text-zinc-400");

  const platformIcon = (p: string) => ({ shopify:"🛒", tiktok:"🎵", facebook:"📘", instagram:"📸", whatsapp:"💬", other:"🌐" }[p?.toLowerCase()] || "🌐");
  const isInactive  = (o: any) => isInactiveStatus(o.status);

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors";

  const replacementLabel = (full: { product?: string; color?: string; size?: string }) =>
    [full.product, full.color, full.size].filter(Boolean).join(' · ');

  const matchedCount = csvRows.filter(r => r.matchStatus === 'matched').length;
  const skippedCount = csvRows.length - matchedCount;

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">

        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {orders.length} total · {orders.filter(o => o.status?.toLowerCase() === "canceled").length} canceled · {orders.filter(o => o.was_replaced).length} replaced
            </p>
          </div>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-800 transition-colors whitespace-nowrap">
              ⬆ Upload CSV
            </button>
            <button onClick={openNew} className="bg-white text-black px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors whitespace-nowrap">+ New Order</button>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="flex flex-col gap-3 md:hidden">
          {orders.length === 0 ? (
            <div className="text-center text-zinc-600 py-16 text-sm border border-zinc-800 rounded-xl bg-[#09090b]">No orders yet.</div>
          ) : orders.map((o) => (
            <div key={o.id} className={`bg-[#09090b] border border-zinc-800 rounded-xl p-4 space-y-3 ${isInactive(o) ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <span className={`font-mono text-xs text-zinc-500 ${isInactive(o) ? "line-through" : ""}`}>#M{o.id}</span>
                <div className="flex items-center gap-1.5">
                  {o.was_replaced && (
                    <span className="px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20">Replaced</span>
                  )}
                  <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide ${statusStyle(o.status)}`}>{o.status}</span>
                </div>
              </div>
              <div>
                <p className={`font-bold text-white ${isInactive(o) ? "line-through text-zinc-500" : ""}`}>{o.customer_name}</p>
                {o.customer_phone && <p className="text-zinc-500 text-xs mt-0.5">{o.customer_phone}</p>}
              </div>
              <div className="space-y-0.5">
                {o.was_replaced && (
                  <p className="text-zinc-600 text-xs line-through">
                    {replacementLabel({ product: o.replaced_product, color: o.replaced_color, size: o.replaced_size })}
                  </p>
                )}
                <p className={`text-sm ${isInactive(o) && !o.was_replaced ? "line-through text-zinc-500" : "text-zinc-300"}`}>
                  {o.product || "—"}
                </p>
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
                  {o.status?.toLowerCase() === 'canceled' && (
                    <><span className="mx-2">·</span>Flyer: <span className="text-red-400 font-mono">EGP {o.flyer_cost?.toLocaleString() || 0}</span></>
                  )}
                </div>
                <span className="text-emerald-400 font-bold font-mono text-sm">EGP {o.net_profit?.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(o)} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg font-medium transition-colors">Edit</button>
                <button onClick={() => openReplacingModal(o)} className="flex-1 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs rounded-lg font-medium transition-colors">Replace</button>
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
                    {o.was_replaced && (
                      <p className="text-zinc-600 text-xs line-through mb-0.5">{o.replaced_product}</p>
                    )}
                    <p className={`text-sm ${o.was_replaced ? "text-white font-medium" : "text-zinc-300"}`}>{o.product || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {o.was_replaced ? (
                        <>
                          {o.replaced_color && (
                            <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-600 line-through w-fit">{o.replaced_color}</span>
                          )}
                          {o.color && (
                            <span className="text-[11px] bg-zinc-900 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 w-fit">{o.color}</span>
                          )}
                          {o.replaced_size && (
                            <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-600 line-through w-fit">{o.replaced_size}</span>
                          )}
                          {o.size && (
                            <span className="text-[11px] bg-zinc-900 border border-purple-500/30 px-2 py-0.5 rounded text-purple-300 w-fit">{o.size}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {o.color && <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 w-fit">{o.color}</span>}
                          {o.size && <span className="text-[11px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 w-fit">{o.size}</span>}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-400 text-sm">{o.quantity || 1}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-zinc-400 text-xs capitalize">{platformIcon(o.platform)} {o.platform || "—"}</span></td>
                  <td className="px-4 py-3 text-zinc-400 text-xs capitalize">{o.payment_method || "—"}</td>
                  <td className="px-4 py-3 font-mono text-white text-sm">{o.total_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-blue-400 text-sm">
                    {o.shipping_price?.toLocaleString()}
                    {o.status?.toLowerCase() === 'canceled' && o.flyer_cost > 0 && (
                      <span className="block text-[10px] text-red-400 font-sans">+ {o.flyer_cost} flyer</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-bold text-sm">{o.net_profit?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {o.was_replaced && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">Replaced</span>
                      )}
                      <span className={`px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide w-fit ${statusStyle(o.status)}`}>{o.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(o)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors font-medium">Edit</button>
                      <button onClick={() => openReplacingModal(o)} className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs rounded-lg transition-colors font-medium">Replace</button>
                      <button onClick={() => setDeleteConfirmId(o.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors font-medium">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== CSV Import Preview Modal ===== */}
        {isCsvPreviewOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-base font-bold text-white">Import Orders from CSV</h2>
                  {!importSummary && (
                    <p className="text-xs text-zinc-500 mt-0.5">{matchedCount} matched · {skippedCount} will be skipped</p>
                  )}
                </div>
                <button onClick={closeCsvModal} className="text-zinc-500 hover:text-white text-xl leading-none">✕</button>
              </div>

              {importSummary ? (
                <div className="p-8 text-center space-y-4">
                  <div className="text-4xl">✅</div>
                  <h3 className="text-lg font-bold text-white">Import Complete</h3>
                  <p className="text-sm text-zinc-400">
                    <span className="text-emerald-400 font-bold">{importSummary.imported}</span> orders imported successfully
                    {importSummary.skipped > 0 && (
                      <> · <span className="text-red-400 font-bold">{importSummary.skipped}</span> skipped (product not found)</>
                    )}
                  </p>
                  <button onClick={closeCsvModal} className="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">Platform for all rows</label>
                      <select className={inputClass} value={csvPlatform} onChange={(e) => setCsvPlatform(e.target.value)}>
                        {platforms.map(p => <option key={p} value={p} className="bg-zinc-900 capitalize">{p}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">Payment for all rows</label>
                      <select className={inputClass} value={csvPayment} onChange={(e) => setCsvPayment(e.target.value)}>
                        {payments.map(p => <option key={p} value={p} className="bg-zinc-900 capitalize">{p}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Customer</th>
                          <th className="px-4 py-2.5">Product</th>
                          <th className="px-4 py-2.5">Color</th>
                          <th className="px-4 py-2.5 text-center">Qty</th>
                          <th className="px-4 py-2.5 text-right">Total</th>
                          <th className="px-4 py-2.5 text-right">Shipping</th>
                          <th className="px-4 py-2.5 text-center">Match</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {csvRows.map((row, i) => (
                          <tr key={i} className={row.matchStatus !== 'matched' ? 'opacity-50' : ''}>
                            <td className="px-4 py-2.5 text-zinc-300">{row.customer_name}</td>
                            <td className="px-4 py-2.5 text-zinc-300">{row.product_name}</td>
                            <td className="px-4 py-2.5 text-zinc-400">{row.color || '—'}</td>
                            <td className="px-4 py-2.5 text-center font-mono text-zinc-400">{row.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-white">{row.total_price.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-blue-400">{row.shipping_price.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-center">
                              {row.matchStatus === 'matched' && <span className="text-emerald-400">✓ Matched</span>}
                              {row.matchStatus === 'product_not_found' && <span className="text-red-400">⚠ Product not found</span>}
                              {row.matchStatus === 'variant_not_found' && <span className="text-yellow-400">⚠ Color not found</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
                    <button onClick={closeCsvModal} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors">Cancel</button>
                    <button onClick={confirmCsvImport} disabled={matchedCount === 0 || isImporting}
                      className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black rounded-lg text-sm font-bold transition-colors disabled:opacity-40">
                      {isImporting ? 'Importing...' : `Confirm Import (${matchedCount})`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Cancel + Flyer Cost Modal */}
        {cancelingOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h2 className="text-lg font-bold text-white">Cancel Order</h2>
              <p className="text-sm text-zinc-400">
                Shipping cost for this order: <span className="text-blue-400 font-mono">EGP {cancelingOrder.shipping_price?.toLocaleString() || 0}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">Flyer Cost (EGP)</label>
                <input
                  type="number" min="0" step="0.01" autoFocus
                  value={flyerCostInput}
                  onChange={(e) => setFlyerCostInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-[11px] text-red-400 uppercase tracking-wider mb-1">Total Return Loss</p>
                <p className="text-xl font-bold text-red-400 font-mono">
                  EGP {((cancelingOrder.shipping_price || 0) + (parseFloat(flyerCostInput) || 0)).toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Shipping + Flyer (stock will be restored)</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCancelingOrder(null)} className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition-colors">Back</button>
                <button onClick={confirmCancel} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors">Confirm Cancel</button>
              </div>
            </div>
          </div>
        )}

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
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Current Order</p>
                  <p className="text-zinc-300 font-semibold">{replacingOrder.product}</p>
                  {(replacingOrder.color || replacingOrder.size) && (
                    <p className="text-xs text-zinc-500 mt-0.5">{replacingOrder.color} · {replacingOrder.size}</p>
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
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg px-4 py-3">
                    <p className="text-[11px] text-purple-400 uppercase tracking-wider mb-1">New Order</p>
                    <p className="text-white font-semibold">{replacingProduct?.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{replacingColor} · {replacingSize} · ×{replacingQty} · EGP {((replacingProduct?.price || 0) * (parseInt(replacingQty) || 1)).toLocaleString()}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Order status stays as-is and continues normally afterward.</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setReplacingOrder(null)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium">Cancel</button>
                  <button onClick={handleConfirmReplacing} disabled={!replacingVariant || parseInt(replacingQty) > replacingAvailStock}
                    className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-bold disabled:opacity-40">
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

                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Customer</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Full name" required className={inputClass} value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
                    <input type="text" placeholder="Phone number" className={inputClass} value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Product</p>
                  <select className={inputClass} value={formData.product_id} onChange={(e) => handleProductChange(e.target.value)}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id} className="bg-zinc-900">{p.name} — EGP {p.price}</option>)}
                  </select>
                </div>

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

                {formData.size && (
                  <div>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">Quantity</p>
                    <input type="number" min="1" max={availableStock || undefined} className={inputClass} value={formData.quantity} onChange={(e) => handleQuantityChange(e.target.value)} />
                    {selectedVariant && <p className="text-[11px] text-zinc-600 mt-1">{availableStock} available</p>}
                    {parseInt(formData.quantity) > availableStock && <p className="text-xs text-red-400 mt-1">⚠ Exceeds available stock</p>}
                  </div>
                )}

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
                  {editingOrder?.was_replaced && (
                    <p className="text-[11px] text-purple-400 mb-2">This order was previously replaced — it keeps moving through its normal status.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {statuses.map(s => (
                      <button key={s} type="button" onClick={() => {
                        if (s === "canceled" && editingOrder) { setIsModalOpen(false); openCancelModal(editingOrder); }
                        else setFormData({ ...formData, status: s });
                      }}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize transition-colors border ${
                          formData.status === s
                            ? s === "canceled"  ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : s === "delivered" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : s === "shipped"   ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
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