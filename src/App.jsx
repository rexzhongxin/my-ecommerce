import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  ShoppingBag, 
  Search, 
  Heart, 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  Star, 
  ArrowRight, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  SlidersHorizontal,
  Eye,
  Sparkles,
  Package,
  CheckCircle2,
  LayoutDashboard,
  Store,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', name: 'All Products' },
  { id: 'Electronics', name: 'Electronics' },
  { id: 'Footwear', name: 'Footwear' },
  { id: 'Accessories', name: 'Accessories' },
  { id: 'Lifestyle', name: 'Lifestyle' }
];

export default function App() {
  // --- STATE ---
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // 切换“前台网店”与“商家后台”

  // 搜索与筛选
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  
  // 交互状态
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // 新增/编辑商品表单状态（后台用）
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Electronics',
    price: '',
    image: '',
    description: '',
    rating: 5.0,
    reviews: 10,
    is_active: true
  });

  // 结账表单状态
  const [shippingInfo, setShippingInfo] = useState({ fullName: '', email: '', address: '', city: '', zipCode: '' });
  const [paymentInfo, setPaymentInfo] = useState({ cardNumber: '', cardName: '', expiry: '', cvv: '' });

  // 页面加载时拉取商品
  useEffect(() => {
    fetchProducts();
  }, []);

  // 1. 从 Supabase 读取所有商品
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  // 2. 从 Supabase 读取订单（进入后台时触发）
  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*');
    if (!error && data) {
      setOrders(data);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- 后台操作：新增商品到 Supabase ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      showToast('请完整填写商品名称、价格和图片地址！');
      return;
    }

    const { data, error } = await supabase.from('products').insert([
      {
        name: newProduct.name,
        category: newProduct.category,
        price: parseFloat(newProduct.price),
        image: newProduct.image,
        description: newProduct.description,
        rating: parseFloat(newProduct.rating),
        reviews: parseInt(newProduct.reviews),
        is_active: true
      }
    ]).select();

    if (!error) {
      showToast(`商品 "${newProduct.name}" 已成功发布到云端！`);
      setNewProduct({ name: '', category: 'Electronics', price: '', image: '', description: '', rating: 5.0, reviews: 10, is_active: true });
      fetchProducts(); // 刷新本地商品列表
    } else {
      showToast('发布失败：' + error.message);
    }
  };

  // --- 后台操作：一键切换上下架状态 ---
  const toggleProductActive = async (id, currentStatus) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', id);
    if (!error) {
      showToast(!currentStatus ? '商品已上架！' : '商品已下架！');
      fetchProducts();
    }
  };

  // --- 前台操作：购物车 ---
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

  // --- 模拟结算并真正写入 Supabase orders 表 ---
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setCheckoutStep('processing');

    // 将订单提交到 Supabase orders 表
    const { error } = await supabase.from('orders').insert([
      {
        customer_name: shippingInfo.fullName,
        email: shippingInfo.email,
        address: `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.zipCode}`,
        total_price: cartTotal,
        items: JSON.stringify(cart),
        status: 'pending'
      }
    ]);

    if (!error) {
      setCheckoutStep('success');
      setCart([]);
    } else {
      showToast('订单提交失败：' + error.message);
      setCheckoutStep(null);
    }
  };

  // --- 计算 ---
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const shippingCost = cartSubtotal > 100 || cartSubtotal === 0 ? 0 : 9.99;
  const taxCost = cartSubtotal * 0.08;
  const cartTotal = cartSubtotal + shippingCost + taxCost;
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // 过滤出要在前台显示的商品（过滤下架商品）
  const displayedProducts = useMemo(() => {
    return products
      .filter(p => {
        // 前台默认只展示 is_active 不为 false 的商品
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
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // ==================== 商家管理后台界面 ====================
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans text-slate-800 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <div className="flex items-center space-x-2 text-indigo-600 font-bold">
                <LayoutDashboard className="w-6 h-6" />
                <span className="text-xl">NexusMarket 商家管理后台</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">云端实时数据控制面板 (Supabase Connected)</p>
            </div>
            <button
              onClick={() => setIsAdmin(false)}
              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow transition-all self-start md:self-auto"
            >
              <Store className="w-4 h-4" />
              <span>返回网店前台</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. 发布新商品表单 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" /> 发布新商品
              </h2>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">商品名称</label>
                  <input
                    type="text"
                    placeholder="如: Sony WH-1000XM5"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">价格 ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="299.00"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">分类</label>
                    <select
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Electronics">Electronics</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Lifestyle">Lifestyle</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">图片链接 (URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newProduct.image}
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">详细描述</label>
                  <textarea
                    rows="3"
                    placeholder="描述商品功能亮点..."
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm"
                >
                  保存并上架到数据库
                </button>
              </form>
            </div>

            {/* 2. 商品列表与上下架管理 */}
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
                      <button
                        onClick={() => toggleProductActive(p.id, p.is_active)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          p.is_active !== false 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        {p.is_active !== false ? (
                          <><span>已上架</span> <ToggleRight className="w-4 h-4 text-emerald-600" /></>
                        ) : (
                          <><span>已下架</span> <ToggleLeft className="w-4 h-4 text-rose-400" /></>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. 实时订单记录 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-600" /> 顾客订单中心 ({orders.length})
                  </h2>
                  <button onClick={fetchOrders} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> 重新加载订单
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {orders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">暂无订单数据，在前台提交测试订单后会自动出现在这里。</p>
                  ) : (
                    orders.map(o => (
                      <div key={o.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>订单号: #{o.id}</span>
                          <span className="text-indigo-600">${o.total_price?.toFixed(2)}</span>
                        </div>
                        <p><span className="text-slate-500">顾客:</span> {o.customer_name} ({o.email})</p>
                        <p><span className="text-slate-500">送货地址:</span> {o.address}</p>
                        <p className="text-slate-400 pt-1 border-t border-slate-200 mt-1">状态: <span className="text-amber-600 font-semibold">{o.status}</span></p>
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

  // ==================== 前台网店界面 ====================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all transform animate-bounce">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
                NexusMarket
              </span>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {/* 后台入口按钮 */}
              <button
                onClick={() => {
                  setIsAdmin(true);
                  fetchOrders();
                }}
                className="flex items-center space-x-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-all shadow-sm"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>商家后台</span>
              </button>

              {/* Cart Icon */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-md transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-semibold text-sm hidden sm:inline">Cart</span>
                {totalCartItemsCount > 0 && (
                  <span className="bg-white text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full">
                    {totalCartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HERO BANNER --- */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-xl text-center md:text-left">
            <span className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cloud Database Powered</span>
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Elevate Your Everyday Essentials.
            </h1>
            <p className="mt-4 text-slate-300 text-base md:text-lg leading-relaxed">
              Discover premium curated electronics, modern home accents, and stylish apparel delivered directly to your door.
            </p>
          </div>
        </div>
      </section>

      {/* --- MAIN CATALOG --- */}
      <main id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        {/* Category Pills & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
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
              className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">正在加载 Supabase 云端商品数据...</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No active products found</h3>
              <p className="text-slate-500 text-sm mt-1">请点击右上角“商家后台”添加或上架商品。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {displayedProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative"
                >
                  <div className="relative h-56 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(product)}>
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-1 text-amber-400 text-xs font-semibold">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>{product.rating || 5.0}</span>
                        <span className="text-slate-400">({product.reviews || 0})</span>
                      </div>
                      <h3 onClick={() => setSelectedProduct(product)} className="mt-2 text-base font-bold text-slate-800 hover:text-indigo-600 cursor-pointer line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">{product.description}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-lg font-bold text-slate-900">${parseFloat(product.price).toFixed(2)}</span>
                      <button onClick={() => addToCart(product)} className="p-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl shadow-md">
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

      {/* --- CART DRAWER --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div onClick={() => setIsCartOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="text-lg font-bold text-slate-900">Your Shopping Cart</h2>
                <button onClick={() => setIsCartOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <p className="text-center py-16 text-slate-500">Your cart is empty</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="py-4 flex items-center space-x-4">
                      <img src={item.image} alt="" className="w-16 h-16 object-cover rounded-xl" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold">{item.name}</h4>
                        <p className="text-xs font-bold text-indigo-600">${item.price}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-slate-100 rounded"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-slate-100 rounded"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-slate-50 space-y-3">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => { setIsCartOpen(false); setCheckoutStep('shipping'); }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- CHECKOUT MODAL FLOW --- */}
      {checkoutStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative">
            <button onClick={() => setCheckoutStep(null)} className="absolute top-6 right-6 text-slate-400"><X className="w-5 h-5" /></button>

            {checkoutStep === 'shipping' && (
              <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('payment'); }} className="space-y-4">
                <h2 className="text-xl font-bold">Shipping Details</h2>
                <input required placeholder="Full Name" value={shippingInfo.fullName} onChange={e => setShippingInfo({...shippingInfo, fullName: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                <input required placeholder="Email Address" type="email" value={shippingInfo.email} onChange={e => setShippingInfo({...shippingInfo, email: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                <input required placeholder="Street Address" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Continue to Payment</button>
              </form>
            )}

            {checkoutStep === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <h2 className="text-xl font-bold">Payment Information</h2>
                <input required placeholder="Cardholder Name" value={paymentInfo.cardName} onChange={e => setPaymentInfo({...paymentInfo, cardName: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                <input required placeholder="Card Number" value={paymentInfo.cardNumber} onChange={e => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl text-sm" />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">Pay ${cartTotal.toFixed(2)}</button>
              </form>
            )}

            {checkoutStep === 'processing' && (
              <div className="text-center py-12 space-y-3">
                <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                <p className="font-bold">Submitting order to Supabase...</p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <h2 className="text-2xl font-bold">Order Saved to Database!</h2>
                <p className="text-xs text-slate-500">你的订单已实时同步写入 Supabase 数据库 `orders` 表。你可以在“商家后台”查看到这张订单。</p>
                <button onClick={() => setCheckoutStep(null)} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">Continue Shopping</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}