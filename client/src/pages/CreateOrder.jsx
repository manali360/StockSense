import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { StockBadge } from '../components/Badge';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  ArrowRight
} from 'lucide-react';

export const CreateOrder = () => {
  const navigate = useNavigate();

  // Customer Form
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });

  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Product Search / Selector
  const [allProducts, setAllProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Load available products for selector
  useEffect(() => {
    const fetchAvailableProducts = async () => {
      try {
        setSearchingProducts(true);
        const res = await api.get('/products?limit=100&sortBy=name&order=asc');
        setAllProducts(res.data.data);
      } catch (error) {
        console.error('Failed to load products for order:', error);
      } finally {
        setSearchingProducts(false);
      }
    };
    fetchAvailableProducts();
  }, []);

  const handleCustomerChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  // Add product to order
  const handleAddProduct = (product) => {
    if (product.availableQuantity <= 0) {
      toast.error(`Cannot add "${product.name}". Product is currently out of stock!`);
      return;
    }

    const exists = orderItems.find((item) => item.product === product._id);
    if (exists) {
      if (exists.quantity >= product.availableQuantity) {
        toast.error(`Cannot add more. Max available stock is ${product.availableQuantity} units.`);
        return;
      }
      setOrderItems(
        orderItems.map((item) =>
          item.product === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unitPrice
              }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          product: product._id,
          sku: product.sku,
          name: product.name,
          unitPrice: product.sellingPrice,
          maxStock: product.availableQuantity,
          quantity: 1,
          subtotal: product.sellingPrice
        }
      ]);
    }
    toast.success(`Added ${product.sku} to order`);
  };

  // Change quantity of item in order
  const handleQuantityChange = (productId, newQtyStr) => {
    const newQty = parseInt(newQtyStr, 10);
    if (isNaN(newQty) || newQty <= 0) return;

    setOrderItems(
      orderItems.map((item) => {
        if (item.product === productId) {
          if (newQty > item.maxStock) {
            toast.error(`Max stock available for ${item.sku} is ${item.maxStock}`);
            return {
              ...item,
              quantity: item.maxStock,
              subtotal: item.maxStock * item.unitPrice
            };
          }
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.unitPrice
          };
        }
        return item;
      })
    );
  };

  // Remove item from order
  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter((item) => item.product !== productId));
  };

  // Order Total
  const totalAmount = orderItems.reduce((acc, item) => acc + item.subtotal, 0);

  // Submit Order
  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (!customer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (orderItems.length === 0) {
      toast.error('Please add at least one product item to the order');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer,
        items: orderItems.map(({ product, sku, name, unitPrice, quantity, subtotal }) => ({
          productId: product,
          sku,
          name,
          unitPrice,
          quantity,
          subtotal
        })),
        notes
      };

      const res = await api.post('/orders', payload);
      toast.success(`Order #${res.data.data.orderNumber} successfully created & inventory deducted!`);
      navigate('/orders');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const filteredCatalog = allProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
          Create Fulfillment Order
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select warehouse items, configure quantities with live stock checks, and confirm dispatch
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Details & Order Items (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Details Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Customer & Recipient Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={customer.name}
                    onChange={handleCustomerChange}
                    required
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Organization
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    name="company"
                    value={customer.company}
                    onChange={handleCustomerChange}
                    placeholder="e.g. Midwest Logistics Inc"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={customer.email}
                    onChange={handleCustomerChange}
                    placeholder="customer@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    name="phone"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery / Warehouse Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  name="address"
                  value={customer.address}
                  onChange={handleCustomerChange}
                  placeholder="Street address, city, state, zip"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Selected Order Items Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Order Line Items ({orderItems.length})
              </h3>
              {orderItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOrderItems([])}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {orderItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No items added to order</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click "+ Add" on items from the catalog on the right.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orderItems.map((item) => (
                  <div key={item.product} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {item.sku}
                      </span>
                      <p className="font-semibold text-slate-800 truncate mt-0.5">{item.name}</p>
                      <span className="text-[11px] text-slate-400">
                        {formatCurrency(item.unitPrice)} each • Max {item.maxStock} in stock
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quantity input with bounds */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-slate-500">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.maxStock}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.product, e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold text-xs"
                        />
                      </div>

                      <span className="font-bold text-slate-900 w-20 text-right">
                        {formatCurrency(item.subtotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.product)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-4 flex items-center justify-between text-sm font-bold text-slate-900 border-t border-slate-200">
                  <span>Calculated Total:</span>
                  <span className="text-lg text-blue-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Fulfillment Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special packing instructions, delivery dock number..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={loading || orderItems.length === 0}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing Order & Updating Stock...' : 'Confirm & Place Order'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Product Picker (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Select Warehouse Inventory</span>
              <span className="text-[11px] font-normal text-slate-400">
                {allProducts.length} items
              </span>
            </h3>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search catalog by name or SKU..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Catalog list */}
            <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-100 pr-1">
              {filteredCatalog.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No matching items found in warehouse catalog
                </p>
              ) : (
                filteredCatalog.map((prod) => (
                  <div
                    key={prod._id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                          {prod.sku}
                        </span>
                        <StockBadge status={prod.status} />
                      </div>
                      <p className="font-semibold text-slate-800 truncate mt-1">{prod.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(prod.sellingPrice)}
                        </span>
                        <span>•</span>
                        <span>{prod.availableQuantity} in stock</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      disabled={prod.availableQuantity <= 0}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      + Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
