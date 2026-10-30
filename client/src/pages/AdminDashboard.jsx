import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { StockBadge, OrderStatusBadge, MovementTypeBadge } from '../components/Badge';
import { StockUpdateModal } from '../components/StockUpdateModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/formatters';
import '../utils/chartConfig';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Boxes,
  Layers,
  AlertTriangle,
  XCircle,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  Plus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/dashboard');
      setData(res.data.data);
    } catch (error) {
      console.error('Failed to load dashboard analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-2xl"></div>
          <div className="h-72 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const {
    summary = {},
    categoryDistribution = [],
    stockMovementsTrends = [],
    monthlyOrders = [],
    topSelling = [],
    recentMovements = [],
    recentOrders = [],
    lowStockPreview = []
  } = data || {};

  // Chart 1: Category Distribution (Doughnut)
  const categoryLabels = categoryDistribution.map((c) => c._id || 'Unassigned');
  const categoryUnits = categoryDistribution.map((c) => c.totalStock);
  const categoryChartData = {
    labels: categoryLabels,
    datasets: [
      {
        data: categoryUnits,
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#6366f1',
          '#ec4899',
          '#8b5cf6',
          '#14b8a6',
          '#f97316'
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }
    ]
  };

  // Chart 2: Stock-In vs Stock-Out Trends (Bar)
  // Aggregate movement trends into grouped months
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsMap = {};
  stockMovementsTrends.forEach((m) => {
    const key = `${monthNames[m._id.month - 1] || 'M'}`;
    if (!monthsMap[key]) monthsMap[key] = { in: 0, out: 0 };
    if (m._id.type === 'STOCK_IN' || m._id.type === 'ORDER_RESTORE') {
      monthsMap[key].in += m.totalQuantity;
    } else {
      monthsMap[key].out += m.totalQuantity;
    }
  });

  const movementLabels = Object.keys(monthsMap).length > 0 ? Object.keys(monthsMap) : ['Recent'];
  const stockInValues = movementLabels.map((lbl) => monthsMap[lbl]?.in || 0);
  const stockOutValues = movementLabels.map((lbl) => monthsMap[lbl]?.out || 0);

  const stockMovementChartData = {
    labels: movementLabels,
    datasets: [
      {
        label: 'Stock In (Intake)',
        data: stockInValues,
        backgroundColor: '#10b981',
        borderRadius: 6
      },
      {
        label: 'Stock Out (Dispatched)',
        data: stockOutValues,
        backgroundColor: '#f43f5e',
        borderRadius: 6
      }
    ]
  };

  // Chart 3: Monthly Order Revenue Trends (Line)
  const orderLabels = monthlyOrders.map((o) => `${monthNames[o._id.month - 1] || 'M'} ${o._id.year}`);
  const orderRevenues = monthlyOrders.map((o) => o.revenue);
  const orderChartData = {
    labels: orderLabels.length > 0 ? orderLabels : ['Current'],
    datasets: [
      {
        label: 'Gross Sales Revenue ($)',
        data: orderRevenues.length > 0 ? orderRevenues : [summary.totalRevenue || 0],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#2563eb'
      }
    ]
  };

  // Chart 4: Top Selling Products (Bar)
  const topProdLabels = topSelling.map((t) => t.name.length > 18 ? t.name.substring(0, 18) + '...' : t.name);
  const topProdUnits = topSelling.map((t) => t.totalUnitsSold);
  const topProdChartData = {
    labels: topProdLabels,
    datasets: [
      {
        label: 'Units Sold',
        data: topProdUnits,
        backgroundColor: '#6366f1',
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Executive Admin Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time warehouse KPIs, automated stock alerts, and fulfillment metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh Dashboard Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedProduct(null);
              setProductFormOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
          <Link
            to="/orders/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            Create Order
          </Link>
        </div>
      </div>

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Products"
          value={formatNumber(summary.totalProducts)}
          subtitle="Catalog SKUs"
          icon={Boxes}
          color="blue"
        />
        <StatCard
          title="Total Stock Units"
          value={formatNumber(summary.totalStockUnits)}
          subtitle="Physical inventory"
          icon={Layers}
          color="purple"
        />
        <StatCard
          title="Low Stock"
          value={formatNumber(summary.lowStockCount)}
          subtitle="At or below threshold"
          icon={AlertTriangle}
          color="amber"
          trend={summary.lowStockCount > 0 ? 'Action Req' : 'Healthy'}
        />
        <StatCard
          title="Out of Stock"
          value={formatNumber(summary.outOfStockCount)}
          subtitle="0 units remaining"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(summary.totalValuationRetail)}
          subtitle={`Cost: ${formatCurrency(summary.totalValuationCost)}`}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Total Orders"
          value={formatNumber(summary.totalOrders)}
          subtitle={`Revenue: ${formatCurrency(summary.totalRevenue)}`}
          icon={ShoppingCart}
          color="indigo"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Category Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Stock Distribution by Category
              </h3>
              <p className="text-xs text-slate-500">Physical units across active categories</p>
            </div>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              View catalog <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-64 flex items-center justify-center">
            {categoryDistribution.length > 0 ? (
              <Doughnut
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                  }
                }}
              />
            ) : (
              <p className="text-xs text-slate-400">No inventory data available</p>
            )}
          </div>
        </div>

        {/* Chart 2: Stock-In vs Stock-Out */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Stock-In vs Stock-Out Movement
              </h3>
              <p className="text-xs text-slate-500">Intake receipts versus order fulfillments</p>
            </div>
            <Link
              to="/history"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              Audit log <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-64">
            <Bar
              data={stockMovementChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                  x: { grid: { display: false } }
                },
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                }
              }}
            />
          </div>
        </div>

        {/* Chart 3: Monthly Order Trends */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Order Revenue Trends
              </h3>
              <p className="text-xs text-slate-500">Gross revenue performance over time</p>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              All orders <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-64">
            <Line
              data={orderChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: {
                      callback: (val) => `$${val}`
                    }
                  },
                  x: { grid: { display: false } }
                },
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          </div>
        </div>

        {/* Chart 4: Top-Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Top-Selling Products</h3>
              <p className="text-xs text-slate-500">Ranked by total quantity dispatched</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              Deep reports <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="h-64">
            {topSelling.length > 0 ? (
              <Bar
                data={topProdChartData}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    y: { grid: { display: false } }
                  },
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No orders registered yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock Warnings & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Product Overview */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Critical Low-Stock Overview
                </h3>
                <p className="text-xs text-slate-500">Products requiring restock action</p>
              </div>
            </div>
            <Link
              to="/inventory?status=LOW_STOCK"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all ({summary.lowStockCount + summary.outOfStockCount})
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">SKU & Product</th>
                  <th className="py-2.5 px-3">Available</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockPreview.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      All products have healthy inventory levels!
                    </td>
                  </tr>
                ) : (
                  lowStockPreview.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-800">{item.sku}</span>
                        <p className="text-slate-500 truncate max-w-[180px]">{item.name}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-extrabold text-slate-900">
                          {item.availableQuantity}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Thresh: {item.minimumStockThreshold}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <StockBadge status={item.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedProduct(item);
                            setStockModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Sales Orders</h3>
                <p className="text-xs text-slate-500">Latest warehouse order dispatches</p>
              </div>
            </div>
            <Link
              to="/orders"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              All orders ({summary.totalOrders})
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No recent orders
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {ord.orderNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-900">{ord.customer?.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                          {ord.customer?.company || ord.customer?.email}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <OrderStatusBadge status={ord.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StockUpdateModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        product={selectedProduct}
        onSuccess={fetchDashboardData}
      />

      <ProductFormModal
        isOpen={productFormOpen}
        onClose={() => setProductFormOpen(false)}
        product={selectedProduct}
        onSuccess={fetchDashboardData}
      />

      <ProductDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        product={selectedProduct}
        onOpenStockAdjust={(p) => {
          setSelectedProduct(p);
          setStockModalOpen(true);
        }}
        onOpenEdit={(p) => {
          setSelectedProduct(p);
          setProductFormOpen(true);
        }}
      />
    </div>
  );
};
