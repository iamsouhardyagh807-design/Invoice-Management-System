import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Building,
  Mail,
  Phone,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

import { customerService } from '../../services/customerService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import CustomerModal from './CustomerModal';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Deletion
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getAll({
        search: search.trim() || undefined,
        state: stateFilter || undefined
      });
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      toast.error('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, stateFilter]);

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleOpenDelete = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await customerService.delete(customerToDelete.id);
      toast.success(`Customer "${customerToDelete.name}" deleted successfully.`);
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct states for filtering
  const distinctStates = Array.from(
    new Set(customers.map((c) => c.state).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage clients, billing information, and transaction histories
          </p>
        </div>

        <Button icon={UserPlus} onClick={handleOpenAdd} className="!bg-[#7F56D9] hover:!bg-[#6941C6] text-white">
          Add New Customer
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-[#1E1F25] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-[#141518] pl-9 pr-4 py-2 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#141518] focus:border-[#7F56D9] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141518] px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#7F56D9]"
          >
            <option value="">All States / Locations</option>
            {distinctStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers List Table */}
      {loading ? (
        <Spinner size="lg" label="Loading customer directory..." />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={
            search || stateFilter
              ? 'No clients match your filter criteria.'
              : 'Add your first client to start sending invoices.'
          }
          actionLabel="Add Customer"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="bg-white dark:bg-[#1E1F25] rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 bg-slate-50/50 dark:bg-white/5">
                  <th className="py-3.5 px-6">Customer / Company</th>
                  <th className="py-3.5 px-6">Contact Info</th>
                  <th className="py-3.5 px-6">Location</th>
                  <th className="py-3.5 px-6 text-center">Invoices</th>
                  <th className="py-3.5 px-6 text-right">Total Billed</th>
                  <th className="py-3.5 px-6 text-right">Outstanding</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        {c.avatar_url ? (
                          <img
                            src={c.avatar_url}
                            alt={c.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/customers/${c.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-[#7F56D9] transition-colors leading-tight block"
                          >
                            {c.name}
                          </Link>
                          {c.company_name && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 leading-tight">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{c.company_name}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 space-y-0.5">
                      {c.email ? (
                        <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </p>
                      ) : (
                        <span className="text-slate-400 italic">No email</span>
                      )}
                      {c.phone && (
                        <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300">
                      {c.city ? `${c.city}${c.state ? `, ${c.state}` : ''}` : c.state || '—'}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {c.total_invoices || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(c.total_billed)}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold">
                      <span className={Number(c.outstanding_balance) > 0 ? 'text-rose-500' : 'text-emerald-500'}>
                        {formatCurrency(c.outstanding_balance)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/customers/${c.id}`}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="View Customer Overview"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#7F56D9] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(c)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Customer"
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

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={editingCustomer}
        onSuccess={fetchCustomers}
      />

      {/* Customer Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Customer Record"
        message={`Are you sure you want to delete "${customerToDelete?.name}"? If this customer has existing invoices, deletion will be safely rejected to prevent data loss.`}
        confirmText="Delete Customer"
      />
    </div>
  );
}
