import React, { useState, useEffect } from 'react';
import { Camera, User, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerService } from '../../services/customerService';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { compressImageFile, getAssetUrl } from '../../utils/imageHelper';

export default function CustomerModal({ isOpen, onClose, customer = null, onSuccess }) {
  const isEditing = !!customer;

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    billing_address: '',
    city: '',
    state: '',
    postal_code: '',
    gstin: '',
    avatar_url: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        company_name: customer.company_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        billing_address: customer.billing_address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        gstin: customer.gstin || '',
        avatar_url: customer.avatar_url || '',
        notes: customer.notes || ''
      });
    } else {
      setFormData({
        name: '',
        company_name: '',
        email: '',
        phone: '',
        billing_address: '',
        city: '',
        state: '',
        postal_code: '',
        gstin: '',
        avatar_url: '',
        notes: ''
      });
    }
  }, [customer, isOpen]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Compress to lightweight base64 so it stores permanently in DB across Vercel & Render
      const base64Data = await compressImageFile(file, 250, 0.82);
      setFormData((prev) => ({ ...prev, avatar_url: base64Data }));
      toast.success('Customer picture selected!');
    } catch (err) {
      toast.error('Failed to process picture.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Customer name is required.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        await customerService.update(customer.id, formData);
        toast.success('Customer updated successfully!');
      } else {
        await customerService.create(formData);
        toast.success('Customer created successfully!');
      }
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Customer Details' : 'Add New Customer'}
      subtitle="Manage profile photo, contact, billing, and tax information"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Picture Upload Option */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-[#1E1F25] border border-slate-200/80 dark:border-slate-800">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border-2 border-white dark:border-slate-600 shadow-sm flex items-center justify-center">
            {formData.avatar_url ? (
              <img
                src={getAssetUrl(formData.avatar_url)}
                alt={formData.name || 'Customer'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.classList.remove('hidden');
                  }
                }}
              />
            ) : null}
            <User className={`w-8 h-8 text-slate-400 ${formData.avatar_url ? 'hidden' : ''}`} />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold">
                ...
              </div>
            )}
          </div>

          <div className="flex-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Customer Profile Picture
            </span>
            <p className="text-[11px] text-slate-400 mb-2">
              Upload customer photo or avatar (JPG, PNG, WebP)
            </p>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#282A33] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-finly-purple hover:text-finly-purple transition-all shadow-sm">
                  <Camera className="w-3.5 h-3.5 text-finly-purple" />
                  <span>{isUploading ? 'Uploading...' : 'Choose Photo'}</span>
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarFile}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {formData.avatar_url && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, avatar_url: '' }))}
                  className="text-xs text-rose-500 hover:underline font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Customer Full Name"
            name="name"
            required
            placeholder="e.g. Rajesh Sharma"
            value={formData.name}
            onChange={handleChange}
          />
          <Input
            label="Company Name"
            name="company_name"
            placeholder="e.g. Quantum Innovations Ltd"
            value={formData.company_name}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="finance@client.com"
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <Input
          label="Billing Address"
          name="billing_address"
          placeholder="Floor, Building, Street Address"
          value={formData.billing_address}
          onChange={handleChange}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="City"
            name="city"
            placeholder="e.g. Bengaluru"
            value={formData.city}
            onChange={handleChange}
          />
          <Input
            label="State"
            name="state"
            placeholder="e.g. Karnataka"
            value={formData.state}
            onChange={handleChange}
          />
          <Input
            label="Postal Code"
            name="postal_code"
            placeholder="560100"
            value={formData.postal_code}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="GSTIN (Optional)"
            name="gstin"
            placeholder="e.g. 29AAACZ9876C1Z4"
            value={formData.gstin}
            onChange={handleChange}
          />
          <Input
            label="Internal Notes"
            name="notes"
            placeholder="Payment terms, contact person, etc."
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
