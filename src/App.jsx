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
  Instagram
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
  const [showColorPicker, setShowColorPicker] = useState(false);

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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Electronics', price: '', image: '', description: '', rating: 5.0, reviews: 10, is_active: true
  });

  const [shippingInfo, setShippingInfo] = useState({ fullName: '', email: '', address: '', city: '', zipCode: '' });

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