import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { MovementTypeBadge } from '../components/Badge';
import { formatDateTime, formatNumber } from '../utils/formatters';
import { downloadCSV } from '../utils/exportHelpers';
import toast from 'react-hot-toast';
import {
  History,
  Search,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';

export const StockHistory = () => {
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (typeFilter !== 'All') params.type = typeFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/inventory/history', { params });
      setMovements(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, typeFilter, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/inventory/history?limit=1000&page=1');
      const exportData = res.data.data.map((m) => ({
        SKU: m.sku,
        'Product Name': m.productName,
        'Movement Type': m.type,
        'Quantity Delta': m.quantityChanged,
        'Previous Units': m.previousQuantity,
        'New Units': m.newQuantity,
        Reason: m.reason,
        Reference: m.referenceId,
        'Operator Name': m.updatedBy?.name,
        'Timestamp': m.createdAt
      }));
      downloadCSV(exportData, `StockSense_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Audit trail exported to CSV!');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Stock Movement & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all inventory modifications, shipments, cycle counts, and restoration events
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition-all"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Export Audit CSV
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, product name, reason..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="All">All Movement Types</option>
              <option value="STOCK_IN">Stock In (Receipts)</option>
              <option value="STOCK_OUT">Stock Out (Dispatches)</option>
              <option value="ADJUSTMENT">Adjustments (Corrections)</option>
              <option value="ORDER_DEDUCTION">Order Sales Deductions</option>
              <option value="ORDER_RESTORE">Order Cancellations (Restored)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-700"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">SKU & Item</th>
                <th className="py-3.5 px-4">Operation</th>
                <th className="py-3.5 px-4">Change Delta</th>
                <th className="py-3.5 px-4">Balance (Before ➔ After)</th>
                <th className="py-3.5 px-4">Reason / Reference</th>
                <th className="py-3.5 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2"></div>
                    <p className="font-medium text-xs">Querying audit history records...</p>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No movements logged</p>
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.createdAt)}
                    </td>

                    {/* SKU & Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {m.sku}
                      </span>
                      <p className="font-semibold text-slate-800 truncate max-w-xs mt-0.5">
                        {m.productName}
                      </p>
                    </td>

                    {/* Operation Type */}
                    <td className="py-3.5 px-4">
                      <MovementTypeBadge type={m.type} />
                    </td>

                    {/* Quantity Changed */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-extrabold text-xs inline-flex items-center gap-1 ${
                          m.quantityChanged > 0
                            ? 'text-emerald-600'
                            : m.quantityChanged < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {m.quantityChanged > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {m.quantityChanged < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged} units
                      </span>
                    </td>

                    {/* Before -> After */}
                    <td className="py-3.5 px-4 text-slate-700 font-mono">
                      <span>{m.previousQuantity}</span>
                      <span className="text-slate-400 mx-1.5">➔</span>
                      <span className="font-bold text-slate-900">{m.newQuantity}</span>
                    </td>

                    {/* Reason / Reference */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-700 font-medium truncate">{m.reason}</p>
                      {m.referenceId && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Ref: {m.referenceId}
                        </span>
                      )}
                    </td>

                    {/* Operator */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">
                        {m.updatedBy?.name || 'System'}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {m.updatedBy?.role || 'Service'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{movements.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{pagination.total}</span> audit entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800 px-2">
              Page {pagination.page} of {pagination.pages || 1}
            </span>
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))
              }
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
