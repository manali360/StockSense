import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { StockBadge } from '../components/Badge';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { downloadCSV } from '../utils/exportHelpers';
import '../utils/chartConfig';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Download,
  Boxes,
  AlertTriangle,
  RefreshCw,
  Archive,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const Analytics = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [inventoryReports, setInventoryReports] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [dashRes, invRes, topRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/inventory'),
        api.get('/analytics/top-products?limit=10')
      ]);

      setDashboardData(dashRes.data.data);
      setInventoryReports(invRes.data.data);
      setTopProducts(topRes.data.data);
    } catch (error) {
      toast.error('Failed to load analytics reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportSlowMoving = () => {
    if (!inventoryReports?.slowMovingProducts?.length) {
      toast.error('No slow-moving products to export');
      return;
    }
    const exportData = inventoryReports.slowMovingProducts.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category,
      'Available Units': p.availableQuantity,
      'Unit Cost': p.purchasePrice,
      'Holding Value': (p.availableQuantity * p.purchasePrice).toFixed(2),
      Location: p.warehouseLocation
    }));
    downloadCSV(exportData, `StockSense_Slow_Moving_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Slow moving inventory report exported!');
  };

  const handleExportTopProducts = () => {
    if (!topProducts.length) {
      toast.error('No sales data to export');
      return;
    }
    const exportData = topProducts.map((p, idx) => ({
      Rank: idx + 1,
      SKU: p._id,
      Name: p.name,
      'Units Sold': p.totalUnitsSold,
      'Gross Revenue': p.totalRevenue.toFixed(2),
      'Order Count': p.ordersCount
    }));
    downloadCSV(exportData, `StockSense_Top_Sellers_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Top selling products report exported!');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const { summary = {}, categoryDistribution = [], stockMovementsTrends = [] } = dashboardData || {};
  const { categoryStats = [], slowMovingProducts = [], replenishmentNeeded = [] } = inventoryReports || {};

  // Category Retail vs Cost Valuation chart
  const catNames = categoryStats.map((c) => c._id || 'Unassigned');
  const catCosts = categoryStats.map((c) => c.totalCost);
  const catRetails = categoryStats.map((c) => c.totalRetail);

  const categoryValuationChartData = {
    labels: catNames,
    datasets: [
      {
        label: 'Asset Cost ($)',
        data: catCosts,
        backgroundColor: '#94a3b8',
        borderRadius: 6
      },
      {
        label: 'Retail Value ($)',
        data: catRetails,
        backgroundColor: '#2563eb',
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Warehouse Analytics & Business Insights
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Valuation distributions, turnover velocity, slow-moving dead stock, and replenishment modeling
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm transition-all"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportTopProducts}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Top Sellers
          </button>
          <button
            onClick={handleExportSlowMoving}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export Slow-Moving Report
          </button>
        </div>
      </div>

      {/* 3 Valuation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Retail Valuation"
          value={formatCurrency(summary.totalValuationRetail)}
          subtitle="Estimated gross catalog asset value"
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Total Purchase Cost"
          value={formatCurrency(summary.totalValuationCost)}
          subtitle="Direct inventory procurement investment"
          icon={Boxes}
          color="purple"
        />
        <StatCard
          title="Projected Unrealized Profit"
          value={formatCurrency(summary.potentialProfit)}
          subtitle={`Margin: ${
            summary.totalValuationRetail > 0
              ? (
                  (summary.potentialProfit / summary.totalValuationRetail) *
                  100
                ).toFixed(1)
              : 0
          }% potential profit on existing stock`}
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Chart: Category Cost vs Retail Valuation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Inventory Valuation Breakdown by Category
            </h3>
            <p className="text-xs text-slate-500">Comparison of acquisition cost vs retail asset price</p>
          </div>
        </div>
        <div className="h-72">
          <Bar
            data={categoryValuationChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: '#f1f5f9' },
                  ticks: { callback: (v) => `$${v}` }
                },
                x: { grid: { display: false } }
              },
              plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
              }
            }}
          />
        </div>
      </div>

      {/* Two Column Grid: Top Selling Products vs Slow-Moving Dead Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Top 10 Fast-Moving Products
            </h3>
            <span className="text-[11px] text-slate-400">By units sold</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Rank & Product</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                  <th className="py-2.5 px-3">Revenue</th>
                  <th className="py-2.5 px-3 text-right">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No order dispatches registered yet
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-slate-900 block">{p._id}</span>
                            <span className="text-slate-600 truncate max-w-[160px] block">
                              {p.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.totalUnitsSold} units
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-blue-600">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                        {p.ordersCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slow-Moving / Dead Stock Report */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-600" />
              Slow-Moving Inventory (Dead Stock Risk)
            </h3>
            <span className="text-[11px] text-slate-400">0 recent order dispatches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">SKU & Item</th>
                  <th className="py-2.5 px-3">Stock Units</th>
                  <th className="py-2.5 px-3">Holding Cost</th>
                  <th className="py-2.5 px-3 text-right">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slowMovingProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      All inventory has active order rotation!
                    </td>
                  </tr>
                ) : (
                  slowMovingProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-slate-900 block">{p.sku}</span>
                        <span className="text-slate-600 truncate max-w-[180px] block">
                          {p.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.availableQuantity} units
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">
                        {formatCurrency(p.availableQuantity * p.purchasePrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-medium">
                        {p.warehouseLocation || 'General'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Replenishment Modeling Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Procurement Replenishment Schedule
              </h3>
              <p className="text-xs text-slate-500">
                Products flagged for reorder based on configured thresholds
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
            {replenishmentNeeded.length} items flagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-y border-slate-100">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Estimated Reorder Cost (to 3x Thresh)</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {replenishmentNeeded.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No items currently need replenishment!
                  </td>
                </tr>
              ) : (
                replenishmentNeeded.map((p) => {
                  const targetReorderUnits = Math.max(10, p.minimumStockThreshold * 3 - p.availableQuantity);
                  const estReorderCost = targetReorderUnits * p.purchasePrice;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.sku}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {p.availableQuantity}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{p.minimumStockThreshold}</td>
                      <td className="py-3 px-4 text-slate-700">{p.supplierName}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">
                        {formatCurrency(estReorderCost)} ({targetReorderUnits} units)
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StockBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
