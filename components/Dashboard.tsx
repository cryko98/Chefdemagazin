import React from 'react';
import { Users, ShoppingCart, List, Heart, TrendingUp } from 'lucide-react';
import { Language, Translation, Supplier, Product, OrderItem, WishlistItem } from '../types';

interface DashboardProps {
  t: Translation;
  lang: Language;
  suppliers: Supplier[];
  products: Product[];
  orders: OrderItem[];
  wishlist: WishlistItem[];
}

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string; 
}> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-3xl font-bold text-slate-800 mt-2">{value}</h3>
    </div>
    <div className={`p-4 rounded-lg ${color} text-white shadow-md`}>
      {icon}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ t, suppliers, products, orders, wishlist }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-16 blur-3xl"></div>
        <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2 text-white">{t.welcome}</h2>
            <p className="text-lime-200">{t.role}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t.totalSuppliers} 
          value={suppliers.length} 
          icon={<Users size={24} />} 
          color="bg-orange-500"
        />
        <StatCard 
          title={t.productsListed} 
          value={products.length} 
          icon={<List size={24} />} 
          color="bg-lime-600"
        />
        <StatCard 
          title={t.activeOrders} 
          value={orders.length} 
          icon={<ShoppingCart size={24} />} 
          color="bg-amber-500"
        />
        <StatCard 
          title={t.wishlistItems} 
          value={wishlist.length} 
          icon={<Heart size={24} />} 
          color="bg-rose-500"
        />
      </div>

      {suppliers.length === 0 && (
        <div className="bg-white p-12 text-center rounded-xl border-2 border-dashed border-slate-200">
          <TrendingUp className="mx-auto text-slate-300 w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">{t.noData}</h3>
          <p className="text-slate-400 max-w-md mx-auto">Start by adding your suppliers in the "Suppliers" tab to manage your inventory and orders efficiently.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;