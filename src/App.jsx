import React, { useState, useMemo, useEffect } from 'react';
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
  Check, 
  ArrowRight, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  Filter, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Sparkles,
  Package,
  CheckCircle2
} from 'lucide-react';

// --- MOCK PRODUCT DATA ---
const PRODUCTS = [
  {
    id: 1,
    name: "Sony WH-1000XM5 无线降噪耳机",
    category: "Electronics",
    price: 399.00,
    rating: 4.9,
    reviews: 230,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
    description: "业界领先的智能主动降噪，拥有 30 小时超长续航与极佳的音质体验。"
  },
  {
    id: 2,
    name: "Apple M5 MacBook Air 13 英寸",
    category: "Electronics",
    price: 1099.00,
    rating: 5.0,
    reviews: 88,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&q=80",
    description: "极致轻薄设计，搭载全新 M5 芯片，强劲性能与全天候电池续航。"
  },
  {
    id: 3,
    name: "Nike Renew Run 4 运动跑鞋",
    category: "Footwear",
    price: 89.00,
    rating: 4.7,
    reviews: 142,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80",
    description: "舒适透气面料配以缓冲中底，专为日常慢跑与体能训练打造。"
  },
  {
    id: 4,
    name: "Salomon XT-WHISPER 户外越野鞋",
    category: "Footwear",
    price: 160.00,
    rating: 4.8,
    reviews: 64,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80",
    description: "防滑耐磨大底，抓地力强，兼具户外徒步性能与复古潮流外观。"
  },
  {
    id: 5,
    name: "极简风复古机械手表",
    category: "Accessories",
    price: 199.50,
    rating: 4.6,
    reviews: 53,
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&q=80",
    description: "316L 精钢表壳配以真皮表带，全自动机械机芯，彰显品味。"
  },
  {
    id: 6,
    name: "Oakley 运动太阳眼镜 OO9096",
    category: "Accessories",
    price: 145.00,
    rating: 4.9,
    reviews: 79,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&q=80",
    description: "包裹式运动造型，偏光镜片有效阻挡紫外线与强光眩光。"
  },
  {
    id: 7,
    name: "我的自定义商品（使用 public 本地图片）",
    category: "Lifestyle",
    price: 49.90,
    rating: 5.0,
    reviews: 12,
    image: "/my-product.jpg",
    description: "这是直接读取项目 public 文件夹内部图片的写法示例。"
  }
];

const CATEGORIES = [
  { id: 'all', name: 'All Products' },
  { id: 'Electronics', name: 'Electronics' },
  { id: 'Footwear', name: 'Footwear' },
  { id: 'Accessories', name: 'Accessories' },
  { id: 'Lifestyle', name: 'Lifestyle' }
];

