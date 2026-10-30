import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { OrderStatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { downloadCSV } from '../utils/exportHelpers';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Search,
  Download,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  Package,
  FileText
} from 'lucide-react';

export const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Status Change Confirmation
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get('/orders', { params });
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !targetStatus) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/orders/${selectedOrder._id}/status`, { status: targetStatus });
      toast.success(
        targetStatus === 'CANCELLED'
          ? `Order #${selectedOrder.orderNumber} cancelled and inventory restored!`
          : `Order status updated to ${targetStatus}`
      );
      setStatusConfirmOpen(false);
      setDetailsModalOpen(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/orders?limit=1000&page=1');
      const exportData = res.data.data.map((o) => ({
        'Order Number': o.orderNumber,
        Customer: o.customer?.name,
        Email: o.customer?.email,
        Phone: o.customer?.phone,
        Company: o.customer?.company,
        Total: o.totalAmount,
        Status: o.status,
        'Items Count': o.items?.length,
        'Created Date': o.createdAt
      }));
      downloadCSV(exportData, `StockSense_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Orders exported to CSV!');
    } catch (error) {
      toast.error('Failed to export orders');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Orders & Sales Fulfillment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer shipments, inspect itemized dispatches, and manage status lifecycles ({pagination.total} orders)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
          <Link
            to="/orders/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Order
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer, SKU..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'PROCESSING', 'COMPLETED', 'PENDING', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'All' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Order Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2"></div>
                    <p className="font-medium text-xs">Loading orders from database...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No orders matching criteria</p>
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Order Number */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {ord.orderNumber}
                      </span>
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900 block">{ord.customer?.name}</span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                        {ord.customer?.company || ord.customer?.email}
                      </span>
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">
                        {ord.items?.length || 0} product line{ord.items?.length === 1 ? '' : 's'}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                        {ord.items?.map((i) => `${i.quantity}x ${i.sku}`).join(', ')}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <OrderStatusBadge status={ord.status} />
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateTime(ord.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setDetailsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
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
            Showing <span className="font-semibold text-slate-900">{orders.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{pagination.total}</span> total orders
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

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          title={`Order #${selectedOrder.orderNumber}`}
          subtitle={`Placed on ${formatDateTime(selectedOrder.createdAt)}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-xs">
            {/* Status & Actions Header */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Status</span>
                <div className="mt-1">
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
              </div>

              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTargetStatus('COMPLETED');
                      setStatusConfirmOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
                  >
                    Mark as Completed
                  </button>
                  <button
                    onClick={() => {
                      setTargetStatus('CANCELLED');
                      setStatusConfirmOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold border border-rose-200 transition-colors"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Customer & Shipping Information
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Name:</span>
                  <p className="font-semibold text-slate-900">{selectedOrder.customer?.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Company:</span>
                  <p className="font-semibold text-slate-900">
                    {selectedOrder.customer?.company || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Email:</span>
                  <p className="font-semibold text-slate-900">
                    {selectedOrder.customer?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Phone:</span>
                  <p className="font-semibold text-slate-900">
                    {selectedOrder.customer?.phone || 'N/A'}
                  </p>
                </div>
              </div>
              {selectedOrder.customer?.address && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Delivery Address:</span>
                  <p className="font-semibold text-slate-900">{selectedOrder.customer.address}</p>
                </div>
              )}
            </div>

            {/* Line items table */}
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                Itemized Dispatches
              </h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {item.sku}
                      </span>
                      <p className="font-semibold text-slate-900 mt-0.5">{item.name}</p>
                      <span className="text-[11px] text-slate-400">
                        {formatCurrency(item.unitPrice)} x {item.quantity} units
                      </span>
                    </div>
                    <span className="font-extrabold text-sm text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-slate-50 flex items-center justify-between font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Notes:</span>
                <p className="text-slate-600">{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation for Status Change */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        onClose={() => setStatusConfirmOpen(false)}
        onConfirm={handleUpdateStatus}
        title={targetStatus === 'CANCELLED' ? 'Cancel Order & Restore Stock?' : `Update Status to ${targetStatus}?`}
        message={
          targetStatus === 'CANCELLED'
            ? `Cancelling this order will automatically restore all item quantities back into available warehouse inventory. This action cannot be reversed.`
            : `Are you sure you want to transition order #${selectedOrder?.orderNumber} status to ${targetStatus}?`
        }
        confirmText={targetStatus === 'CANCELLED' ? 'Confirm Cancellation' : 'Update Status'}
        isDestructive={targetStatus === 'CANCELLED'}
        isLoading={updatingStatus}
      />
    </div>
  );
};
