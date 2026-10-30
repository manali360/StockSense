import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

const CATEGORIES = [
  'Industrial Tools',
  'Safety & PPE',
  'Packaging & Shipping',
  'Electronics & Hardware',
  'Electrical Components',
  'Automotive Parts',
  'Office & Facilities',
  'Raw Materials'
];

export const ProductFormModal = ({ isOpen, onClose, product, onSuccess }) => {
  const isEdit = !!product;

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: 'Industrial Tools',
    brand: '',
    purchasePrice: '',
    sellingPrice: '',
    availableQuantity: '',
    minimumStockThreshold: '10',
    supplierName: '',
    warehouseLocation: '',
    imageUrl: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        category: product.category || 'Industrial Tools',
        brand: product.brand || '',
        purchasePrice: product.purchasePrice || '',
        sellingPrice: product.sellingPrice || '',
        availableQuantity: product.availableQuantity || '0',
        minimumStockThreshold: product.minimumStockThreshold || '10',
        supplierName: product.supplierName || '',
        warehouseLocation: product.warehouseLocation || '',
        imageUrl: product.imageUrl || ''
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: 'Industrial Tools',
        brand: '',
        purchasePrice: '',
        sellingPrice: '',
        availableQuantity: '0',
        minimumStockThreshold: '10',
        supplierName: '',
        warehouseLocation: 'Zone A - Aisle 1',
        imageUrl: ''
      });
    }
  }, [product, isOpen]);

  const generateRandomSKU = () => {
    const prefix = (formData.category || 'GEN').substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${rand}` }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const purchaseNum = parseFloat(formData.purchasePrice) || 0;
  const sellingNum = parseFloat(formData.sellingPrice) || 0;
  const margin = sellingNum > 0 ? (((sellingNum - purchaseNum) / sellingNum) * 100).toFixed(1) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.sku.trim()) {
      toast.error('Please enter product name and SKU');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/products/${product._id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData);
        toast.success('Product created successfully');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Product Details' : 'Add New Inventory Product'}
      subtitle={isEdit ? `Updating SKU ${product.sku}` : 'Fill in all product specifications'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Name and SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. 20V Cordless Brushless Drill"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                SKU <span className="text-rose-500">*</span>
              </label>
              {!isEdit && (
                <button
                  type="button"
                  onClick={generateRandomSKU}
                  className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-0.5"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Auto
                </button>
              )}
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              placeholder="e.g. IND-DRL-001"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 2: Category and Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand / Manufacturer
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. DeWalt, 3M, Bosch"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 3: Pricing and Margin */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Cost ($) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="purchasePrice"
              value={formData.purchasePrice}
              onChange={handleChange}
              placeholder="0.00"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selling Price ($) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="sellingPrice"
              value={formData.sellingPrice}
              onChange={handleChange}
              placeholder="0.00"
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Profit Margin
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-lg font-extrabold ${
                  margin >= 30 ? 'text-emerald-600' : margin > 0 ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {margin}%
              </span>
              <span className="text-[10px] text-slate-400">
                +${(sellingNum - purchaseNum).toFixed(2)}/unit
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: Stock Levels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEdit ? 'Current Stock Units (Use Stock Adjust)' : 'Initial Quantity'}
            </label>
            <input
              type="number"
              min="0"
              name="availableQuantity"
              value={formData.availableQuantity}
              onChange={handleChange}
              disabled={isEdit}
              className={`w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                isEdit ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Low Stock Alert Threshold <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              name="minimumStockThreshold"
              value={formData.minimumStockThreshold}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Row 5: Supplier & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Name
            </label>
            <input
              type="text"
              name="supplierName"
              value={formData.supplierName}
              onChange={handleChange}
              placeholder="e.g. Apex Industrial Supply"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Warehouse Location
            </label>
            <input
              type="text"
              name="warehouseLocation"
              value={formData.warehouseLocation}
              onChange={handleChange}
              placeholder="e.g. Zone A - Aisle 3, Bin 12"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 6: Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            placeholder="Detailed specifications, dimensions, safety standards..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
