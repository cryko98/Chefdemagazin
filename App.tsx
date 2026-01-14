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
import { Language, Supplier, Product, OrderItem, WishlistItem, UserRole, StoreLocation } from './types';
import { TRANSLATIONS } from './constants';

type Tab = 'dashboard' | 'inventory' | 'suppliers' | 'orders' | 'wishlist' | 'advisor' | 'scanner';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('RO');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const [userRole, setUserRole] = useState<UserRole>('MANAGER');
  const [userStore, setUserStore] = useState<StoreLocation>('Cherechiu');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initializeUser(session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initializeUser(session);
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

  useEffect(() => {
      if (!session || !userStore) return;
      const channel = supabase.channel('global-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist' }, () => fetchWishlist(userStore))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData(userStore))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData(userStore))
        .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [session, userStore]);

  const initializeUser = (session: any) => {
      const metadata = session.user.user_metadata;
      const role = metadata?.role || 'MANAGER';
      const store = metadata?.store_location || 'Cherechiu';
      setUserRole(role);
      setUserStore(store);
      if (role === 'CASHIER') setActiveTab('wishlist');
      fetchData(store);
  };

  const fetchWishlist = async (storeLocation: string) => {
      const { data } = await supabase.from('wishlist').select('*').eq('store_location', storeLocation);
      if (data) setWishlist(data);
  }

  const fetchData = async (storeLocation: string) => {
    try {
        const [supRes, prodRes, ordRes, wishRes] = await Promise.all([
            supabase.from('suppliers').select('*').eq('store_location', storeLocation),
            supabase.from('products').select('*').eq('store_location', storeLocation),
            supabase.from('orders').select('*').eq('store_location', storeLocation),
            supabase.from('wishlist').select('*').eq('store_location', storeLocation)
        ]);
        if (supRes.data) setSuppliers(supRes.data);
        if (prodRes.data) setProducts(prodRes.data);
        if (ordRes.data) setOrders(ordRes.data);
        if (wishRes.data) setWishlist(wishRes.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };
  const t = TRANSLATIONS[language];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-lime-600 animate-spin" /></div>;
  if (!session) return <Auth lang={language} />;

  const renderContent = () => {
      if (userRole === 'CASHIER' && !['wishlist', 'scanner'].includes(activeTab)) {
          return <Wishlist t={t} lang={language} wishlist={wishlist} setWishlist={setWishlist} storeLocation={userStore} />;
      }
      switch(activeTab) {
          case 'dashboard': return <Dashboard t={t} lang={language} suppliers={suppliers} products={products} orders={orders} wishlist={wishlist} />;
          case 'scanner': return <Scanner t={t} lang={language} storeLocation={userStore} />;
          case 'suppliers': return <Suppliers t={t} lang={language} suppliers={suppliers} setSuppliers={setSuppliers} storeLocation={userStore} />;
          case 'inventory': return <Inventory t={t} lang={language} products={products} setProducts={setProducts} suppliers={suppliers} setOrders={setOrders} storeLocation={userStore} />;
          case 'orders': return <Orders t={t} lang={language} suppliers={suppliers} orders={orders} setOrders={setOrders} storeLocation={userStore} />;
          case 'wishlist': return <Wishlist t={t} lang={language} wishlist={wishlist} setWishlist={setWishlist} storeLocation={userStore} />;
          case 'advisor': return <Advisor t={t} lang={language} />;
          default: return <Dashboard t={t} lang={language} suppliers={suppliers} products={products} orders={orders} wishlist={wishlist} />;
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-lime-600 text-white flex-col fixed h-full z-20 shadow-xl">
        <div className="h-20 flex flex-col items-start justify-center px-6 border-b border-lime-500">
          <div className="flex items-center">
             <Store className="text-white w-8 h-8 mr-2" />
             <span className="font-bold text-xl tracking-tight">LaDoiPasi</span>
          </div>
          <span className="text-xs text-lime-100 mt-1 uppercase tracking-widest font-bold">{userStore}</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {userRole === 'MANAGER' && (
              <>
                <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label={t.dashboard} />
                <NavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={20} />} label={t.scanner} />
                <NavButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon={<Truck size={20} />} label={t.suppliers} />
                <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label={t.inventory} />
                <NavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingCart size={20} />} label={t.orders} count={orders.length} />
              </>
          )}
          <NavButton active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Heart size={20} />} label={t.wishlist} count={wishlist.length} />
          {userRole === 'CASHIER' && <NavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={20} />} label={t.scanner} />}
          {userRole === 'MANAGER' && <NavButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquareText size={20} />} label={t.advisor} />}
        </nav>
        <div className="p-4 border-t border-lime-500 bg-lime-700/30">
          <button onClick={handleLogout} className="flex items-center space-x-2 text-lime-100 hover:text-white transition-colors w-full px-2 py-2 rounded-lg hover:bg-lime-600/50"><LogOut size={16} /> <span className="text-sm font-medium">Logout</span></button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden bg-lime-600 text-white p-3 sticky top-0 z-40 shadow-md flex justify-between items-center h-12">
          <div className="flex items-center space-x-2">
               <Store className="w-4 h-4 text-orange-400" />
               <span className="font-black text-[11px] uppercase tracking-tight">LaDoiPasi <span className="font-normal opacity-60 ml-0.5">| {userStore}</span></span>
          </div>
          <div className="flex items-center space-x-2">
               <LanguageToggle current={language} onToggle={setLanguage} mobile />
               <button onClick={handleLogout} className="p-1.5 bg-lime-700/50 rounded-md"><LogOut size={14} /></button>
          </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 p-3 md:p-6 lg:p-10 pb-20 lg:pb-10 overflow-x-hidden">
        <header className="hidden lg:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{t[activeTab]}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{userStore} • {userRole}</p>
          </div>
          <LanguageToggle current={language} onToggle={setLanguage} />
        </header>
        
        <div className="max-w-7xl mx-auto mb-4">
          {renderContent()}
        </div>
      </main>

      {/* MOBILE SCROLLABLE NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] safe-area-pb">
          <div className="flex items-center overflow-x-auto scrollbar-hide snap-x px-2 h-14 bg-white">
              {userRole === 'MANAGER' && (
                  <>
                    <MobileTabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16} />} label={t.dashboard} />
                    <MobileTabButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={16} />} label={t.scanner} />
                    <MobileTabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={16} />} label={t.inventory} />
                    <MobileTabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingCart size={16} />} label={t.orders} count={orders.length} />
                  </>
              )}
              {userRole === 'CASHIER' && <MobileTabButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={16} />} label={t.scanner} />}
              <MobileTabButton active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Heart size={16} />} label={t.wishlist} count={wishlist.length} />
              {userRole === 'MANAGER' && <MobileTabButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquareText size={16} />} label={t.advisor} />}
              <MobileTabButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon={<Truck size={16} />} label={t.suppliers} />
          </div>
      </nav>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 translate-x-1' : 'text-lime-50 hover:bg-lime-500 hover:translate-x-1'}`}>
    <div className="flex items-center space-x-3">{icon} <span className="font-bold text-sm tracking-tight">{label}</span></div>
    {!!count && <span className={`flex items-center justify-center w-5 h-5 text-[10px] font-black rounded-full ${active ? 'bg-white text-orange-600' : 'bg-lime-800 text-lime-100'}`}>{count}</span>}
  </button>
);

const MobileTabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button 
        onClick={onClick} 
        className={`flex flex-col items-center justify-center h-full min-w-[68px] snap-center transition-all duration-200 relative ${active ? 'text-orange-600 scale-105' : 'text-slate-400'}`}
    >
        <div className="relative">
            {icon}
            {!!count && <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[7px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white font-black">{count}</span>}
        </div>
        <span className={`text-[8px] font-black mt-1 uppercase tracking-tighter transition-all ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
        {active && <div className="absolute bottom-0.5 w-4 h-0.5 bg-orange-600 rounded-full"></div>}
    </button>
);

export default App;