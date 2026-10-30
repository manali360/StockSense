import React from 'react';
import { Modal } from './Modal';
import { StockBadge, MovementTypeBadge } from './Badge';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  MapPin,
  Building2,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  Package,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProductDetailModal = ({
  isOpen,
  onClose,
  product,
  onOpenStockAdjust,
  onOpenEdit
}) => {
  const { isAdmin } = useAuth();
  if (!product) return null;

  const totalCost = (product.availableQuantity || 0) * (product.purchasePrice || 0);
  const totalRetail = (product.availableQuantity || 0) * (product.sellingPrice || 0);
  const margin =
    product.sellingPrice > 0
      ? (((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100).toFixed(1)
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku} • Category: ${product.category}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Top Header info */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Live Stock Status
            </span>
            <div className="mt-1 flex items-center gap-3">
              <StockBadge status={product.status} />
              <span className="text-xl font-extrabold text-slate-900">
                {product.availableQuantity} units
              </span>
              <span className="text-xs text-slate-500">
                (Min threshold: {product.minimumStockThreshold})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenStockAdjust(product);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Adjust Stock
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEdit(product);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-slate-700 border border-slate-300 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>

        {/* 4 KPI metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Purchase Cost</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {formatCurrency(product.purchasePrice)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Selling Price</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {formatCurrency(product.sellingPrice)}
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Profit Margin</span>
            <p className="text-base font-bold text-emerald-600 mt-0.5">
              {margin}%
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Total Asset Value</span>
            <p className="text-base font-bold text-blue-600 mt-0.5">
              {formatCurrency(totalRetail)}
            </p>
          </div>
        </div>

        {/* Specifications and Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" /> Logistics & Location
            </h4>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Warehouse Location:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {product.warehouseLocation || 'General Storage'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Supplier:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                {product.supplierName || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Brand / Maker:</span>
              <span className="font-semibold text-slate-800">{product.brand || 'Generic'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> Audit & Metadata
            </h4>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Units Cost:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Created:</span>
              <span className="font-semibold text-slate-800">{formatDateTime(product.createdAt)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Last Modified:</span>
              <span className="font-semibold text-slate-800">{formatDateTime(product.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <h4 className="font-bold text-slate-900 mb-1">Product Description</h4>
            <p className="text-slate-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Recent Movements Audit if present */}
        {product.recentMovements && product.recentMovements.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" /> Recent Stock Movements
            </h4>
            <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
              {product.recentMovements.map((m) => (
                <div key={m._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <MovementTypeBadge type={m.type} />
                    <span className="text-slate-600">{m.reason}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold ${
                        m.quantityChanged > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged} units
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
