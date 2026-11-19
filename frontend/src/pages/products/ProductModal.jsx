import React, { useState, useEffect } from 'react';
import { Camera, Package, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { productService } from '../../services/productService';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { compressImageFile, getAssetUrl } from '../../utils/imageHelper';

export default function ProductModal({ isOpen, onClose, product = null, onSuccess }) {
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'General',
    unit_price: '',
    gst_rate: '18',
    product_type: 'service',
    image_url: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'General',
        unit_price: product.unit_price || '',
        gst_rate: String(product.gst_rate || 18),
        product_type: product.product_type || 'service',
        image_url: product.image_url || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'General',
        unit_price: '',
        gst_rate: '18',
        product_type: 'service',
        image_url: ''
      });
    }
  }, [product, isOpen]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Compress directly to ultra-light base64 so it stores permanently in DB
      const base64Data = await compressImageFile(file, 300, 0.82);
      setFormData((prev) => ({ ...prev, image_url: base64Data }));
      toast.success('Product image selected!');
    } catch (err) {
      toast.error('Failed to process image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Item name is required.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        await productService.update(product.id, formData);
        toast.success('Item updated successfully!');
      } else {
        await productService.create(formData);
        toast.success('Item created successfully!');
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Item / Service' : 'Add New Product or Service'}
      subtitle="Define pricing, tax defaults, and item photo for auto-fill in invoice creation"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Picture Upload Option */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#1E1F25] border border-slate-200/80 dark:border-slate-800">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600 shadow-sm flex items-center justify-center">
            {formData.image_url ? (
              <img
                src={getAssetUrl(formData.image_url)}
                alt={formData.name || 'Product'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                  }
                }}
              />
            ) : null}
            <Package className={`w-8 h-8 text-slate-400 ${formData.image_url ? 'hidden' : ''}`} />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold">
                ...
              </div>
            )}
          </div>

          <div className="flex-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Item Photo / Service Thumbnail
            </span>
            <p className="text-[11px] text-slate-400 mb-2">
              Add a thumbnail for invoices and catalogue display
            </p>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#282A33] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-finly-purple hover:text-finly-purple transition-all shadow-sm">
                  <Camera className="w-3.5 h-3.5 text-finly-purple" />
                  <span>{isUploading ? 'Uploading...' : 'Choose Image'}</span>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFile}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {formData.image_url && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                  className="text-xs text-rose-500 hover:underline font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <Input
          label="Item or Service Name"
          name="name"
          required
          placeholder="e.g. Full-Stack Web App Development"
          value={formData.name}
          onChange={handleChange}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Type"
            name="product_type"
            value={formData.product_type}
            onChange={handleChange}
            options={[
              { value: 'service', label: 'Service' },
              { value: 'product', label: 'Physical Product' }
            ]}
          />
          <Input
            label="Category"
            name="category"
            placeholder="e.g. Software Development, Hardware, Consulting"
            value={formData.category}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Unit Price (₹)"
            name="unit_price"
            type="number"
            min="0"
            step="any"
            required
            placeholder="0.00"
            value={formData.unit_price}
            onChange={handleChange}
          />

          <Select
            label="Standard GST Rate"
            name="gst_rate"
            value={formData.gst_rate}
            onChange={handleChange}
            options={[
              { value: '0', label: '0% (Exempt)' },
              { value: '5', label: '5% GST' },
              { value: '12', label: '12% GST' },
              { value: '18', label: '18% Standard GST' },
              { value: '28', label: '28% Luxury GST' }
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Description
          </label>
          <textarea
            name="description"
            rows="3"
            placeholder="Default item description displayed on invoices..."
            value={formData.description}
            onChange={handleChange}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#24262E] p-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:border-finly-purple focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
