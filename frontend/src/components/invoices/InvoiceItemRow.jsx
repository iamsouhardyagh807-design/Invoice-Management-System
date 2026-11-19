import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { getAssetUrl } from '../../utils/imageHelper';

export default function InvoiceItemRow({
  item,
  index,
  products = [],
  onChange,
  onRemove,
  canRemove = true
}) {
  const handleProductSelect = (e) => {
    const prodId = e.target.value;
    if (!prodId) {
      onChange(index, {
        product_id: null,
        item_name: '',
        description: '',
        unit_price: 0,
        tax_percent: 18
      });
      return;
    }

    const selected = products.find((p) => String(p.id) === String(prodId));
    if (selected) {
      onChange(index, {
        product_id: selected.id,
        item_name: selected.name,
        description: selected.description || '',
        unit_price: Number(selected.unit_price) || 0,
        tax_percent: Number(selected.gst_rate) || 18,
        image_url: selected.image_url || ''
      });
    }
  };

  const handleFieldChange = (field, value) => {
    onChange(index, { [field]: value });
  };

  // Line total calculation
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  const discPct = Number(item.discount_percent) || 0;
  const taxPct = Number(item.tax_percent) || 0;

  const base = qty * price;
  const disc = base * (discPct / 100);
  const taxable = Math.max(0, base - disc);
  const tax = taxable * (taxPct / 100);
  const lineTotal = Math.round((taxable + tax) * 100) / 100;

  return (
    <div className="grid grid-cols-12 gap-2 sm:gap-3 items-start py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 p-2 rounded-xl transition-colors">
      {/* Product Selector / Name & Description */}
      <div className="col-span-12 md:col-span-4 space-y-1.5">
        <select
          value={item.product_id || ''}
          onChange={handleProductSelect}
          className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">-- Choose saved item or type custom --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (₹{Number(p.unit_price).toLocaleString('en-IN')})
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          {item.image_url && (
            <img
              src={getAssetUrl(item.image_url)}
              alt="Item thumbnail"
              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <input
            type="text"
            placeholder="Item title / service name *"
            required
            value={item.item_name || ''}
            onChange={(e) => handleFieldChange('item_name', e.target.value)}
            className="w-full text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <input
          type="text"
          placeholder="Detailed description (optional)"
          value={item.description || ''}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-600 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Quantity */}
      <div className="col-span-3 md:col-span-1">
        <label className="block text-[10px] font-bold uppercase text-slate-400 md:hidden mb-1">Qty</label>
        <input
          type="number"
          min="0.01"
          step="any"
          value={item.quantity}
          onChange={(e) => handleFieldChange('quantity', e.target.value)}
          className="w-full text-xs text-right rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[10px] font-bold uppercase text-slate-400 md:hidden mb-1">Unit Price (₹)</label>
        <input
          type="number"
          min="0"
          step="any"
          value={item.unit_price}
          onChange={(e) => handleFieldChange('unit_price', e.target.value)}
          className="w-full text-xs text-right rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Discount % */}
      <div className="col-span-2 md:col-span-1">
        <label className="block text-[10px] font-bold uppercase text-slate-400 md:hidden mb-1">Disc %</label>
        <input
          type="number"
          min="0"
          max="100"
          step="any"
          value={item.discount_percent}
          onChange={(e) => handleFieldChange('discount_percent', e.target.value)}
          className="w-full text-xs text-right rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-800 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Tax % */}
      <div className="col-span-3 md:col-span-1">
        <label className="block text-[10px] font-bold uppercase text-slate-400 md:hidden mb-1">GST %</label>
        <select
          value={item.tax_percent}
          onChange={(e) => handleFieldChange('tax_percent', e.target.value)}
          className="w-full text-xs rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-slate-800 focus:border-indigo-500 focus:outline-none"
        >
          <option value="0">0%</option>
          <option value="5">5%</option>
          <option value="12">12%</option>
          <option value="18">18%</option>
          <option value="28">28%</option>
        </select>
      </div>

      {/* Line Total */}
      <div className="col-span-10 md:col-span-2 flex flex-col justify-center items-end pt-1">
        <label className="block text-[10px] font-bold uppercase text-slate-400 md:hidden mb-1">Total</label>
        <span className="text-sm font-bold text-slate-900">
          {formatCurrency(lineTotal)}
        </span>
        {disc > 0 && (
          <span className="text-[10px] text-rose-500 font-medium">
            Saved {formatCurrency(disc)}
          </span>
        )}
      </div>

      {/* Remove Button */}
      <div className="col-span-2 md:col-span-1 flex justify-center pt-1.5">
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Remove Item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
