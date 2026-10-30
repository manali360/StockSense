import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StockBadge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { ProductFormModal } from '../components/ProductFormModal';
import { StockUpdateModal } from '../components/StockUpdateModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { downloadCSV } from '../utils/exportHelpers';
import toast from 'react-hot-toast';
import {
  Search,
  Plus,
  Download,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Layers,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  SlidersHorizontal
} from 'lucide-react';

export const InventoryList = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'All');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Debounce search effect (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load distinct categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/products/categories');
        setCategories(['All', ...res.data.data]);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        order: sortOrder
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;

      const res = await api.get('/products', { params });
      setProducts(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error('Failed to load inventory products');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, selectedCategory, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Delete product handler
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/products/${productToDelete._id}`);
      toast.success(`Product "${productToDelete.name}" deleted`);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      // Fetch all products matching current query for full export
      const params = {
        limit: 1000,
        page: 1
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (selectedStatus && selectedStatus !== 'All') params.status = selectedStatus;

      const res = await api.get('/products', { params });
      const exportList = res.data.data.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category,
        Brand: p.brand,
        'Purchase Price': p.purchasePrice,
        'Selling Price': p.sellingPrice,
        'Available Quantity': p.availableQuantity,
        'Min Threshold': p.minimumStockThreshold,
        Status: p.status,
        Supplier: p.supplierName,
        'Warehouse Location': p.warehouseLocation,
        'Total Valuation': (p.availableQuantity * p.sellingPrice).toFixed(2),
        'Created Date': p.createdAt
      }));

      downloadCSV(exportList, `StockSense_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Inventory exported to CSV!');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Inventory Catalog & Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage warehouse SKUs, audit balances, and configure stock thresholds ({pagination.total} total items)
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

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedProduct(null);
                setFormModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Debounced Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, name, brand..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="All">All Categories</option>
              {categories.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="All">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="createdAt">Date Created</option>
              <option value="availableQuantity">Stock Quantity</option>
              <option value="sellingPrice">Selling Price</option>
              <option value="name">Product Name</option>
              <option value="sku">SKU Code</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">SKU & Item Details</th>
                <th className="py-3.5 px-4">Category / Brand</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Price (Cost / Sell)</th>
                <th className="py-3.5 px-4">Available Units</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent mb-2"></div>
                    <p className="font-medium text-xs">Querying MongoDB inventory records...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing search filters or add a new warehouse product.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod._id} className="hover:bg-slate-50/70 transition-colors">
                    {/* SKU & Name */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {prod.sku}
                      </span>
                      <p className="font-semibold text-slate-900 mt-1 text-xs truncate max-w-xs">
                        {prod.name}
                      </p>
                    </td>

                    {/* Category & Brand */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{prod.category}</span>
                      <span className="block text-[11px] text-slate-400">{prod.brand}</span>
                    </td>

                    {/* Warehouse Location */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {prod.warehouseLocation || 'Zone A'}
                      </span>
                    </td>

                    {/* Pricing */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(prod.sellingPrice)}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        Cost: {formatCurrency(prod.purchasePrice)}
                      </span>
                    </td>

                    {/* Available Units */}
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-extrabold text-slate-900">
                        {prod.availableQuantity}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Min: {prod.minimumStockThreshold}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <StockBadge status={prod.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedProduct(prod);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Product Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Quick Stock Adjust */}
                        <button
                          onClick={() => {
                            setSelectedProduct(prod);
                            setStockModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors"
                          title="Quick Stock Adjust"
                        >
                          Adjust
                        </button>

                        {/* Edit (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setSelectedProduct(prod);
                              setFormModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete (Admin only) */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setProductToDelete(prod);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {products.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{pagination.total}</span> products
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

      {/* Modals */}
      <ProductFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <StockUpdateModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        product={selectedProduct}
        onSuccess={fetchProducts}
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
          setFormModalOpen(true);
        }}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteProduct}
        title="Delete Inventory Product"
        message={`Are you sure you want to permanently delete "${productToDelete?.name}" (SKU: ${productToDelete?.sku})? This action cannot be reversed.`}
        confirmText="Delete Product"
        isLoading={deleteLoading}
      />
    </div>
  );
};
