import React, { useState, useEffect } from 'react';
import {
  Building,
  Upload,
  Save,
  Lock,
  User,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  PenTool
} from 'lucide-react';
import toast from 'react-hot-toast';

import { settingService } from '../../services/settingService';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';

export default function Settings() {
  const { user, refreshUser, updateUserSettings, updateUserProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Business settings state
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    gstin: '',
    currency: 'INR',
    currency_symbol: '₹',
    invoice_prefix: 'INV-',
    next_invoice_number: 1001,
    default_tax_rate: 18,
    default_payment_terms: '',
    invoice_footer: '',
    signature_text: 'INFOTECH',
    signature_title: 'AUTHORIZED SIGNATORY',
    signature_font: 'marker',
    signature_image_url: '',
    user_name: '',
    user_phone: '',
    logo_url: ''
  });

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await settingService.getSettings();
      if (res.success && res.settings) {
        const s = res.settings;
        const u = res.user;
        setFormData({
          business_name: s.business_name || u?.business_name || '',
          email: s.email || u?.email || '',
          phone: s.phone || u?.phone || '',
          address: s.address || '',
          city: s.city || '',
          state: s.state || '',
          postal_code: s.postal_code || '',
          country: s.country || 'India',
          gstin: s.gstin || '',
          currency: s.currency || 'INR',
          currency_symbol: s.currency_symbol || '₹',
          invoice_prefix: s.invoice_prefix || 'INV-',
          next_invoice_number: s.next_invoice_number || 1001,
          default_tax_rate: s.default_tax_rate || 18,
          default_payment_terms: s.default_payment_terms || '',
          invoice_footer: s.invoice_footer || '',
          signature_text: s.signature_text || 'INFOTECH',
          signature_title: s.signature_title || 'AUTHORIZED SIGNATORY',
          signature_font: s.signature_font || 'marker',
          signature_image_url: s.signature_image_url || '',
          user_name: u?.name || '',
          user_phone: u?.phone || '',
          logo_url: s.logo_url || ''
        });
      }
    } catch (err) {
      toast.error('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await settingService.updateSettings(formData);
      if (res.success) {
        toast.success('Business configuration updated successfully!');
        updateUserSettings(res.settings);
        if (formData.user_name || formData.user_phone) {
          updateUserProfile({ name: formData.user_name, phone: formData.user_phone });
        }
        await refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('logo', file);

    setUploadingLogo(true);
    try {
      const res = await settingService.uploadLogo(data);
      if (res.success) {
        toast.success('Business logo uploaded successfully!');
        setFormData((prev) => ({ ...prev, logo_url: res.logoUrl }));
        await refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('signature', file);

    setUploadingSignature(true);
    try {
      const res = await settingService.uploadSignature(data);
      if (res.success) {
        toast.success('Default signature image uploaded!');
        setFormData((prev) => ({ ...prev, signature_image_url: res.signatureUrl }));
      }
    } catch (err) {
      toast.error('Failed to upload signature image.');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error('Please enter your current and new password.');
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await settingService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      if (res.success) {
        toast.success('Password changed successfully!');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" label="Loading business settings..." className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          System & Business Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure branding, tax numbers, sequence formats, and invoice defaults
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* 1. Business Profile Card */}
            <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#7F56D9]" />
                <span>Company & Business Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Registered Business Name"
                  name="business_name"
                  required
                  value={formData.business_name}
                  onChange={handleChange}
                />
                <Input
                  label="GSTIN / Corporate Tax ID"
                  name="gstin"
                  placeholder="e.g. 29AABCA1234F1Z5"
                  value={formData.gstin}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Business Billing Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                <Input
                  label="Business Support Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Registered Street Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                />
                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                />
                <Input
                  label="Postal Code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* 2. Invoicing Defaults */}
            <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#7F56D9]" />
                <span>Invoice Formatting & Tax Defaults</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Invoice Number Prefix"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  placeholder="INV-"
                />
                <Input
                  label="Next Sequence Number"
                  name="next_invoice_number"
                  type="number"
                  value={formData.next_invoice_number}
                  onChange={handleChange}
                />
                <Input
                  label="Default GST Rate (%)"
                  name="default_tax_rate"
                  type="number"
                  value={formData.default_tax_rate}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default Currency Code"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  placeholder="INR"
                />
                <Input
                  label="Currency Symbol"
                  name="currency_symbol"
                  value={formData.currency_symbol}
                  onChange={handleChange}
                  placeholder="₹"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Standard Payment Terms & Remittance
                </label>
                <textarea
                  rows="2"
                  name="default_payment_terms"
                  value={formData.default_payment_terms}
                  onChange={handleChange}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] p-3 text-slate-800 dark:text-slate-200 focus:border-[#7F56D9] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Invoice Footer Note
                </label>
                <textarea
                  rows="2"
                  name="invoice_footer"
                  value={formData.invoice_footer}
                  onChange={handleChange}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] p-3 text-slate-800 dark:text-slate-200 focus:border-[#7F56D9] focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Authorized Signature & Signatory */}
            <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-white/5 pb-3 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-[#7F56D9]" />
                <span>Default Invoice Signature & Signatory</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Signatory Name / Text"
                  name="signature_text"
                  value={formData.signature_text}
                  onChange={handleChange}
                  placeholder="e.g. INFOTECH"
                />
                <Input
                  label="Signatory Designation / Subtitle"
                  name="signature_title"
                  value={formData.signature_title}
                  onChange={handleChange}
                  placeholder="e.g. AUTHORIZED SIGNATORY"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Signature Typography Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'marker', name: 'Marker Bold', preview: 'font-sans italic font-black uppercase' },
                    { id: 'caveat', name: 'Caveat Cursive', preview: "font-['Caveat',cursive] font-bold text-lg" },
                    { id: 'script', name: 'Formal Script', preview: 'font-serif italic font-bold' },
                    { id: 'clean', name: 'Clean Sans', preview: 'font-sans font-black tracking-widest uppercase text-xs' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, signature_font: style.id }))}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        formData.signature_font === style.id
                          ? 'border-[#7F56D9] bg-[#7F56D9]/10 text-[#7F56D9] ring-2 ring-[#7F56D9]/20'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-bold block mb-1">{style.name}</span>
                      <span className={style.preview}>{formData.signature_text || 'INFOTECH'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Signature Image */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    Signature Stamp / Digital Seal
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Optional: Upload an official digital signature image file or company seal
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {formData.signature_image_url && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, signature_image_url: '' }))}
                      className="text-xs text-rose-500 hover:underline font-semibold"
                    >
                      Remove
                    </button>
                  )}
                  <label className="cursor-pointer">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-white transition-colors inline-block">
                      {uploadingSignature ? 'Uploading...' : formData.signature_image_url ? 'Replace Image' : 'Upload Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleSignatureUpload}
                      disabled={uploadingSignature}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Vintage Cream Paper Preview */}
              <div className="p-4 bg-[#FAF7EE] rounded-2xl border border-[#E8E2D2] flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Preview On Invoice</span>
                {formData.signature_image_url ? (
                  <img src={formData.signature_image_url} alt="Signature" className="max-h-12 object-contain mb-1" />
                ) : (
                  <div className="relative inline-block mb-1">
                    <span className={`text-2xl text-black ${
                      formData.signature_font === 'caveat' ? "font-['Caveat',cursive] font-bold text-3xl" :
                      formData.signature_font === 'script' ? "font-serif italic font-bold" :
                      formData.signature_font === 'clean' ? "font-sans font-black uppercase text-xl" :
                      "font-sans italic font-black uppercase tracking-wider"
                    }`}>
                      {formData.signature_text || 'INFOTECH'}
                    </span>
                    <svg className="w-32 h-4 text-black mx-auto -mt-1 opacity-90" viewBox="0 0 140 24" fill="none">
                      <path d="M5 16 C 30 18, 55 12, 80 15 C 105 18, 125 10, 135 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono border-t border-slate-300 pt-1 px-4">
                  {formData.signature_title || 'AUTHORIZED SIGNATORY'}
                </span>
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full !bg-[#7F56D9] hover:!bg-[#6941C6] text-white"
              isLoading={savingSettings}
              icon={Save}
            >
              Save Business Configuration
            </Button>
          </form>
        </div>

        {/* Right Column: User Profile & Security */}
        <div className="space-y-6">
          {/* Business Logo Box */}
          <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2">
              Business Logo
            </h2>

            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Company Logo"
                  className="h-20 max-w-full object-contain mb-3"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-[#7F56D9]/10 text-[#7F56D9] flex items-center justify-center mb-3">
                  <Building className="w-8 h-8" />
                </div>
              )}

              <label className="cursor-pointer">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#7F56D9]/10 hover:bg-[#7F56D9]/20 text-[#7F56D9] transition-colors inline-block">
                  {uploadingLogo ? 'Uploading...' : 'Choose Logo Image'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-2">
                PNG, JPG or SVG up to 2MB. Appears on invoice PDFs.
              </p>
            </div>
          </div>

          {/* User Profile */}
          <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#7F56D9]" />
              <span>User Profile</span>
            </h2>

            <Input
              label="Account Full Name"
              name="user_name"
              value={formData.user_name}
              onChange={handleChange}
            />

            <Input
              label="Account Phone"
              name="user_phone"
              value={formData.user_phone}
              onChange={handleChange}
            />

            <div className="pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Primary Account Email
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#7F56D9]" />
              <span>Change Password</span>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                label="Current Password"
                type="password"
                name="currentPassword"
                required
                value={passwords.currentPassword}
                onChange={handlePasswordChange}
              />

              <Input
                label="New Password"
                type="password"
                name="newPassword"
                required
                placeholder="Min 6 characters"
                value={passwords.newPassword}
                onChange={handlePasswordChange}
              />

              <Input
                label="Confirm New Password"
                type="password"
                name="confirmPassword"
                required
                value={passwords.confirmPassword}
                onChange={handlePasswordChange}
              />

              <Button
                type="submit"
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                isLoading={savingPassword}
              >
                Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
