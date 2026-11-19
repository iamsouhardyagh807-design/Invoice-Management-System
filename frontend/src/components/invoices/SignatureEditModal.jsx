import React, { useState, useRef, useEffect } from 'react';
import { X, Check, PenTool, Type, Image as ImageIcon, RotateCcw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import Input from '../common/Input';
import { settingService } from '../../services/settingService';

const FONT_STYLES = [
  { id: 'marker', name: 'Marker Bold', className: "font-sans italic font-black uppercase tracking-wider text-2xl sm:text-3xl text-black" },
  { id: 'caveat', name: 'Caveat Cursive', className: "font-['Caveat',cursive] font-bold text-3xl sm:text-4xl text-black" },
  { id: 'script', name: 'Formal Script', className: "font-serif italic font-bold text-2xl sm:text-3xl text-black" },
  { id: 'clean', name: 'Clean Sans', className: "font-sans font-black tracking-widest uppercase text-xl text-black" }
];

export default function SignatureEditModal({
  isOpen,
  onClose,
  initialData = {},
  onSave,
  allowSaveAsDefault = true
}) {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'draw' | 'upload'
  const [signatureText, setSignatureText] = useState(initialData.signature_text || 'INFOTECH');
  const [signatureTitle, setSignatureTitle] = useState(initialData.signature_title || 'AUTHORIZED SIGNATORY');
  const [fontStyle, setFontStyle] = useState(initialData.signature_font || 'marker');
  const [signatureImageUrl, setSignatureImageUrl] = useState(initialData.signature_image_url || '');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSignatureText(initialData.signature_text || 'INFOTECH');
      setSignatureTitle(initialData.signature_title || 'AUTHORIZED SIGNATORY');
      setFontStyle(initialData.signature_font || 'marker');
      setSignatureImageUrl(initialData.signature_image_url || '');
      setHasDrawn(false);
    }
  }, [isOpen, initialData]);

  // Canvas drawing functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (activeTab === 'draw') {
      setSignatureImageUrl('');
    }
  };

  const handleApplyCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImageUrl(dataUrl);
    toast.success('Signature drawing captured!');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('signature', file);

    setUploading(true);
    try {
      const res = await settingService.uploadSignature(formData);
      if (res.success) {
        setSignatureImageUrl(res.signatureUrl);
        toast.success('Signature image uploaded!');
      }
    } catch (err) {
      toast.error('Failed to upload signature image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImg = signatureImageUrl;
      if (activeTab === 'draw' && hasDrawn && canvasRef.current) {
        finalImg = canvasRef.current.toDataURL('image/png');
      }

      await onSave({
        signature_text: signatureText.trim() || 'INFOTECH',
        signature_title: signatureTitle.trim() || 'AUTHORIZED SIGNATORY',
        signature_font: fontStyle,
        signature_image_url: activeTab === 'text' ? '' : finalImg,
        save_as_default: saveAsDefault
      });
      onClose();
    } catch (err) {
      toast.error('Failed to save signature.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentFont = FONT_STYLES.find(f => f.id === fontStyle) || FONT_STYLES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl border border-slate-100 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#7F56D9]/10 text-[#7F56D9] flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Invoice Signature</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customize the signatory name, designation, and style</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Style Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#141518] rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'text'
                  ? 'bg-white dark:bg-[#1E1F25] text-[#7F56D9] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Styled Typography</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('draw')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'draw'
                  ? 'bg-white dark:bg-[#1E1F25] text-[#7F56D9] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw Signature</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-[#1E1F25] text-[#7F56D9] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
          </div>

          {/* Tab 1: Styled Typography */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <Input
                label="Signature Text / Signatory Name"
                placeholder="e.g. INFOTECH or John Doe"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Signature Font Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyle(f.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        fontStyle === f.id
                          ? 'border-[#7F56D9] bg-[#7F56D9]/5 ring-2 ring-[#7F56D9]/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        {f.name}
                      </span>
                      <span className={f.className}>
                        {signatureText || 'INFOTECH'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Draw Signature */}
          {activeTab === 'draw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Draw with Mouse or Touch Screen
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-xs text-rose-500 hover:underline font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
              <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl bg-white p-2 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="cursor-crosshair touch-none w-full max-w-[420px] h-[140px] bg-slate-50/50 rounded-xl"
                />
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Use your cursor or stylus to sign above
              </p>
            </div>
          )}

          {/* Tab 3: Upload Image */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Upload Signature Stamp / Transparent PNG
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl p-6 text-center space-y-3">
                {signatureImageUrl ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={signatureImageUrl}
                      alt="Signature"
                      className="max-h-20 object-contain p-2 bg-white rounded-xl shadow-sm border border-slate-100 mb-2"
                    />
                    <button
                      type="button"
                      onClick={() => setSignatureImageUrl('')}
                      className="text-xs text-rose-500 hover:underline font-semibold"
                    >
                      Remove and Upload Another
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                    <label className="cursor-pointer">
                      <span className="text-xs font-bold px-4 py-2 rounded-xl bg-[#7F56D9] text-white hover:bg-[#6941C6] transition-colors inline-block">
                        {uploading ? 'Uploading...' : 'Choose Signature File'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-2">
                      PNG with transparent background recommended (Max 2MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signatory Designation / Title */}
          <Input
            label="Signatory Designation / Subtitle"
            placeholder="e.g. AUTHORIZED SIGNATORY or General Manager"
            value={signatureTitle}
            onChange={(e) => setSignatureTitle(e.target.value)}
            required
          />

          {/* Live Preview on Cream Paper */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#7F56D9]" />
              <span>Live Invoice Preview</span>
            </span>
            <div className="bg-[#FAF7EE] p-6 rounded-2xl border border-[#E8E2D2] flex flex-col items-center justify-center text-center">
              {activeTab === 'upload' && signatureImageUrl ? (
                <img
                  src={signatureImageUrl}
                  alt="Signature Preview"
                  className="max-h-12 object-contain mb-1"
                />
              ) : activeTab === 'draw' && hasDrawn ? (
                <p className="text-xs text-slate-500 italic py-2">Drawn signature ready</p>
              ) : (
                <div className="relative inline-block mb-1">
                  <span className={currentFont.className}>
                    {signatureText || 'INFOTECH'}
                  </span>
                  <svg
                    className="w-36 h-4 text-black mx-auto -mt-1 opacity-90"
                    viewBox="0 0 140 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 16 C 30 18, 55 12, 80 15 C 105 18, 125 10, 135 14"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              <span className="text-[10px] text-slate-600 uppercase tracking-widest font-mono border-t border-slate-300 pt-1 px-4 mt-1">
                {signatureTitle || 'AUTHORIZED SIGNATORY'}
              </span>
            </div>
          </div>

          {/* Save As Default Checkbox */}
          {allowSaveAsDefault && (
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#141518] border border-slate-200 dark:border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="w-4 h-4 rounded text-[#7F56D9] focus:ring-[#7F56D9] cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Save as default signature for future invoices
              </span>
            </label>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#141518] border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={isSaving}
            icon={Check}
            className="!bg-[#7F56D9] hover:!bg-[#6941C6] text-white"
          >
            Apply Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
