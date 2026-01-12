import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Mail, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Language, Translation, Supplier, OrderItem, Unit } from '../types';
import { generateOrderEmail } from '../services/gemini';

interface OrdersProps {
  t: Translation;
  lang: Language;
  suppliers: Supplier[];
  orders: OrderItem[];
  setOrders: React.Dispatch<React.SetStateAction<OrderItem[]>>;
}

const Orders: React.FC<OrdersProps> = ({ t, lang, suppliers, orders, setOrders }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState<Unit>('pcs');
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [activeDraftSupplier, setActiveDraftSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);

  // Set default active supplier
  useEffect(() => {
    if (suppliers.length > 0 && !activeSupplierId) {
        setActiveSupplierId(suppliers[0].id);
    }
  }, [suppliers]);

  // Filter orders for active supplier
  const activeOrders = activeSupplierId 
    ? orders.filter(o => o.supplierId === activeSupplierId)
    : [];
  
  const currentSupplier = suppliers.find(s => s.id === activeSupplierId);

  const handleAddAdHoc = async () => {
    if (!newItemName || !activeSupplierId) return;
    setLoading(true);

    const payload = {
      name: newItemName,
      quantity: newItemQty,
      unit: newItemUnit,
      supplierId: activeSupplierId,
      isAdHoc: true,
      user_id: (await supabase.auth.getUser()).data.user?.id
    };
    
    const { data, error } = await supabase.from('orders').insert([payload]).select().single();
    if(data) {
        setOrders([...orders, data]);
        setNewItemName('');
        setNewItemQty(1);
        setNewItemUnit('pcs');
    } else {
        console.error(error);
    }
    setLoading(false);
  };

  const removeOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) {
        setOrders(orders.filter(o => o.id !== id));
    }
  };

  const handleGenerateEmail = async () => {
    if (!currentSupplier) return;

    setGeneratingFor(currentSupplier.id);
    setActiveDraftSupplier(currentSupplier);
    setEmailDraft(null);
    const draft = await generateOrderEmail(currentSupplier, activeOrders, lang);
    setEmailDraft(draft);
    setGeneratingFor(null);
  };

  const clearOrdersForSupplier = async (supplierId: string) => {
    if(confirm(t.confirmDelete)) {
        // Optimistic update
        const prev = [...orders];
        setOrders(orders.filter(o => o.supplierId !== supplierId));
        
        const { error } = await supabase.from('orders').delete().eq('supplierId', supplierId);
        if(error) {
            setOrders(prev); // Revert
            alert("Error clearing list");
        } else {
            setEmailDraft(null);
            setActiveDraftSupplier(null);
        }
    }
  }

  if (suppliers.length === 0) {
      return (
        <div className="py-12 text-center text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
            {t.noData}
        </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Supplier Tabs - Horizontal Scroll */}
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
        {suppliers.map(s => (
            <button
                key={s.id}
                onClick={() => setActiveSupplierId(s.id)}
                className={`whitespace-nowrap px-4 py-3 rounded-xl font-medium text-sm transition-all flex-shrink-0 flex items-center space-x-2 ${
                    activeSupplierId === s.id 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
                <ShoppingBag size={16} />
                <span>{s.name}</span>
                {orders.filter(o => o.supplierId === s.id).length > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeSupplierId === s.id ? 'bg-white text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                        {orders.filter(o => o.supplierId === s.id).length}
                    </span>
                )}
            </button>
        ))}
      </div>

      {activeSupplierId && currentSupplier ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             {/* Header Info */}
            <div className="bg-white p-4 lg:p-6 rounded-t-xl border-b border-slate-100 flex flex-col gap-4 border border-slate-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{currentSupplier.name}</h2>
                        <div className="flex flex-wrap gap-2 mt-1 text-sm text-slate-500">
                            <span className="whitespace-nowrap">{t.orderDay}: <span className="font-medium text-slate-700">{currentSupplier.orderDay}</span></span>
                            <span className="hidden sm:inline text-slate-300">|</span>
                            <span className="whitespace-nowrap">{t.deliveryDay}: <span className="font-medium text-slate-700">{currentSupplier.deliveryDay}</span></span>
                        </div>
                    </div>
                     <span className="bg-lime-100 text-lime-800 px-2 py-1 rounded text-xs font-bold">{currentSupplier.orderMethod}</span>
                </div>
                
                {activeOrders.length > 0 && (
                    <button 
                        onClick={handleGenerateEmail}
                        disabled={generatingFor === currentSupplier.id}
                        className="w-full sm:w-auto bg-lime-600 hover:bg-lime-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 shadow-sm"
                    >
                        <Mail size={18} />
                        <span>{generatingFor === currentSupplier.id ? t.loading : t.generateOrder}</span>
                    </button>
                )}
            </div>

            {/* Quick Add To Current Supplier */}
            <div className="bg-slate-50 p-4 border-x border-slate-200 flex flex-col md:flex-row gap-3 items-end">
                <div className="w-full md:flex-[2]">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{t.addToOrder} ({currentSupplier.name})</label>
                    <input 
                        type="text" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Product name..."
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <div className="flex-1 md:w-24">
                         <label className="block text-xs font-semibold text-slate-500 mb-1">{t.quantity}</label>
                        <input 
                            type="number" 
                            min="1"
                            value={newItemQty}
                            onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>
                    <div className="flex-1 md:w-28">
                         <label className="block text-xs font-semibold text-slate-500 mb-1">{t.unit}</label>
                        <select 
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value as Unit)}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500 bg-white"
                        >
                            <option value="pcs">{t.units.pcs}</option>
                            <option value="kg">{t.units.kg}</option>
                            <option value="box">{t.units.box}</option>
                        </select>
                    </div>
                </div>
                <button 
                    onClick={handleAddAdHoc}
                    disabled={!newItemName || loading}
                    className="w-full md:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* List */}
            <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-hidden min-h-[300px]">
                {activeOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                        <ShoppingBag size={48} className="mb-2 opacity-20" />
                        <p>{t.noData}</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {activeOrders.map(item => (
                            <li key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-lime-100 text-lime-700 px-3 py-1 rounded-lg text-sm font-bold min-w-[3.5rem] text-center flex flex-col sm:flex-row items-center justify-center sm:space-x-1 leading-tight">
                                        <span>{item.quantity}</span>
                                        <span className="text-[10px] sm:text-xs font-normal opacity-75">{t.units[item.unit]}</span>
                                    </div>
                                    <span className={`text-sm sm:text-base ${item.isAdHoc ? 'italic text-slate-600' : 'text-slate-900 font-medium'}`}>
                                        {item.name}
                                    </span>
                                </div>
                                <button onClick={() => removeOrder(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                    <Trash2 size={18} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
      ) : (
          <div className="text-center py-12 text-slate-500">
              {t.selectSupplier}
          </div>
      )}

       {/* Email Modal */}
       {emailDraft && activeDraftSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                <Mail className="text-orange-500" size={20} />
                <span>{t.emailPreview}</span>
              </h3>
              <button 
                onClick={() => setEmailDraft(null)}
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                {t.close}
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-line font-mono border-l-4 border-l-orange-500">
                    {emailDraft}
                  </div>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-lime-700 bg-lime-50 p-3 rounded-md border border-lime-200">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>Gemini: Review draft before sending.</span>
                  </div>
                </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-3">
               <button
                  onClick={() => clearOrdersForSupplier(activeDraftSupplier.id)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium border border-transparent hover:border-red-100 transition-colors"
               >
                   Clear List
               </button>
               <div className="flex gap-3">
                    <button 
                        onClick={() => setEmailDraft(null)}
                        className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                    >
                        {t.close}
                    </button>
                    <button 
                        className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center space-x-2 shadow-sm"
                        onClick={() => {
                            alert('Simulated sending email to ' + activeDraftSupplier.contact);
                            setEmailDraft(null);
                        }}
                    >
                        <CheckCircle size={16} />
                        <span>{t.send}</span>
                    </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;