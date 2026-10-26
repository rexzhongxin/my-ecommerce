import React, { useState, useMemo, useEffect } from 'react';
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
  Palette
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', name: 'All Products' },
  { id: 'Electronics', name: 'Electronics' },
  { id: 'Footwear', name: 'Footwear' },
  { id: 'Accessories', name: 'Accessories' },
  { id: 'Lifestyle', name: 'Lifestyle' }
];

export default function App() {
  const isAdminEnvironment = useMemo(() => {
    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);
    return hostname.includes('admin') || searchParams.get('admin') === 'true';
  }, []);

  // --- STATE ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false); // 控制前台调色浮窗开关

  // 店面外观与色彩设置状态
  const [siteSettings, setSiteSettings] = useState({
    store_name: 'NexusMarket',
    store_logo: '',
    hero_title: 'Elevate Your Everyday Essentials.',
    hero_subtitle: 'Discover premium curated electronics, modern home accents, and stylish apparel delivered directly to your door.',
    primary_color: '#4f46e5',
    text_color: '#1e293b',
    bg_color: '#f8fafc'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // 搜索与筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  
  // 交互状态
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // 新增商品表单状态
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Electronics', price: '', image: '', description: '', rating: 5.0, reviews: 10, is_active: true
  });

  // 结账表单状态
  const [shippingInfo, setShippingInfo] = useState({ fullName: '', email: '', address: '', city: '', zipCode: '' });
  const [paymentInfo, setPaymentInfo] = useState({ cardNumber: '', cardName: '', expiry: '', cvv: '' });

  useEffect(() => {
    fetchProducts();
    fetchSettings();
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*');
    if (!error && data) setOrders(data);
  };

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (!error && data) {
      setSiteSettings({
        store_name: data.store_name || 'NexusMarket',
        store_logo: data.store_logo || '',
        hero_title: data.hero_title || 'Elevate Your Everyday Essentials.',
        hero_subtitle: data.hero_subtitle || 'Discover premium curated electronics...',
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

  // 保存色彩与外观设置到 Supabase
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 1, ...siteSettings });

    setSavingSettings(false);
    if (!error) {
      showToast('配色已成功同步保存至云端数据库！');
    } else {
      showToast('保存失败：' + error.message);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      showToast('请完整填写商品信息！');
      return;
    }

    const { error } = await supabase.from('products').insert([{
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      image: newProduct.image,
      description: newProduct.description,
      rating: parseFloat(newProduct.rating),
      reviews: parseInt(newProduct.reviews),
      is_active: true
    }]);

    if (!error) {
      showToast(`商品 "${newProduct.name}" 发布成功！`);
      setNewProduct({ name: '', category: 'Electronics', price: '', image: '', description: '', rating: 5.0, reviews: 10, is_active: true });
      fetchProducts(); 
    } else {
      showToast('发布失败：' + error.message);
    }
  };

  const toggleProductActive = async (id, currentStatus) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      showToast(!currentStatus ? '商品已上架！' : '商品已下架！');
      fetchProducts();
    }
  };

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prevCart, { ...product, quantity }];
    });
    showToast(`Added "${product.name}" to cart!`);
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
    showToast('Item removed from cart.');
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setCheckoutStep('processing');

    const { error } = await supabase.from('orders').insert([{
      customer_name: shippingInfo.fullName,
      email: shippingInfo.email,
      address: `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.zipCode}`,
      total_price: cartTotal,
      items: JSON.stringify(cart),
      status: 'pending'
    }]);

    if (!error) {
      setCheckoutStep('success');
      setCart([]);
    } else {
      showToast('订单提交失败：' + error.message);
      setCheckoutStep(null);
    }
  };

  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const shippingCost = cartSubtotal > 100 || cartSubtotal === 0 ? 0 : 9.99;
  const taxCost = cartSubtotal * 0.08;
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
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return (a.id || 0) - (b.id || 0);
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // ==================== 商家管理后台界面 (Admin Backstage Portal) ====================
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

          {/* 后台文本与主题面板 */}
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
                <Plus className="w-5 h-5 text-indigo-600" /> 发布新商品
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">商品名称</label>
                  <input type="text" placeholder="如: Sony WH-1000XM5" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">价格 ($)</label>
                    <input type="number" step="0.01" placeholder="299.00" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
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
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md text-sm">保存并上架</button>
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
                        <img src={p.image} alt="" className="w-12 h-12 object-cover rounded-lg border" />
                        <div>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{p.name}</p>
                          <p className="text-xs text-slate-400">${p.price} | {p.category}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleProductActive(p.id, p.is_active)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${p.is_active !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                        {p.is_active !== false ? (<><span>已上架</span> <ToggleRight className="w-4 h-4 text-emerald-600" /></>) : (<><span>已下架</span> <ToggleLeft className="w-4 h-4 text-rose-400" /></>)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-600" /> 顾客订单中心 ({orders.length})
                  </h2>
                  <button onClick={fetchOrders} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 重新加载订单</button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {orders.length === 0 ? (<p className="text-xs text-slate-400 text-center py-6">暂无订单数据。</p>) : (
                    orders.map(o => (
                      <div key={o.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>订单号: #{o.id}</span>
                          <span className="text-indigo-600">${o.total_price?.toFixed(2)}</span>
                        </div>
                        <p><span className="text-slate-500">顾客:</span> {o.customer_name} ({o.email})</p>
                        <p><span className="text-slate-500">送货地址:</span> {o.address}</p>
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
      className="min-h-screen font-sans antialiased flex flex-col transition-colors duration-300"
      style={{ backgroundColor: siteSettings.bg_color, color: siteSettings.text_color }}
    >
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all animate-bounce">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 🌟🌟🌟 Admin 专属前台“实时调色”悬浮卡片 🌟🌟🌟 */}
      {isAdminEnvironment && (
        <div className="fixed bottom-6 right-6 z-50">
          {!showColorPicker ? (
            <button
              onClick={() => setShowColorPicker(true)}
              className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-full shadow-2xl font-bold text-xs hover:bg-slate-800 border border-slate-700 transition-all hover:scale-105"
            >
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>实时调色板</span>
            </button>
          ) : (
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
                      onChange={e => setSiteSettings({ ...siteSettings, primary_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
                    />
                    <input 
                      type="text" 
                      value={siteSettings.primary_color}
                      onChange={e => setSiteSettings({ ...siteSettings, primary_color: e.target.value })}
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
                      onChange={e => setSiteSettings({ ...siteSettings, text_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
                    />
                    <input 
                      type="text" 
                      value={siteSettings.text_color}
                      onChange={e => setSiteSettings({ ...siteSettings, text_color: e.target.value })}
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
                      onChange={e => setSiteSettings({ ...siteSettings, bg_color: e.target.value })}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
                    />
                    <input 
                      type="text" 
                      value={siteSettings.bg_color}
                      onChange={e => setSiteSettings({ ...siteSettings, bg_color: e.target.value })}
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
                <span>{savingSettings ? '保存中...' : '保存全新配色'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- NAVBAR --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
              {siteSettings.store_logo ? (
                <img src={siteSettings.store_logo} alt="Logo" className="w-10 h-10 object-contain rounded-xl shadow-md" />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: siteSettings.primary_color }}>
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="text-2xl font-bold tracking-tight" style={{ color: siteSettings.primary_color }}>
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
                  onClick={() => { setIsAdmin(true); fetchOrders(); }}
                  className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-sm"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>商家后台</span>
                </button>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center space-x-2 text-white px-4 py-2 rounded-full shadow-md transition-all hover:opacity-90"
                style={{ backgroundColor: siteSettings.primary_color }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-semibold text-sm hidden sm:inline">Cart</span>
                {totalCartItemsCount > 0 && (
                  <span className="bg-white font-bold text-xs px-2 py-0.5 rounded-full" style={{ color: siteSettings.primary_color }}>
                    {totalCartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HERO BANNER --- */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-xl text-center md:text-left">
            <span className="inline-flex items-center space-x-2 bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cloud Database Powered</span>
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              {siteSettings.hero_title}
            </h1>
            <p className="mt-4 text-slate-300 text-base md:text-lg leading-relaxed">
              {siteSettings.hero_subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* --- MAIN CATALOG --- */}
      <main id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow