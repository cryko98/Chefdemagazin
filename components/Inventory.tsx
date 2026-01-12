import React, { useState } from 'react';
import { Plus, Trash2, ShoppingCart, Tag, Box, DollarSign } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Language, Translation, Product, Supplier, OrderItem } from '../types';

interface InventoryProps {
  t: Translation;
  lang: Language;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  suppliers: Supplier[];
  setOrders: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  storeLocation?: string;
}

const Inventory: React.FC<InventoryProps> = ({ t, lang, products, setProducts, suppliers, setOrders, storeLocation }) => {
  const [showForm, setShowForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newProduct.name || !newProduct.supplierId) return;
    setLoading(true);

    const productPayload = {
      name: newProduct.name,
      category: newProduct.category || 'General',
      stock: parseInt(newProduct.stock as any) || 0,
      price: parseFloat(newProduct.price as any) || 0,
      supplierId: newProduct.supplierId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      store_location: storeLocation
    };

    const { data, error } = await supabase.from('products').insert([productPayload]).select().single();

    if (!error && data) {
      setProducts([...products, data]);
      setNewProduct({});
      setShowForm(false);
    } else {
        console.error(error);
        alert('Error adding product');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.confirmDelete)) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if(!error) {
        setProducts(products.filter(p => p.id !== id));
      }
    }
  };

  const handleAddToOrder = async (product: Product) => {
    // Check if exists within this store context (filtered by RLS or query, but checking props here for safety)
    const { data: existingData } = await supabase
        .from('orders')
        .select('*')
        .eq('name', product.name)
        .eq('supplierId', product.supplierId)
        .eq('unit', 'pcs')
        .eq('store_location', storeLocation)
        .single();
    
    if (existingData) {
        // Update
        const { data: updated } = await supabase.from('orders').update({ quantity: existingData.quantity + 1 }).eq('id', existingData.id).select().single();
        if(updated) {
            setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
        }
    } else {
        // Create
        const payload = {
            name: product.name,
            quantity: 1,
            unit: 'pcs',
            supplierId: product.supplierId,
            isAdHoc: false,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            store_location: storeLocation
        }
        const { data: created } = await supabase.from('orders').insert([payload]).select().single();
        if(created) {
            setOrders(prev => [...prev, created]);
        }
    }
  };

  const getSupplierName = (id: string) => {
    return suppliers.find(s => s.id === id)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{t.inventory}</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm lg:text-base"
        >
          {showForm ? <span>{t.cancel}</span> : <span className="flex items-center space-x-2"><Plus size={18} /><span>{t.addProduct}</span></span>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-top-4 border-l-4 border-l-orange-500">
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.name}</label>
              <input 
                type="text" 
                value={newProduct.name || ''} 
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.supplier}</label>
              <select 
                value={newProduct.supplierId || ''} 
                onChange={e => setNewProduct({...newProduct, supplierId: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white"
              >
                <option value="">Select...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.stock}</label>
                    <input 
                        type="number" 
                        value={newProduct.stock || ''} 
                        onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.price}</label>
                    <input 
                        type="number" 
                        value={newProduct.price || ''} 
                        onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleAdd}
              disabled={!newProduct.name || !newProduct.supplierId || loading}
              className="bg-lime-600 hover:bg-lime-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 w-full lg:w-auto"
            >
              {loading ? "..." : t.save}
            </button>
          </div>
        </div>
      )}

      {/* Desktop View Table */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">{t.name}</th>
                <th className="px-6 py-4">{t.supplier}</th>
                <th className="px-6 py-4 text-right">{t.price}</th>
                <th className="px-6 py-4 text-center">{t.stock}</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                  <td className="px-6 py-4 text-slate-600">{getSupplierName(product.supplierId)}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">{product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stock < 10 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-lime-100 text-lime-800'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center flex justify-center space-x-3">
                    <button
                        onClick={() => handleAddToOrder(product)}
                        className="text-orange-500 hover:text-orange-700 p-1"
                        title={t.addToOrder}
                    >
                        <ShoppingCart size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        {t.noData}
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View Cards */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
               <div>
                  <h3 className="font-bold text-slate-800 text-lg">{product.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                      <Tag size={12} className="mr-1" />
                      {getSupplierName(product.supplierId)}
                  </p>
               </div>
               <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                      product.stock < 10 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-lime-100 text-lime-800'
                }`}>
                  <Box size={12} className="mr-1" />
                  {product.stock}
                </span>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                <div className="font-bold text-slate-700 flex items-center">
                    <DollarSign size={14} className="text-slate-400 mr-1" />
                    {product.price.toFixed(2)} RON
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => handleAddToOrder(product)}
                        className="bg-orange-50 text-orange-600 p-2 rounded-lg hover:bg-orange-100"
                    >
                        <ShoppingCart size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="bg-slate-50 text-slate-400 p-2 rounded-lg hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={20} />
                    </button>
                </div>
            </div>
          </div>
        ))}
         {products.length === 0 && (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                {t.noData}
            </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;