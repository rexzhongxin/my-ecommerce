import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabaseClient';
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  Star,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Package,
  CheckCircle2,
  LayoutDashboard,
  Store,
  ToggleLeft,
  ToggleRight,
  Settings,
  Save,
  Palette,
  MessageCircle,
  TrendingUp
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', name: 'All Products' },
  { id: 'Electronics', name: 'Electronics' },
  { id: 'Footwear', name: 'Footwear' },
  { id: 'Accessories', name: 'Accessories' },
  { id: 'Lifestyle', name: 'Lifestyle' }
];

const WHATSAPP_NUMBER = '60123456789';
const INSTAGRAM_USERNAME = 'p0larize.me';

// Centralised shipping / tax settings (single source of truth — do not
// hard-code 300 / 10 in the cart label, footer, or shipping calculation).
const FREE_SHIPPING_THRESHOLD = 300;
const FLAT_SHIPPING_FEE = 10;
const TAX_RATE = 0;

// Local data-URI placeholder used when a product image fails to load.
// It is not an external service. The onError handler below guards against
// loops by clearing onerror before swapping the source.
const PLACEHOLDER_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='18'%3ENo image%3C/text%3E%3C/svg%3E";
const handleImageError = (e) => {
  if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = PLACEHOLDER_IMAGE;
  }
};

