// components/VariantEditor.tsx
'use client';

import { useState } from 'react';

const SIZES = ['One Size', 'S', 'M', 'L', 'XL', 'XXL'];

export interface VariantRow {
  id?: number;
  color: string;
  size: string;
  stock: number;
}

interface Props {
  variants: VariantRow[];
  onChange: (variants: VariantRow[]) => void;
}

const inputClass = "w-full bg-[#121214] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors";

export default function VariantEditor({ variants, onChange }: Props) {
  const [newColor, setNewColor] = useState('');

  const colors = [...new Set(variants.map(v => v.color))];

  const addColor = () => {
    const color = newColor.trim();
    if (!color || colors.some(c => c.toLowerCase() === color.toLowerCase())) return;
    const newVariants = SIZES.map(size => ({ color, size, stock: 0 }));
    onChange([...variants, ...newVariants]);
    setNewColor('');
  };

  const removeColor = (color: string) => {
    onChange(variants.filter(v => v.color !== color));
  };

  const updateStock = (color: string, size: string, stock: number) => {
    onChange(variants.map(v => v.color === color && v.size === size ? { ...v, stock } : v));
  };

  return (
    <div className="space-y-3">
      {/* إضافة لون */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add color (e.g. Black, White...)"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }}
          className={inputClass}
        />
        <button
          type="button"
          onClick={addColor}
          className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg whitespace-nowrap hover:bg-zinc-200 transition-colors"
        >
          + Add
        </button>
      </div>

      {/* جدول الـ variants */}
      {colors.length > 0 && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left text-zinc-500 uppercase tracking-wider">Color</th>
                {SIZES.map(s => (
                  <th key={s} className="px-2 py-2 text-center text-zinc-500 uppercase tracking-wider">{s}</th>
                ))}
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {colors.map(color => (
                <tr key={color} className="hover:bg-zinc-900/30">
                  <td className="px-3 py-2 font-medium text-white">{color}</td>
                  {SIZES.map(size => {
                    const variant = variants.find(v => v.color === color && v.size === size);
                    return (
                      <td key={size} className="px-1 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          value={variant?.stock ?? 0}
                          onChange={(e) => updateStock(color, size, parseInt(e.target.value) || 0)}
                          className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1 py-1 text-center text-white text-xs focus:outline-none focus:border-zinc-600"
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeColor(color)}
                      className="text-red-400 hover:text-red-300 text-xs px-1.5 py-1 rounded hover:bg-red-500/10 transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
