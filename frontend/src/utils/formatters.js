import dayjs from 'dayjs';

export function formatCurrency(amount, symbol = '₹') {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol}${formatted}`;
}

export function formatDate(dateStr, format = 'DD MMM YYYY') {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format(format);
}

export function getStatusBadgeConfig(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return {
        label: 'Paid',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    case 'partially_paid':
      return {
        label: 'Partially Paid',
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'pending':
      return {
        label: 'Pending',
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'overdue':
      return {
        label: 'Overdue',
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'draft':
      return {
        label: 'Draft',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400'
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-gray-100 text-gray-500 border-gray-200',
        dot: 'bg-gray-400'
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-slate-50 text-slate-600 border-slate-200',
        dot: 'bg-slate-400'
      };
  }
}