export default function App() {
  // WARNING: This hostname check is NOT real security. It only hides the
  // admin button on non-admin deployments. Real protection still requires
  // Supabase Auth plus Row Level Security: public read-only access for
  // active products and settings, and writes only for an authenticated admin.
  // Do not rely on a hostname check or any URL parameter to protect admin actions.
  const isAdminEnvironment = useMemo(() => {
    const hostname = window.location.hostname;
    return hostname.includes('admin');
  }, []);

  // --- STATE ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    store_name: 'p0larize.me',
    store_logo: '',
    hero_title: 'Bring the globe to your doorstep.',
    hero_subtitle: 'Discover premium curated electronics, footwear and accessories delivered directly to your door.',
    primary_color: '#4f46e5',
    text_color: '#1e293b',
    bg_color: '#f8fafc'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  const [cart, setCart] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState(null);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastOrderSummary, setLastOrderSummary] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [productsError, setProductsError] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [infoModal, setInfoModal] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Electronics', price: '', image: '', description: '', rating: 0, reviews: 0, sales_count: 0, is_active: true
  });

  const [shippingInfo, setShippingInfo] = useState({ fullName: '', email: '', phone: '', address: '', city: '', zipCode: '' });

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  // Load the cart from localStorage on first mount. Bad or missing data is
  // ignored so a corrupt stored value can never break the storefront.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('p0larize-cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(parsed.filter(item => item && (item.id || item.name)).map(item => ({ ...item, quantity: Math.max(1, parseInt(item.quantity) || 1) })));
        }
      }
    } catch (err) {
      console.warn('Could not load cart from localStorage:', err);
    }
    setCartLoaded(true);
  }, []);

  // Save the cart to localStorage whenever it changes (after the first
  // load, so the initial empty cart does not overwrite a stored cart).
  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem('p0larize-cart', JSON.stringify(cart));
    } catch (err) {
      console.warn('Could not save cart to localStorage:', err);
    }
  }, [cart, cartLoaded]);

  // Close the product detail modal with Escape, only while it is open.
  useEffect(() => {
    if (!selectedProduct) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedProduct(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedProduct]);

  // Page title follows the store settings once they load.
  useEffect(() => {
    document.title = `${siteSettings.store_name} | ${siteSettings.hero_title}`;
  }, [siteSettings.store_name, siteSettings.hero_title]);

  const fetchProducts = async () => {
    setLoading(true);
    setProductsError(null);
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      setProductsError(error.message);
    } else if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*').order('id', { ascending: false });
    if (!error && data) setOrders(data);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (error) {
      setProductsError(error.message);
    }
    if (!error && data) {
      setSiteSettings({
        store_name: data.store_name || 'p0larize.me',
        store_logo: data.store_logo || '',
        hero_title: data.hero_title || 'Bring the globe to your doorstep.',
        hero_subtitle: data.hero_subtitle || 'Discover premium curated electronics, footwear and accessories delivered directly to your door.',
        primary_color: data.primary_color || '#4f46e5',
        text_color: data.text_color || '#1e293b',
        bg_color: data.bg_color || '#f8fafc'
      });
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 1, ...siteSettings });

    setSavingSettings(false);
    if (!error) {
      showToast('配色与设置已成功写入数据库！');
    } else {
      showToast('保存失败：' + error.message);
    }
  };

  const resetProductForm = () => {
    setNewProduct({ name: '', category: 'Electronics', price: '', image: '', description: '', rating: 0, reviews: 0, sales_count: 0, is_active: true });
    setEditingProductId(null);
  };

  const startEditProduct = (p) => {
    setEditingProductId(p.id);
    setNewProduct({
      name: p.name || '',
      category: p.category || 'Electronics',
      price: p.price === null || p.price === undefined ? '' : String(p.price),
      image: p.image || '',
      description: p.description || '',
      rating: p.rating || 0,
      reviews: p.reviews || 0,
      sales_count: p.sales_count || 0,
      is_active: p.is_active !== false
    });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      showToast('请完整填写商品信息！');
      return;
    }

    const payload = {
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      image: newProduct.image,
      description: newProduct.description,
      rating: parseFloat(newProduct.rating),
      reviews: parseInt(newProduct.reviews),
      sales_count: parseInt(newProduct.sales_count || 0)
    };

    // Edit mode updates the existing row (using existing columns only);
    // is_active is deliberately left untouched so editing a deactivated
    // product does not silently reactivate it. Create mode inserts a new row.
    const { error } = editingProductId
      ? await supabase.from('products').update(payload).eq('id', editingProductId)
      : await supabase.from('products').insert([{ ...payload, is_active: true }]);

    if (!error) {
      showToast(editingProductId ? `商品 "${newProduct.name}" 修改成功！` : `商品 "${newProduct.name}" 发布成功！`);
      resetProductForm();
      fetchProducts();
    } else {
      showToast('发布失败：' + error.message);
    }
  };

  const handleUpdateOrderStatus = async (id, status) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) {
      fetchOrders();
    } else {
      showToast('订单状态更新失败：' + error.message);
    }
  };

  const toggleProductActive = async (id, currentStatus) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      showToast(!currentStatus ? '商品已上架！' : '商品已下架！');
      fetchProducts();
    }
  };

  const addToCart = (productToAdd, quantity = 1) => {
    if (!productToAdd) return;

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => {
        if (item.id && productToAdd.id) {
          return String(item.id) === String(productToAdd.id);
        }
        return item.name === productToAdd.name;
      });

      if (existingIndex > -1) {
        const updatedCart = [...prevCart];
        updatedCart[existingIndex].quantity += quantity;
        return updatedCart;
      }
      return [...prevCart, { ...productToAdd, quantity }];
    });

    setIsCartOpen(true);
    showToast(`Added "${productToAdd.name || 'Product'}" to cart!`);
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => prevCart.map(item => {
      const isTarget = item.id ? String(item.id) === String(id) : item.name === id;
      if (isTarget) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id ? String(item.id) !== String(id) : item.name !== id));
    showToast('Item removed from cart.');
  };

  // 🌟 关键修复：下单成功后自动更新 Supabase 中商品的 sales_count
  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    // Checkout validation, before anything is submitted or set to processing.
    const phoneDigits = (shippingInfo.phone || '').replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      showToast('Please enter a valid phone number with at least 7 digits.');
      return;
    }
    if (!termsAccepted) {
      showToast('Please accept the terms to continue.');
      return;
    }
    setCheckoutStep('processing');

    // 1. 保存订单数据
    // Note: no new phone column is added here (schema unknown). Phone, city
    // and zip are appended to the address string saved below.
    const { data, error } = await supabase.from('orders').insert([{
      customer_name: shippingInfo.fullName,
      email: shippingInfo.email,
      address: `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.zipCode}, Phone: ${shippingInfo.phone}`,
      total_price: cartTotal,
      items: JSON.stringify(cart),
      status: 'pending'
    }]).select();

    if (!error && data && data.length > 0) {
      setLastPlacedOrderId(data[0].id);
      // Snapshot the order total and items BEFORE clearing the cart, so the
      // WhatsApp message and success screen do not show RM 0.00.
      setLastOrderTotal(cartTotal);
      setLastOrderSummary(cart.map(cartItem => `${cartItem.name} x${cartItem.quantity} - RM ${((parseFloat(cartItem.price) || 0) * cartItem.quantity).toFixed(2)}`).join('; '));

      // 2. Update sales_count, by product id ONLY. The old by-name fallback
      // is removed: if two products shared a name it would update the wrong
      // rows, and items without an id cannot be matched safely, so they are
      // skipped with a warning instead of being guessed at.
      // NOTE — remaining race: this is still read-then-write, so two orders
      // for the same product at the same moment can lose a count. A true
      // atomic fix needs a Supabase Postgres function (see SUPABASE_SETUP.md);
      // this app deliberately does NOT call a non-existent RPC.
      for (const cartItem of cart) {
        if (!cartItem.id) {
          console.warn('Skipping sales update for item without an id:', cartItem.name);
          continue;
        }
        try {
          const { data: currentProduct } = await supabase
            .from('products')
            .select('sales_count')
            .eq('id', cartItem.id)
            .single();

          const currentSales = currentProduct?.sales_count || 0;

          await supabase
            .from('products')
            .update({ sales_count: currentSales + cartItem.quantity })
            .eq('id', cartItem.id);
        } catch (err) {
          console.error('Failed to update sales_count for product', cartItem.id, err);
        }
      }

      // 3. 重新获取最新的商品数据（更新前端页面显示）
      await fetchProducts();

      setCheckoutStep('success');
      setCart([]);
      setTermsAccepted(false);
    } else {
      showToast('提交失败：' + (error ? error.message : '未知错误'));
      setCheckoutStep(null);
    }
  };

  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0), [cart]);
  const shippingCost = cartSubtotal >= FREE_SHIPPING_THRESHOLD || cartSubtotal === 0 ? 0 : FLAT_SHIPPING_FEE;
  const taxCost = cartSubtotal * TAX_RATE;
  const cartTotal = cartSubtotal + shippingCost + taxCost;
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const displayedProducts = useMemo(() => {
    return products
      .filter(p => {
        const isActive = p.is_active !== false;
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        return isActive && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') return (b.sales_count || 0) - (a.sales_count || 0);
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return (a.id || 0) - (b.id || 0);
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Visible categories are derived from products that actually exist, so an
  // empty category is not advertised. While loading, fall back to the full
  // list so the UI does not flicker empty.
  const visibleCategories = useMemo(() => {
    if (loading) return CATEGORIES;
    const activeCategories = new Set(products.filter(p => p.is_active !== false).map(p => p.category));
    return CATEGORIES.filter(cat => cat.id === 'all' || activeCategories.has(cat.id));
  }, [products, loading]);

  const whatsappUrl = useMemo(() => {
    const rawText = `Hi! I would like to order from ${siteSettings.store_name}.\nOrder #: #${lastPlacedOrderId || 'NEW'}\nItems: ${lastOrderSummary || 'See order details'}\nName: ${shippingInfo.fullName}\nPhone: ${shippingInfo.phone}\nAddress: ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.zipCode}\nEstimated total: RM ${lastOrderTotal.toFixed(2)}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(rawText)}`;
  }, [siteSettings.store_name, lastPlacedOrderId, shippingInfo, lastOrderTotal, lastOrderSummary]);

  const openCartDrawer = () => {
    setIsCartOpen(true);
  };

  // ==================== 商家管理后台界面 (Admin Backstage) ====================
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans text-slate-800 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <div className="flex items-center space-x-2 text-indigo-600 font-bold">
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-xl">{siteSettings.store_name} 商家管理后台</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">云端实时数据控制中心 (Supabase Enterprise Managed)</p>
            </div>

            <button
              onClick={() => setIsAdmin(false)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow transition-all self-start md:self-auto"
            >
              <Store className="w-4 h-4" />
              <span>返回网店前台</span>
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" /> 店面品牌与文本配置
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">店铺名称 (Store Name)</label>
                  <input
                    type="text"
                    value={siteSettings.store_name}
                    onChange={e => setSiteSettings({ ...siteSettings, store_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">店铺 Logo 网址 (URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={siteSettings.store_logo}
                    onChange={e => setSiteSettings({ ...siteSettings, store_logo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">首页大标题 (Hero Title)</label>
                  <input
                    type="text"
                    value={siteSettings.hero_title}
                    onChange={e => setSiteSettings({ ...siteSettings, hero_title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">首页副标题 (Hero Subtitle)</label>
                  <input
                    type="text"
                    value={siteSettings.hero_subtitle}
                    onChange={e => setSiteSettings({ ...siteSettings, hero_subtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSettings ? '保存中...' : '保存修改'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> {editingProductId ? '编辑商品' : '发布新商品'}
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">商品名称</label>
                  <input type="text" placeholder="如: Sony WH-1000XM5" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">价格 (RM)</label>
                    <input type="number" step="0.01" placeholder="299.00" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">初始销量</label>
                    <input type="number" placeholder="如 120" value={newProduct.sales_count} onChange={e => setNewProduct({...newProduct, sales_count: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">分类</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                      <option value="Electronics">Electronics</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Lifestyle">Lifestyle</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">图片链接 (URL)</label>
                  <input type="text" placeholder="https://..." value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">详细描述</label>
                  <textarea rows="3" placeholder="描述商品亮点..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md text-sm">{editingProductId ? '保存修改' : '保存并上架'}</button>
                {editingProductId && (
                  <button type="button" onClick={resetProductForm} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm">Cancel Edit</button>
                )}
              </form>
            </div>

            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" /> 仓库商品管理 ({products.length})
                  </h2>
                  <button onClick={fetchProducts} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> 刷新数据
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2">
                  {products.map(p => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <img src={p.image} alt={p.name} onError={handleImageError} className="w-12 h-12 object-cover rounded-lg border" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-slate-400">RM {p.price} | {p.category} | <span className="font-semibold text-indigo-600">已售出 {p.sales_count || 0} 件</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEditProduct(p)} className="px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">Edit</button>
                        <button onClick={() => toggleProductActive(p.id, p.is_active)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${p.is_active !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                          {p.is_active !== false ? (<><span>已上架</span> <ToggleRight className="w-4 h-4 text-emerald-600" /></>) : (<><span>已下架</span> <ToggleLeft className="w-4 h-4 text-rose-400" /></>)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-600" /> 顾客意向订单中心 ({orders.length})
                  </h2>
                  <button onClick={fetchOrders} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 重新加载订单</button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {orders.length === 0 ? (<p className="text-xs text-slate-400 text-center py-6">暂无订单数据。</p>) : (
                    orders.map(o => (
                      <div key={o.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>订单号: #{o.id}</span>
                          <span className="text-indigo-600">RM {o.total_price?.toFixed(2)}</span>
                        </div>
                        <p><span className="text-slate-500">顾客:</span> {o.customer_name} ({o.email})</p>
                        <p><span className="text-slate-500">送货地址:</span> {o.address}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-slate-500">状态:</span>
                          <select value={o.status || 'pending'} onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none">
                            <option value="pending">pending</option>
                            <option value="confirmed">confirmed</option>
                            <option value="shipped">shipped</option>
                            <option value="delivered">delivered</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

// ==================== 前台网店界面 (Public Store View) ====================
return (
<div
className="min-h-screen font-sans antialiased flex flex-col transition-colors duration-300 relative"
style={{ backgroundColor: siteSettings.bg_color, color: siteSettings.text_color}}
>

{/* Toast Notification */}
{toastMessage && (
<div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all animate-bounce">
<Sparkles className="w-5 h-5 text-indigo-400" />
<span className="text-sm font-medium">{toastMessage}</span>
</div>
)}

{/* 页面右下角全局 */}
<button
type="button"
onClick={openCartDrawer}
className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-4 rounded-full shadow-2xl flex items-center space-x-2 border-2 border-indigo-500 hover:scale-105 transition-all cursor-pointer"
>
<ShoppingCart className="w-6 h-6 text-indigo-400" />
<span className="text-xs font-bold">View Cart ({totalCartItemsCount})</span>
</button>

{/* Admin 专属前台“实时调色”悬浮卡片 */}
{isAdminEnvironment && (
<div className="fixed bottom-24 right-6 z-50">
{!showColorPicker? (
<button
onClick={() => setShowColorPicker(true)}
className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl font-bold text-xs hover:bg-slate-800 border border-slate-700 transition-all hover:scale-105"
>
<Palette className="w-4 h-4 text-indigo-400" />
<span>实时调色板</span>
</button>
): (
<div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-slate-200 w-72 text-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
<div className="flex items-center justify-between border-b pb-2">
<span className="text-xs font-bold flex items-center gap-1 text-indigo-600">
<Palette className="w-4 h-4" /> 实时前台调色
</span>
<button onClick={() => setShowColorPicker(false)} className="text-slate-400 hover:text-slate-600">
<X className="w-4 h-4" />
</button>
</div>

<div className="space-y-3">
<div>
<label className="block text-[11px] font-bold text-slate-600 mb-1">主色调 (Primary)</label>
<div className="flex items-center space-x-2">
<input
type="color"
value={siteSettings.primary_color}
onChange={e => setSiteSettings({...siteSettings, primary_color: e.target.value})}
className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
/>
<input
type="text"
value={siteSettings.primary_color}
onChange={e => setSiteSettings({...siteSettings, primary_color: e.target.value})}
className="text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200 flex-1 uppercase"
/>
</div>
</div>

<div>
<label className="block text-[11px] font-bold text-slate-600 mb-1">文字颜色 (Text)</label>
<div className="flex items-center space-x-2">
<input
type="color"
value={siteSettings.text_color}
onChange={e => setSiteSettings({...siteSettings, text_color: e.target.value})}
className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
/>
<input
type="text"
value={siteSettings.text_color}
onChange={e => setSiteSettings({...siteSettings, text_color: e.target.value})}
className="text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200 flex-1 uppercase"
/>
</div>
</div>

<div>
<label className="block text-[11px] font-bold text-slate-600 mb-1">网页背景色 (Background)</label>
<div className="flex items-center space-x-2">
<input
type="color"
value={siteSettings.bg_color}
onChange={e => setSiteSettings({...siteSettings, bg_color: e.target.value})}
className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
/>
<input
type="text"
value={siteSettings.bg_color}
onChange={e => setSiteSettings({...siteSettings, bg_color: e.target.value})}
className="text-xs px-2 py-1 bg-slate-100 rounded border border-slate-200 flex-1 uppercase"
/>
</div>
</div>
</div>

<button
onClick={handleSaveSettings}
disabled={savingSettings}
className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-1"
>
<Save className="w-3.5 h-3.5" />
<span>{savingSettings? '保存中...': '保存全新配色'}</span>
</button>
</div>
)}
</div>
)}

{/* --- NAVBAR --- */}
<header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<div className="flex items-center justify-between h-20">

{/* Logo */}
<div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSelectedCategory('all'); setSearchQuery('');}}>
{siteSettings.store_logo? (
<img src={siteSettings.store_logo} alt="Logo" className="w-10 h-10 object-contain rounded-xl shadow-md" />
): (
<div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: siteSettings.primary_color}}>
<ShoppingBag className="w-6 h-6 text-white" />
</div>
)}
<span className="text-2xl font-bold tracking-tight" style={{ color: siteSettings.primary_color}}>
{siteSettings.store_name}
</span>
</div>

{/* Search Bar */}
<div className="hidden md:flex flex-1 max-w-md mx-8 relative">
<input
type="text"
placeholder="Search products..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="w-full pl-11 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full focus:outline-none text-sm text-slate-800"
/>
<Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
</div>

{/* Actions */}
<div className="flex items-center space-x-3">
{isAdminEnvironment && (
<button
type="button"
onClick={() => { setIsAdmin(true); fetchOrders();}}
className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-sm"
>
<LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
<span>商家后台</span>
</button>
)}

{/* Header Cart 按钮 */}
<button
type="button"
onClick={openCartDrawer}
className="flex items-center space-x-2 text-white px-4 py-2 rounded-full shadow-md transition-all hover:opacity-90 cursor-pointer"
style={{ backgroundColor: siteSettings.primary_color}}
>
<ShoppingCart className="w-4 h-4 pointer-events-none" />
<span className="font-semibold text-sm hidden sm:inline pointer-events-none">Cart</span>
{totalCartItemsCount > 0 && (
<span className="bg-white font-bold text-xs px-2 py-0.5 rounded-full pointer-events-none" style={{ color: siteSettings.primary_color}}>
{totalCartItemsCount}
</span>
)}
</button>
</div>
</div>
</div>
</header>

{/* Mobile search: the desktop search bar above is hidden on mobile
    (hidden md:flex), so mobile shoppers get this input instead. It shares
    the same searchQuery state as the desktop input. */}
<div className="md:hidden bg-white border-b border-slate-200 px-4 py-3">
  <div className="relative">
    <input
      type="text"
      placeholder="Search products..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full pl-11 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full focus:outline-none text-sm text-slate-800"
    />
    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
  </div>
</div>

{/* --- HERO BANNER --- */}
<section
className="text-white relative overflow-hidden transition-all duration-300"
style={{
background: `linear-gradient(135deg, ${siteSettings.primary_color} 0%, #0f172a 100%)`
}}
>
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between">
<div className="max-w-xl text-center md:text-left">
<span className="inline-flex items-center space-x-2 bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 mb-4">
<Sparkles className="w-3.5 h-3.5" />
<span>Cloud Database Powered</span>
</span>
<h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
{siteSettings.hero_title}
</h1>
<p className="mt-4 text-slate-200 text-base md:text-lg leading-relaxed">
{siteSettings.hero_subtitle}
</p>
</div>
</div>
</section>

{/* --- MAIN CATALOG --- */}
<main id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200/80">
<div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
{visibleCategories.map(cat => (
<button
key={cat.id}
onClick={() => setSelectedCategory(cat.id)}
className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
selectedCategory === cat.id
? 'text-white shadow-md'
: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
}`}
style={{ backgroundColor: selectedCategory === cat.id? siteSettings.primary_color: undefined}}
>
{cat.name}
</button>
))}
</div>

<div className="flex items-center space-x-3 self-end md:self-auto">
<SlidersHorizontal className="w-4 h-4 text-slate-500" />
<select
value={sortBy}
onChange={(e) => setSortBy(e.target.value)}
className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 text-slate-700 font-medium cursor-pointer shadow-sm focus:outline-none"
>
<option value="featured">Featured</option>
<option value="popular">Most Popular</option>
<option value="price-low">Price: Low to High</option>
<option value="price-high">Price: High to Low</option>
<option value="rating">Highest Rated</option>
</select>
</div>
</div>

{/* Product Grid */}
<div className="mt-8">
{productsError && (
<div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
<p className="text-sm text-rose-700">Could not load store data: {productsError}</p>
<button
type="button"
onClick={() => { fetchProducts(); fetchSettings(); }}
className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-sm shrink-0"
>
Retry
</button>
</div>
)}
{loading? (
<div className="text-center py-20">
<RefreshCw className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: siteSettings.primary_color}} />
<p className="text-sm opacity-70 font-medium">Loading products...</p>
</div>
): displayedProducts.length === 0? (
<div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
<Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
<h3 className="text-lg font-bold text-slate-700">No active products found</h3>
</div>
): (
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
{displayedProducts.map((item) => (
<div key={item.id || item.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative">
<div className="relative h-56 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => { setSelectedProduct(item); setDetailQuantity(1); }}>
<img src={item.image} alt={item.name} onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

{/* 热销 Badge 挂牌 */}
{(item.sales_count > 50) && (
<div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1">
<TrendingUp className="w-3 h-3" />
<span>HOT</span>
</div>
)}
</div>

<div className="p-5 flex-1 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between text-xs mb-1">
{item.reviews > 0? (
<div className="flex items-center space-x-1 text-amber-400 font-semibold">
<Star className="w-4 h-4 fill-amber-400" />
<span>{item.rating}</span>
<span className="text-slate-400">({item.reviews})</span>
</div>
): (
<span className="text-slate-400">No reviews yet</span>
)}

{/* 显示销量 */}
<span className="text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
{item.sales_count || 0} sold
</span>
</div>

<h3
onClick={() => { setSelectedProduct(item); setDetailQuantity(1); }}
className="mt-1 text-base font-bold cursor-pointer line-clamp-1 transition-colors"
style={{ color: siteSettings.text_color}}
>
{item.name}
</h3>
<p
className="mt-1 text-xs line-clamp-2 leading-relaxed opacity-75"
style={{ color: siteSettings.text_color}}
>
{item.description}
</p>
</div>

<div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
<span
className="text-lg font-bold"
style={{ color: siteSettings.text_color}}
>
RM {parseFloat(item.price).toFixed(2)}
</span>

<button
type="button"
aria-label={`Add ${item.name} to cart`}
onClick={(e) => {
e.stopPropagation();
addToCart(item);
}}
className="p-2.5 text-white rounded-xl shadow-md transition-all hover:opacity-90 cursor-pointer"
style={{ backgroundColor: siteSettings.primary_color}}
>
<ShoppingCart className="w-4 h-4" />
</button>
</div>
</div>
</div>
))}
</div>
)}
</div>
</main>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-lg font-bold text-slate-900">{siteSettings.store_name}</p>
            <p className="text-sm text-slate-500 mt-1">{siteSettings.hero_title}</p>
            <p className="text-sm text-slate-500 mt-1">Shipping: Free above RM {FREE_SHIPPING_THRESHOLD}, otherwise RM {FLAT_SHIPPING_FEE.toFixed(2)}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
            <button type="button" onClick={() => setInfoModal('shipping')} className="text-slate-700 hover:underline">Shipping</button>
            <button type="button" onClick={() => setInfoModal('returns')} className="text-slate-700 hover:underline">Returns</button>
            <button type="button" onClick={() => setInfoModal('privacy')} className="text-slate-700 hover:underline">Privacy</button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline"
            >
              Contact us on WhatsApp
            </a>
            <a
              href={`https://instagram.com/${INSTAGRAM_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              Instagram: {INSTAGRAM_USERNAME}
            </a>
          </div>
        </div>
      </footer>

      {/* Footer info modal (static text only — no new routes or tables). */}
      {infoModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-slate-800" onClick={() => setInfoModal(null)}>
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Close" onClick={() => setInfoModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h2 className="text-xl font-extrabold text-slate-900">{infoModal === 'shipping' ? 'Shipping' : infoModal === 'returns' ? 'Returns' : 'Privacy'}</h2>
            <p className="text-sm text-slate-700 leading-relaxed mt-4">
              {infoModal === 'shipping'
                ? `Shipping is free for orders of RM ${FREE_SHIPPING_THRESHOLD} and above; otherwise a flat RM ${FLAT_SHIPPING_FEE.toFixed(2)} fee applies. After you submit your order, the seller will confirm delivery details with you on WhatsApp.`
                : infoModal === 'returns'
                  ? 'Returns: contact the seller on WhatsApp within 7 days of delivery if something is wrong. Items should be unused and in their original packaging where possible. Refunds or exchanges are arranged directly with the seller, because checkout here is a seller-contact flow, not an automatic payment.'
                  : 'Privacy: your name, phone, email and address are used only to fulfil your order and to contact you about it. Your order details are stored in the store database. We do not sell your personal data.'}
            </p>
            <button type="button" onClick={() => setInfoModal(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm mt-6">Close</button>
          </div>
        </div>
      )}

      {/* Shopping cart rendered through a portal */}
      {isCartOpen && createPortal(
        <div className="fixed inset-0 z-[999999] overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <button
            type="button"
            aria-label="Close shopping cart"
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 w-full h-full bg-slate-900/60 backdrop-blur-sm cursor-default"
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col text-slate-800 z-10">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Your Shopping Cart ({totalCartItemsCount})</h2>
              <button type="button" onClick={() => setIsCartOpen(false)} aria-label="Close cart" className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <p className="text-slate-500">Your cart is empty</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all"
                  >
                    Continue shopping
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id || item.name} className="py-4 flex items-center space-x-4">
                    <img src={item.image} alt={item.name || ''} onError={handleImageError} className="w-16 h-16 object-cover rounded-xl border border-slate-100" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold break-words">{item.name}</h4>
                      <p className="text-xs font-bold" style={{ color: siteSettings.primary_color }}>RM {Number(item.price).toFixed(2)}</p>
                      <div className="flex items-center space-x-3 mt-2">
                        <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => updateQuantity(item.id || item.name, -1)} className="p-1.5 bg-slate-100 rounded hover:bg-slate-200"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold">{item.quantity}</span>
                        <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => updateQuantity(item.id || item.name, 1)} className="p-1.5 bg-slate-100 rounded hover:bg-slate-200"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <button type="button" aria-label={`Remove ${item.name}`} onClick={() => removeFromCart(item.id || item.name)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t bg-slate-50 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>RM {cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{`Shipping (Free above RM ${FREE_SHIPPING_THRESHOLD}, otherwise RM ${FLAT_SHIPPING_FEE.toFixed(2)})`}</span>
                  <span>{shippingCost === 0 ? 'Free' : `RM ${shippingCost.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax</span>
                  <span>RM 0.00</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-2 border-t">
                  <span>Total</span>
                  <span>RM {cartTotal.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsCartOpen(false); setTermsAccepted(false); setCheckoutStep('shipping'); }}
                  className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: siteSettings.primary_color }}
                >
                  Proceed to Order
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Product detail modal: previously selectedProduct was set but never rendered */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-slate-800" onClick={(e) => { if (e.target === e.currentTarget) setSelectedProduct(null); }}>
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              aria-label="Close product details"
              onClick={() => setSelectedProduct(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={selectedProduct.image} alt={selectedProduct.name} onError={handleImageError} className="w-full h-72 object-cover rounded-2xl border border-slate-100" />
            <p className="text-xs font-semibold text-indigo-600 mt-5">{selectedProduct.category}</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{selectedProduct.name}</h2>
            <p className="text-xl font-bold text-slate-900 mt-2">RM {parseFloat(selectedProduct.price).toFixed(2)}</p>
            <div className="flex items-center gap-3 text-sm text-slate-600 mt-3">
              {selectedProduct.reviews > 0 ? (
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {selectedProduct.rating} ({selectedProduct.reviews} reviews)
                </span>
              ) : (
                <span>No reviews yet</span>
              )}
              <span>{selectedProduct.sales_count || 0} sold</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mt-4 whitespace-pre-line">
              {selectedProduct.description}
            </p>
            <div className="flex items-center gap-3 mt-6">
              <span className="text-sm font-semibold text-slate-700">Quantity</span>
              <button type="button" aria-label="Decrease quantity" onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><Minus className="w-4 h-4" /></button>
              <span className="text-sm font-bold min-w-6 text-center">{detailQuantity}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setDetailQuantity((q) => q + 1)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><Plus className="w-4 h-4" /></button>
            </div>
            <button
              type="button"
              onClick={() => { addToCart(selectedProduct, detailQuantity); setSelectedProduct(null); }}
              className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all hover:opacity-90 mt-4"
              style={{ backgroundColor: siteSettings.primary_color }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}

      {/* 社交媒体引流结账弹窗 */}
      {checkoutStep && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm text-slate-800">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button onClick={() => setCheckoutStep(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>

            {checkoutStep === 'shipping' && (
              <form onSubmit={handleOrderSubmit} className="space-y-4">
                <h2 className="text-xl font-bold">Order &amp; Delivery Details</h2>
                <p className="text-xs text-slate-500">Fill in your delivery details and we will generate an order link to contact the seller to confirm.</p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
                  {cart.map(item => (
                    <div key={item.id || item.name} className="flex justify-between text-sm text-slate-600">
                      <span>{item.name} x {item.quantity}</span>
                      <span>RM {((parseFloat(item.price) || 0) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm text-slate-600 pt-2 border-t">
                    <span>Subtotal</span>
                    <span>RM {cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? 'Free' : `RM ${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t">
                    <span>Total</span>
                    <span>RM {cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <input required placeholder="Full Name" value={shippingInfo.fullName} onChange={e => setShippingInfo({...shippingInfo, fullName: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input required placeholder="Email" type="email" value={shippingInfo.email} onChange={e => setShippingInfo({...shippingInfo, email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input required placeholder="Phone" value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input required placeholder="Street Address" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />

                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="City" value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                  <input required placeholder="Zip Code" value={shippingInfo.zipCode} onChange={e => setShippingInfo({...shippingInfo, zipCode: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>

                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input type="checkbox" required checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5" />
                  <span>I agree to the store&apos;s shipping and returns terms.</span>
                </label>

                <button type="submit" className="w-full text-white font-bold py-3.5 rounded-xl transition-all hover:opacity-90 shadow-md" style={{ backgroundColor: siteSettings.primary_color }}>
                  Confirm Order &amp; Contact Seller
                </button>
              </form>
            )}

            {checkoutStep === 'processing' && (
              <div className="text-center py-12 space-y-3">
                <RefreshCw className="w-10 h-10 animate-spin mx-auto" style={{ color: siteSettings.primary_color }} />
                <p className="font-bold">Saving your order...</p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-6 space-y-5">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />

                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-slate-900">To place your order, contact the seller via WhatsApp or Instagram DM</h2>
                  <p className="text-xs text-slate-500">
                    Your order number is <span className="font-bold text-slate-800">#{lastPlacedOrderId}</span>. Click a button below to open the chat and complete your purchase!
                  </p>
                  {lastOrderSummary && (
                    <p className="text-xs text-slate-500">{lastOrderSummary}</p>
                  )}
                  <p className="text-sm font-bold text-slate-800">Total: RM {lastOrderTotal.toFixed(2)}</p>
                </div>

                <div className="space-y-3 pt-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>Send Order via WhatsApp</span>
                  </a>

                  <a
                    href={`https://instagram.com/${INSTAGRAM_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Contact via Instagram DM</span>
                  </a>
                </div>

                <button
                  onClick={() => setCheckoutStep(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-xs transition-all mt-3"
                >
                  Continue browsing
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
