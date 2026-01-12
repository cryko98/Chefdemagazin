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

  // User Metadata
  const [userRole, setUserRole] = useState<UserRole>('MANAGER');
  const [userStore, setUserStore] = useState<StoreLocation>('Cherechiu');

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // Auth & Data Init
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          initializeUser(session);
      } else {
          setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          initializeUser(session);
      } else {
          setSuppliers([]);
          setProducts([]);
          setOrders([]);
          setWishlist([]);
          setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time Subscription Setup
  useEffect(() => {
      if (!session || !userStore) return;

      // We separate subscriptions to ensure stability
      const wishlistChannel = supabase.channel('wishlist-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wishlist' },
          (payload) => {
              // Fetch only wishlist to be efficient
               supabase.from('wishlist').select('*').eq('store_location', userStore)
               .then(({data}) => { if(data) setWishlist(data); });
          }
        )
        .subscribe();

      const generalChannel = supabase.channel('general-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => fetchData(userStore)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' },
          () => fetchData(userStore)
        )
         .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'suppliers' },
          () => fetchData(userStore)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(wishlistChannel);
        supabase.removeChannel(generalChannel);
      };
  }, [session, userStore]);

  const initializeUser = (session: any) => {
      const metadata = session.user.user_metadata;
      const role = metadata?.role || 'MANAGER';
      const store = metadata?.store_location || 'Cherechiu';
      
      setUserRole(role);
      setUserStore(store);

      // If cashier, default to wishlist
      if (role === 'CASHIER') {
          setActiveTab('wishlist');
      }

      fetchData(store);
  };

  const fetchData = async (storeLocation: string) => {
    try {
        // Fetch data filtered by the specific store location
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

  const renderContent = () => {
      // Security check for rendering
      if (userRole === 'CASHIER' && !['wishlist', 'scanner'].includes(activeTab)) {
          return <Wishlist t={t} lang={language} wishlist={wishlist} setWishlist={setWishlist} storeLocation={userStore} />;
      }

      switch(activeTab) {
          case 'dashboard': return <Dashboard t={t} lang={language} suppliers={suppliers} products={products} orders={orders} wishlist={wishlist} />;
          case 'scanner': return <Scanner t={t} lang={language} />;
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-lime-600 text-white flex-col fixed h-full z-20 transition-all duration-300 shadow-xl">
        <div className="h-20 flex flex-col items-start justify-center px-6 border-b border-lime-500">
          <div className="flex items-center">
             <Store className="text-white w-8 h-8 mr-2" />
             <span className="font-bold text-xl tracking-tight text-white shadow-sm">LaDoiPasi</span>
          </div>
          <span className="text-xs text-lime-100 font-medium tracking-wide mt-1">
              {userStore} • {userRole === 'MANAGER' ? t.roles.manager : t.roles.cashier}
          </span>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
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
          
          {userRole === 'CASHIER' && (
              <NavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={20} />} label={t.scanner} />
          )}

          {userRole === 'MANAGER' && (
            <NavButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquareText size={20} />} label={t.advisor} />
          )}
        </nav>

        <div className="p-4 border-t border-lime-500 bg-lime-700/30">
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-white/30 flex items-center justify-center text-xs font-bold">
                 {session.user.email?.substring(0,2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate w-32" title={session.user.email}>{session.user.email}</p>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-start w-full space-x-2 text-lime-100 hover:text-white transition-colors">
              <LogOut size={16} />
              <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden bg-lime-600 text-white p-4 sticky top-0 z-30 shadow-md flex justify-between items-center">
          <div className="flex items-center space-x-2">
               <Store className="text-white w-6 h-6" />
               <div>
                   <span className="font-bold text-lg block leading-none">LaDoiPasi</span>
                   <span className="text-[10px] text-lime-100 uppercase tracking-wider">{userStore}</span>
               </div>
          </div>
          <div className="flex items-center space-x-2">
               <LanguageToggle current={language} onToggle={setLanguage} mobile />
               <button onClick={handleLogout} className="p-2 text-lime-100 hover:text-white">
                   <LogOut size={20} />
               </button>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-10 transition-all duration-300 pb-24 lg:pb-10">
        {/* Desktop Header */}
        <header className="hidden lg:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t[activeTab]}</h1>
            <p className="text-slate-500 text-sm mt-1">{new Date().toLocaleDateString(language === 'RO' ? 'ro-RO' : 'hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <LanguageToggle current={language} onToggle={setLanguage} />
        </header>

        {/* Mobile Page Title */}
        <div className="lg:hidden mb-6 flex justify-between items-center">
            <h1 className="text-xl font-bold text-slate-800">{t[activeTab]}</h1>
        </div>

        {/* Dynamic View */}
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-between px-2 py-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-pb">
          {userRole === 'MANAGER' && (
              <>
                <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label={t.dashboard} />
                <MobileNavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={20} />} label={t.scanner} />
                <MobileNavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label={t.inventory} />
                <MobileNavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<ShoppingCart size={20} />} label={t.orders} count={orders.length} />
              </>
          )}

          {userRole === 'CASHIER' && (
               <MobileNavButton active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} icon={<ScanLine size={20} />} label={t.scanner} />
          )}

          <MobileNavButton active={activeTab === 'wishlist'} onClick={() => setActiveTab('wishlist')} icon={<Heart size={20} />} label={t.wishlist} count={wishlist.length} />

          {userRole === 'MANAGER' && (
             <MobileNavButton active={activeTab === 'advisor'} onClick={() => setActiveTab('advisor')} icon={<MessageSquareText size={20} />} label={t.advisor} />
          )}
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all group ${
      active 
        ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20' 
        : 'text-lime-50 hover:bg-lime-500 hover:text-white'
    }`}
  >
    <div className="flex items-center space-x-3">
        {icon}
        <span className="font-medium">{label}</span>
    </div>
    {(count !== undefined && count > 0) && (
        <span className={`flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full ${active ? 'bg-white text-orange-600' : 'bg-lime-800 text-white'}`}>
            {count}
        </span>
    )}
  </button>
);

const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg flex-1 ${
            active ? 'text-orange-600' : 'text-slate-400'
        }`}
    >
        <div className="relative">
            {icon}
            {(count !== undefined && count > 0) && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border border-white">
                    {count}
                </span>
            )}
        </div>
        <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">{label}</span>
    </button>
);

export default App;