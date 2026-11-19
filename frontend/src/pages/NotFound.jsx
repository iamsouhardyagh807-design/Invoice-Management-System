import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
      <div className="max-w-md bg-white p-8 sm:p-12 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">404</h1>
        <h2 className="text-lg font-bold text-slate-800 mt-1">Page Not Found</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          The requested page or invoice resource does not exist or has been moved.
        </p>
        <Link to="/dashboard">
          <Button icon={ArrowLeft} className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
