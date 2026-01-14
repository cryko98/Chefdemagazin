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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col lg:flex-row">
      <aside className="hidden lg:flex w-64 bg-lime-600 text-white flex-col fixed h-full z-20 shadow-xl">
        <div className="h-20 flex flex-col items-start justify-center px-6 border-b border-lime-500">
          <div className="flex items-center">
             <Store className="text-white w-8 h-8 mr-2" />
             <span className="font-bold text-xl tracking-tight">LaDoiPasi</span>
          </div>
          <span className="text-xs text-lime-100 mt-1">{userStore} • {userRole === 'MANAGER' ? t.roles.manager : t.roles.cashier}</span>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-1">
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
          <button onClick={handleLogout} className="flex items-center space-x-2 text-lime-100 hover:text-white transition-colors w-full"><LogOut size={16} /> <span className="text-sm">Logout</span></button>
        </div>
      </aside>

      <header className="lg:hidden bg-lime-600 text-white p-3 sticky top-0 z-30 shadow-md flex justify-between items-center">
          <div className="flex items-center space-x-2">
               <Store className="w-5 h-5" />
               <span className="font-bold text-base leading-none">LaDoiPasi <span className="font-normal text-[10px] opacity-80">| {userStore}</span></span>
          </div>
          <div className="flex items-center space-x-2">
               <LanguageToggle current={language} onToggle={setLanguage} mobile />
               <button onClick={handleLogout} className="p-1.5"><LogOut size={18} /></button>
          </div>
      </header>

      <main className="flex-1 lg:ml-64 p-3 md:p-6 lg:p-10 pb-20 lg:pb-10">
        <header className="hidden lg:flex justify-between items-center mb-8">
          <div><h1 className="text-2xl font-bold text-slate-800">{t[activeTab]}</h1></div>
          <LanguageToggle current={language} onToggle={setLanguage} />
        </header>
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center px-1 h-16 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] safe-area-pb">
          {userRole === 'MANAGER' && (
              <>
                <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label={t.dashboard} />
                <MobileNavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={18} />} label={t.scanner} />
                <MobileNavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={18} />} label={t.inventory} />
                <MobileNavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingCart size={18} />} label={t.orders} count={orders.length} />
              </>
          )}
          {userRole === 'CASHIER' && <MobileNavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={18} />} label={t.scanner} />}
          <MobileNavButton active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Heart size={18} />} label={t.wishlist} count={wishlist.length} />
          {userRole === 'MANAGER' && <MobileNavButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquareText size={18} />} label={t.advisor} />}
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-orange-500 text-white shadow-md' : 'text-lime-50 hover:bg-lime-500'}`}>
    <div className="flex items-center space-x-3">{icon} <span className="font-medium text-sm">{label}</span></div>
    {!!count && <span className={`flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${active ? 'bg-white text-orange-600' : 'bg-lime-800'}`}>{count}</span>}
  </button>
);

const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center h-full min-w-0 flex-1 px-0.5 ${active ? 'text-orange-600' : 'text-slate-400'}`}>
        <div className="relative">
            {icon}
            {!!count && <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">{count}</span>}
        </div>
        <span className="text-[8px] md:text-[10px] font-bold mt-1.5 uppercase tracking-tighter truncate w-full px-0.5 text-center">{label}</span>
    </button>
);

export default App;