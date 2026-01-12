import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, MessageSquareText, Store, Truck, Heart, Package, LogOut, Loader2, ScanLine } from 'lucide-react';
import { supabase } from './services/supabase';
import LanguageToggle from './components/LanguageToggle';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Suppliers from './components/Suppliers';
import Orders from './components/Orders';
import Wishlist from './components/Wishlist';
import Advisor from './components/Advisor';
import Scanner from './components/Scanner';
import Auth from './components/Auth';
import { Language, Supplier, Product, OrderItem, WishlistItem } from './types';
import { TRANSLATIONS } from './constants';

type Tab = 'dashboard' | 'inventory' | 'suppliers' | 'orders' | 'wishlist' | 'advisor' | 'scanner';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('RO');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Auth & Data Init
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchData();
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
      else {
          setSuppliers([]);
          setProducts([]);
          setOrders([]);
          setWishlist([]);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [supRes, prodRes, ordRes, wishRes] = await Promise.all([
            supabase.from('suppliers').select('*'),
            supabase.from('products').select('*'),
            supabase.from('orders').select('*'),
            supabase.from('wishlist').select('*')
        ]);

        if (supRes.data) setSuppliers(supRes.data);
        if (prodRes.data) setProducts(prodRes.data);
        if (ordRes.data) setOrders(ordRes.data);
        if (wishRes.data) setWishlist(wishRes.data);

    } catch (e) {
        console.error("Error fetching data", e);
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const t = TRANSLATIONS[language];

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-lime-600 animate-spin" /></div>;
  }

  if (!session) {
      return <Auth lang={language} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      {/* Sidebar Navigation - Brand Colors (Lighter Green as requested: lime-600) */}
      <aside className="w-16 lg:w-64 bg-lime-600 text-white flex flex-col fixed h-full z-10 transition-all duration-300 shadow-xl">
        <div className="h-20 flex flex-col items-center justify-center lg:items-start lg:px-6 border-b border-lime-500">
          <div className="flex items-center">
             <Store className="text-white w-8 h-8 lg:mr-2" />
             <span className="font-bold text-xl hidden lg:block tracking-tight text-white shadow-sm">LaDoiPasi</span>
          </div>
          <span className="text-xs text-lime-100 hidden lg:block font-medium tracking-wide">Sef de magazin</span>
        </div>

        <nav className="flex-1 py-6 px-2 lg:px-4 space-y-2 overflow-y-auto">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label={t.dashboard} />
          <NavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={20} />} label={t.scanner} />
          <NavButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon={<Truck size={20} />} label={t.suppliers} />
          <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label={t.inventory} />
          <NavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingCart size={20} />} label={t.orders} count={orders.length} />
          <NavButton active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Heart size={20} />} label={t.wishlist} count={wishlist.length} />
          <NavButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquareText size={20} />} label={t.advisor} />
        </nav>

        <div className="p-4 border-t border-lime-500 text-center lg:text-left bg-lime-700/30">
          <div className="hidden lg:block mb-4">
            <p className="text-xs text-lime-100 uppercase font-semibold mb-2">{t.role}</p>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white/30 flex items-center justify-center text-xs font-bold">
                 {session.user.email?.substring(0,2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate w-32" title={session.user.email}>{session.user.email}</p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center w-full space-x-2 text-lime-100 hover:text-white transition-colors">
              <LogOut size={16} />
              <span className="hidden lg:inline text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-16 lg:ml-64 p-6 lg:p-10 transition-all duration-300">
        {/* Top Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t[activeTab]}</h1>
            <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString(language === 'RO' ? 'ro-RO' : 'hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <LanguageToggle current={language} onToggle={setLanguage} />
        </header>

        {/* Dynamic View */}
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard t={t} lang={language} suppliers={suppliers} products={products} orders={orders} wishlist={wishlist} />}
          {activeTab === 'scanner' && <Scanner t={t} lang={language} />}
          {activeTab === 'suppliers' && <Suppliers t={t} lang={language} suppliers={suppliers} setSuppliers={setSuppliers} />}
          {activeTab === 'inventory' && <Inventory t={t} lang={language} products={products} setProducts={setProducts} suppliers={suppliers} setOrders={setOrders} />}
          {activeTab === 'orders' && <Orders t={t} lang={language} suppliers={suppliers} orders={orders} setOrders={setOrders} />}
          {activeTab === 'wishlist' && <Wishlist t={t} lang={language} wishlist={wishlist} setWishlist={setWishlist} />}
          {activeTab === 'advisor' && <Advisor t={t} lang={language} />}
        </div>
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button
    onClick={onClick}
    className={`w-full flex items-center justify-center lg:justify-between px-3 py-3 rounded-xl transition-all group ${
      active 
        ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
        : 'text-lime-50 hover:bg-lime-500 hover:text-white'
    }`}
  >
    <div className="flex items-center lg:space-x-3">
        {icon}
        <span className="hidden lg:block font-medium">{label}</span>
    </div>
    {(count !== undefined && count > 0) && (
        <span className={`hidden lg:flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full ${active ? 'bg-white text-orange-600' : 'bg-lime-800 text-white'}`}>
            {count}
        </span>
    )}
  </button>
)

export default App;