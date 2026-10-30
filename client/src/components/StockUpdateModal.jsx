import React, { useState } from 'react';
import { Modal } from './Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const StockUpdateModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [type, setType] = useState('ADD'); // 'ADD', 'REMOVE', 'SET'
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchNotifications } = useNotifications();

  if (!product) return null;

  const currentQty = product.availableQuantity || 0;
  const numQty = parseInt(quantity, 10) || 0;

  let projectedQty = currentQty;
  if (type === 'ADD') projectedQty = currentQty + numQty;
  else if (type === 'REMOVE') projectedQty = Math.max(0, currentQty - numQty);
  else if (type === 'SET') projectedQty = numQty;

  const presetReasons = [
    'Supplier shipment arrival',
    'Fulfillment discrepancy adjustment',
    'Damaged or expired inventory removal',
    'Routine cycle audit count',
    'Returned goods restock'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || isNaN(numQty) || numQty < 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (type === 'REMOVE' && numQty > currentQty) {
      toast.error(`Cannot remove ${numQty} units. Only ${currentQty} units available.`);
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for the audit trail');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/inventory/${product._id}/stock`, {
        type,
        quantity: numQty,
        reason: reason.trim()
      });
      toast.success(`Stock successfully updated for ${product.sku}`);
      fetchNotifications();
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Stock Quantity"
      subtitle={`SKU: ${product.sku} – ${product.name}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Adjustment Type Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Adjustment Operation
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('ADD')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                type === 'ADD'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              Stock In (+ADD)
            </button>

            <button
              type="button"
              onClick={() => setType('REMOVE')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                type === 'REMOVE'
                  ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              Stock Out (-REM)
            </button>

            <button
              type="button"
              onClick={() => setType('SET')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                type === 'SET'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              Set Exact
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {type === 'SET' ? 'New Total Quantity' : 'Units to Adjust'}
          </label>
          <input
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 25"
            required
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
          />
        </div>

        {/* Live Preview Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Current Stock:</span>
            <span className="ml-1.5 font-bold text-slate-800">{currentQty} units</span>
          </div>
          <span className="text-slate-400">➔</span>
          <div>
            <span className="text-slate-500">Projected Balance:</span>
            <span
              className={`ml-1.5 font-extrabold ${
                projectedQty === 0
                  ? 'text-rose-600'
                  : projectedQty <= product.minimumStockThreshold
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {projectedQty} units
            </span>
          </div>
        </div>

        {/* Reason for Change */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Adjustment <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Specify reason for audit compliance"
            required
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          />

          {/* Quick presets */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presetReasons.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Confirm Stock Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
