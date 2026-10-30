import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { StockBadge, OrderStatusBadge, MovementTypeBadge } from '../components/Badge';
import { StockUpdateModal } from '../components/StockUpdateModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/formatters';
import {
  Boxes,
  Layers,
  AlertTriangle,
  ShoppingCart,
  PlusCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

export const OperatorDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchOperatorData = async () => {
    try {
      setLoading(true);
      const [sumRes, lowRes, ordRes, histRes] = await Promise.all([
        api.get('/inventory/summary'),
        api.get('/inventory/low-stock?limit=6'),
        api.get('/orders?limit=6'),
        api.get('/inventory/history?limit=6')
      ]);

      setSummary(sumRes.data.data);
      setLowStock(lowRes.data.data);
      setRecentOrders(ordRes.data.data);
      setRecentMovements(histRes.data.data);
    } catch (error) {
      console.error('Failed to load operator dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperatorData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Operator Welcome Header & Quick Action Buttons */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400">
            Warehouse Operations Station
          </span>
          <h2 className="text-xl font-extrabold mt-0.5">Welcome, Warehouse Operator</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Monitor inventory thresholds, execute quick stock updates, fulfill customer orders, and log warehouse receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/orders/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create Customer Order
          </Link>
          <Link
            to="/inventory"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all"
          >
            <Search className="w-4 h-4" />
            Search Catalog
          </Link>
        </div>
      </div>

      {/* 4 Primary Operator Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Products"
          value={formatNumber(summary?.totalProducts)}
          subtitle="Catalog SKUs"
          icon={Boxes}
          color="blue"
        />
        <StatCard
          title="Total Stock Units"
          value={formatNumber(summary?.totalStockUnits)}
          subtitle="Total items in warehouse"
          icon={Layers}
          color="indigo"
        />
        <StatCard
          title="Low Stock Alerts"
          value={formatNumber(summary?.lowStockCount + summary?.outOfStockCount)}
          subtitle="Requires restocking"
          icon={AlertTriangle}
          color="amber"
          trend={summary?.lowStockCount > 0 ? 'Urgent' : 'Optimal'}
        />
        <StatCard
          title="Recent Orders"
          value={formatNumber(recentOrders.length)}
          subtitle="Latest order requests"
          icon={ShoppingCart}
          color="emerald"
        />
      </div>

      {/* Main Operator Section: Low-Stock Quick Restock Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Action Required: Low Stock & Depleted Items
              </h3>
              <p className="text-xs text-slate-500">
                Adjust stock quantities directly when receiving physical deliveries
              </p>
            </div>
          </div>
          <Link
            to="/inventory?status=LOW_STOCK"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            View all alerts <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
              <tr>
                <th className="py-3 px-4">SKU & Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Current Units</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lowStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No low stock items! Warehouse stock levels are healthy.
                  </td>
                </tr>
              ) : (
                lowStock.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{prod.sku}</span>
                      <span className="text-slate-600 truncate max-w-xs block">{prod.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{prod.category}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {prod.warehouseLocation || 'Zone A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-sm text-slate-900">
                        {prod.availableQuantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{prod.minimumStockThreshold}</td>
                    <td className="py-3 px-4">
                      <StockBadge status={prod.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedProduct(prod);
                          setStockModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm"
                      >
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Grid: Recent Orders & Stock Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              Recent Warehouse Orders
            </h3>
            <Link to="/orders" className="text-xs font-semibold text-blue-600 hover:underline">
              View orders list
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No orders logged yet</p>
            ) : (
              recentOrders.map((ord) => (
                <div key={ord._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-800">{ord.orderNumber}</span>
                    <p className="text-slate-500 text-[11px]">{ord.customer?.name}</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {ord.items?.length || 0} item(s)
                      </span>
                    </div>
                    <OrderStatusBadge status={ord.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Stock Movements Stream */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Recent Inventory Audit Trail
            </h3>
            <Link to="/history" className="text-xs font-semibold text-blue-600 hover:underline">
              View full audit
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentMovements.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">No recent stock movements</p>
            ) : (
              recentMovements.map((m) => (
                <div key={m._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <MovementTypeBadge type={m.type} />
                      <span className="font-mono font-bold text-slate-800">{m.sku}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{m.reason}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-extrabold ${
                        m.quantityChanged > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantityChanged > 0 ? `+${m.quantityChanged}` : m.quantityChanged} units
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {formatDateTime(m.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      <StockUpdateModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        product={selectedProduct}
        onSuccess={fetchOperatorData}
      />

      <ProductDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        product={selectedProduct}
        onOpenStockAdjust={(p) => {
          setSelectedProduct(p);
          setStockModalOpen(true);
        }}
      />
    </div>
  );
};