export default function App() {
  // --- STATE ---
  const [products] = useState(PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  
  // Interactive UI States
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'United States'
  });
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: ''
  });

  // Toast Trigger Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- CART HANDLERS ---
  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prevCart, { ...product, quantity }];
    });
    showToast(`Added "${product.name}" to cart!`);
  };

  const updateQuantity = (id, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      });
    });
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
    showToast('Item removed from cart.');
  };

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.some(item => item.id === product.id);
      if (exists) {
        showToast('Removed from wishlist');
        return prev.filter(item => item.id !== product.id);
      } else {
        showToast('Saved to wishlist!');
        return [...prev, product];
      }
    });
  };

  // --- CALCULATIONS ---
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const shippingCost = cartSubtotal > 100 || cartSubtotal === 0 ? 0 : 9.99;
  const taxCost = cartSubtotal * 0.08;
  const cartTotal = cartSubtotal + shippingCost + taxCost;
  const totalCartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- FILTERED & SORTED PRODUCTS ---
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Handle Mock Payment Submission
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setCheckoutStep('processing');
    setTimeout(() => {
      setCheckoutStep('success');
      setCart([]);
    }, 1500);
  };

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
                placeholder="Search products, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all text-sm"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => showToast(`Wishlist has ${wishlist.length} item(s)`)}
                className="relative p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                title="Wishlist"
              >
                <Heart className="w-6 h-6" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-full shadow-md shadow-indigo-200 transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold text-sm hidden sm:inline">Cart</span>
                {totalCartItemsCount > 0 && (
                  <span className="bg-white text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full">
                    {totalCartItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="pb-4 md:hidden">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>
        </div>
      </header>

      {/* --- HERO BANNER --- */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="max-w-xl text-center md:text-left">
            <span className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spring Collection 2026</span>
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Elevate Your Everyday Essentials.
            </h1>
            <p className="mt-4 text-slate-300 text-base md:text-lg leading-relaxed">
              Discover premium curated electronics, modern home accents, and stylish apparel delivered directly to your door with free express shipping.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <a href="#shop" className="bg-white text-indigo-900 hover:bg-slate-100 font-bold px-6 py-3 rounded-full shadow-lg transition-all flex items-center space-x-2">
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="mt-10 md:mt-0 flex gap-4 overflow-hidden py-4 opacity-90 hidden lg:flex">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 w-48 shadow-2xl transform -rotate-3 hover:rotate-0 transition-all">
              <img src={PRODUCTS[0].image} alt="Headphones" className="h-32 w-full object-cover rounded-xl" />
              <p className="mt-2 text-xs font-medium text-slate-200 truncate">{PRODUCTS[0].name}</p>
              <p className="text-sm font-bold text-indigo-300">${PRODUCTS[0].price}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 w-48 shadow-2xl transform rotate-3 hover:rotate-0 transition-all mt-6">
              <img src={PRODUCTS[1].image} alt="Watch" className="h-32 w-full object-cover rounded-xl" />
              <p className="mt-2 text-xs font-medium text-slate-200 truncate">{PRODUCTS[1].name}</p>
              <p className="text-sm font-bold text-indigo-300">${PRODUCTS[1].price}</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- MAIN CONTENT / CATALOG --- */}
      <main id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-200">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 self-end md:self-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">No products found</h3>
              <p className="text-slate-500 text-sm mt-1">Try adjusting your search query or filter settings.</p>
              <button
                onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
                className="mt-6 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {filteredProducts.map(product => {
                const isWishlisted = wishlist.some(item => item.id === product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative"
                  >
                    {/* Wishlist Button */}
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-600 hover:text-rose-500 transition-colors shadow-sm"
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>

                    {/* Image Area */}
                    <div className="relative h-56 bg-slate-100 overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(product)}>
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-white/90 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Quick View
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center space-x-1 text-amber-400 text-xs font-semibold">
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span>{product.rating}</span>
                          <span className="text-slate-400">({product.reviews})</span>
                        </div>
                        <h3 
                          onClick={() => setSelectedProduct(product)}
                          className="mt-2 text-base font-bold text-slate-800 hover:text-indigo-600 cursor-pointer line-clamp-1 transition-colors"
                        >
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      {/* Price & Action */}
                      <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-lg font-bold text-slate-900">${product.price.toFixed(2)}</span>
                        </div>

                        <button
                          onClick={() => addToCart(product)}
                          className="p-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl transition-all shadow-md active:scale-95"
                          title="Add to Cart"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* --- QUICK VIEW MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative flex flex-col md:flex-row">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="md:w-1/2 h-64 md:h-auto bg-slate-100 relative">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>

            <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  {selectedProduct.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedProduct.name}</h2>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(selectedProduct.rating) ? 'fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedProduct.rating} ({selectedProduct.reviews} reviews)
                  </span>
                </div>

                <div className="mt-4 flex items-baseline space-x-3">
                  <span className="text-2xl font-bold text-slate-900">${selectedProduct.price.toFixed(2)}</span>
                </div>

                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  {selectedProduct.description}
                </p>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center text-xs text-slate-500">
                    <Truck className="w-4 h-4 mr-2 text-indigo-600" /> Free Shipping on orders over $100
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 mr-2 text-indigo-600" /> 2-Year Warranty Included
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SLIDE-OVER CART DRAWER --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            onClick={() => setIsCartOpen(false)} 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-900">Your Shopping Cart</h2>
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                    {totalCartItemsCount}
                  </span>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Your cart is currently empty</p>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-sm text-indigo-600 font-semibold hover:underline"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="py-4 flex items-center space-x-4">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl border border-slate-100" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{item.name}</h4>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">${item.price.toFixed(2)}</p>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Estimated Shipping</span>
                    <span>{shippingCost === 0 ? <span className="text-emerald-600 font-semibold">FREE</span> : `$${shippingCost.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Estimated Tax (8%)</span>
                    <span>${taxCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCheckoutStep('shipping');
                    }}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {checkoutStep !== 'processing' && checkoutStep !== 'success' && (
              <button
                onClick={() => setCheckoutStep(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Step 1: Shipping Form */}
            {checkoutStep === 'shipping' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900">Shipping Details</h2>
                <p className="text-xs text-slate-500 mt-1">Please enter your delivery destination.</p>

                <form onSubmit={(e) => { e.preventDefault(); setCheckoutStep('payment'); }} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Doe"
                      value={shippingInfo.fullName}
                      onChange={e => setShippingInfo({...shippingInfo, fullName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      placeholder="jane@example.com"
                      value={shippingInfo.email}
                      onChange={e => setShippingInfo({...shippingInfo, email: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Street Address</label>
                    <input
                      required
                      type="text"
                      placeholder="123 Commerce St, Suite 400"
                      value={shippingInfo.address}
                      onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                      <input
                        required
                        type="text"
                        placeholder="San Francisco"
                        value={shippingInfo.city}
                        onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Zip Code</label>
                      <input
                        required
                        type="text"
                        placeholder="94103"
                        value={shippingInfo.zipCode}
                        onChange={e => setShippingInfo({...shippingInfo, zipCode: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                  >
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Payment Form */}
            {checkoutStep === 'payment' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900">Payment Information</h2>
                <p className="text-xs text-slate-500 mt-1">Mock test payment process.</p>

                <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cardholder Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Doe"
                      value={paymentInfo.cardName}
                      onChange={e => setPaymentInfo({...paymentInfo, cardName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="4532 •••• •••• 8892"
                        value={paymentInfo.cardNumber}
                        onChange={e => setPaymentInfo({...paymentInfo, cardNumber: e.target.value})}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <CreditCard className="w-5 h-5 text-slate-400 absolute left-3.5 top-2.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry (MM/YY)</label>
                      <input
                        required
                        type="text"
                        placeholder="12/28"
                        value={paymentInfo.expiry}
                        onChange={e => setPaymentInfo({...paymentInfo, expiry: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">CVV</label>
                      <input
                        required
                        type="password"
                        placeholder="123"
                        maxLength="4"
                        value={paymentInfo.cvv}
                        onChange={e => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                    <div className="flex justify-between text-sm font-bold text-slate-900">
                      <span>Total Charge:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('shipping')}
                      className="w-1/3 border border-slate-200 text-slate-600 font-semibold py-3.5 rounded-xl hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                    >
                      Pay ${cartTotal.toFixed(2)}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Step 3: Processing State */}
            {checkoutStep === 'processing' && (
              <div className="text-center py-12 space-y-4">
                <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">Processing Payment...</h3>
                <p className="text-xs text-slate-500">Please do not refresh or close this window.</p>
              </div>
            )}

            {/* Step 4: Order Success */}
            {checkoutStep === 'success' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Order Placed Successfully!</h2>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">
                  Thank you for your purchase. We've sent a confirmation email with your order tracking updates.
                </p>

                <div className="bg-slate-50 p-4 rounded-xl text-left text-xs text-slate-600 space-y-1 mt-6 border border-slate-200">
                  <p><span className="font-semibold text-slate-800">Order Number:</span> #NX-{Math.floor(100000 + Math.random() * 900000)}</p>
                  <p><span className="font-semibold text-slate-800">Shipping to:</span> {shippingInfo.fullName}, {shippingInfo.city}</p>
                </div>

                <button
                  onClick={() => setCheckoutStep(null)}
                  className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 mt-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-lg mb-4">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              <span>NexusMarket</span>
            </div>
            <p className="text-xs leading-relaxed">
              Crafting premium lifestyle and tech products designed to elevate your everyday experiences.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Shop Categories</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#shop" onClick={() => setSelectedCategory('Electronics')} className="hover:text-white transition-colors">Electronics</a></li>
              <li><a href="#shop" onClick={() => setSelectedCategory('Footwear')} className="hover:text-white transition-colors">Footwear</a></li>
              <li><a href="#shop" onClick={() => setSelectedCategory('Accessories')} className="hover:text-white transition-colors">Accessories</a></li>
              <li><a href="#shop" onClick={() => setSelectedCategory('Lifestyle')} className="hover:text-white transition-colors">Lifestyle</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Customer Support</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-white cursor-pointer">Help Center</li>
              <li className="hover:text-white cursor-pointer">Shipping & Delivery</li>
              <li className="hover:text-white cursor-pointer">Returns Policy</li>
              <li className="hover:text-white cursor-pointer">Contact Us</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Guarantees</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>Free Express Shipping</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>30-Day Money Back Guarantee</span>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-800 text-center text-xs">
          © {new Date().getFullYear()} NexusMarket Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}