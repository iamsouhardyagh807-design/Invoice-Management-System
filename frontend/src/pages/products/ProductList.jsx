import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Tag,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

import { productService } from '../../services/productService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProductModal from './ProductModal';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Deletion
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll({
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        category: categoryFilter || undefined
      });
      if (data.success) {
        setProducts(data.products);
      }
    } catch (err) {
      toast.error('Failed to load products/services catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, typeFilter, categoryFilter]);

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const handleOpenDelete = (product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productService.delete(productToDelete.id);
      toast.success(`"${productToDelete.name}" deleted from catalogue.`);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const distinctCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Products & Services
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catalogue items for rapid invoice generation and standard rate management
          </p>
        </div>

        <Button icon={Plus} onClick={handleOpenAdd} className="!bg-[#7F56D9] hover:!bg-[#6941C6] text-white">
          Add Product / Service
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, categories, descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#141518] pl-9 pr-4 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#141518] focus:border-[#7F56D9] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#7F56D9]"
          >
            <option value="">All Types (Product & Service)</option>
            <option value="service">Services Only</option>
            <option value="product">Products Only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#7F56D9]"
          >
            <option value="">All Categories</option>
            {distinctCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner size="lg" label="Loading catalogue..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No catalogue items found"
          description={
            search || typeFilter || categoryFilter
              ? 'No products match your filter criteria.'
              : 'Add your services and products to quickly auto-fill invoice line items.'
          }
          actionLabel="Add Catalogue Item"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="bg-white dark:bg-[#1E1F25] rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 bg-slate-50/50 dark:bg-white/5">
                  <th className="py-3.5 px-6">Item / Service</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6 text-right">Standard Rate</th>
                  <th className="py-3.5 px-6 text-right">GST Rate</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
                            <Package className="w-5 h-5 text-[#7F56D9]" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-md leading-tight">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {p.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          p.product_type === 'service'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40'
                        }`}
                      >
                        {p.product_type === 'service' ? 'Service' : 'Product'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(p.unit_price)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {p.gst_rate}%
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(p)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editingProduct}
        onSuccess={fetchProducts}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Catalogue Item"
        message={`Are you sure you want to delete "${productToDelete?.name}"? Existing invoices containing this item will retain their historical line item data.`}
        confirmText="Delete Item"
      />
    </div>
  );
}
