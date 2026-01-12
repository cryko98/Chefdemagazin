import React, { useState } from 'react';
import { Plus, Trash2, Heart, RefreshCw, Store } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Language, Translation, WishlistItem } from '../types';

interface WishlistProps {
  t: Translation;
  lang: Language;
  wishlist: WishlistItem[];
  setWishlist: React.Dispatch<React.SetStateAction<WishlistItem[]>>;
  storeLocation?: string;
}

const Wishlist: React.FC<WishlistProps> = ({ t, lang, wishlist, setWishlist, storeLocation }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemNote, setNewItemNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (storeLocation) {
        // Explicitly fetching by store_location, relying on RLS to permit it
        const { data, error } = await supabase
            .from('wishlist')
            .select('*')
            .eq('store_location', storeLocation)
            .order('addedDate', { ascending: false }); // Show newest first
            
        if (data) setWishlist(data);
        if (error) console.error("Wishlist refresh error:", error);
    }
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!newItemName) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      name: newItemName,
      addedDate: new Date().toLocaleDateString(),
      notes: newItemNote,
      user_id: user?.id,
      store_location: storeLocation
    };
    
    // Optimistic Update
    const tempId = Math.random().toString();
    const tempItem: WishlistItem = { ...payload, id: tempId, addedDate: new Date().toLocaleDateString() };
    setWishlist(prev => [tempItem, ...prev]);

    const { data, error } = await supabase.from('wishlist').insert([payload]).select().single();
    if(data) {
        setWishlist(prev => prev.map(item => item.id === tempId ? data : item));
        setNewItemName('');
        setNewItemNote('');
    } else {
        console.error("Add wishlist error:", error);
        setWishlist(prev => prev.filter(item => item.id !== tempId));
        alert('Error adding item. Please check internet connection.');
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    // Optimistic delete
    const prevList = [...wishlist];
    setWishlist(prev => prev.filter(w => w.id !== id));
    
    const { error } = await supabase.from('wishlist').delete().eq('id', id);
    if(error) {
        // Revert on error
        console.error("Delete wishlist error:", error);
        setWishlist(prevList);
        alert("Could not delete item.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
        {/* Decorative background badge */}
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Heart size={120} />
        </div>

        <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
                 <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                    <Heart className="text-rose-500 fill-rose-500" />
                    <span>{t.addWishlist}</span>
                </h2>
                <div className="flex items-center text-xs text-slate-500 mt-1 bg-slate-100 px-2 py-1 rounded-md w-fit">
                    <Store size={12} className="mr-1" />
                    <span>Shared list for: <strong className="text-slate-700">{storeLocation}</strong></span>
                </div>
            </div>

            <button 
                onClick={handleRefresh} 
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title={t.refresh}
            >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
        </div>
       
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end relative z-10">
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.name}</label>
                <input 
                    type="text" 
                    value={newItemName} 
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-rose-500 focus:border-rose-500"
                    placeholder="Product requested..."
                />
            </div>
            <div className="md:col-span-1 lg:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.notes}</label>
                <input 
                    type="text" 
                    value={newItemNote} 
                    onChange={e => setNewItemNote(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-rose-500 focus:border-rose-500"
                    placeholder="Who asked? Phone?"
                />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
                <button 
                    onClick={handleAdd}
                    disabled={!newItemName || loading}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-sm shadow-rose-200"
                >
                    <Plus size={18} />
                    <span>{loading ? "..." : t.add}</span>
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wishlist.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start animate-in fade-in slide-in-from-bottom-2 group hover:shadow-md transition-all">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">{item.name}</h3>
                    {item.notes && (
                        <div className="bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded mt-2 inline-block border border-amber-100">
                            {item.notes}
                        </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-3 flex items-center">
                        <span>{item.addedDate}</span>
                    </p>
                </div>
                <button 
                    onClick={() => handleRemove(item.id)}
                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                    title={t.delete}
                >
                    <Trash2 size={18} />
                </button>
            </div>
        ))}
        {wishlist.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Heart size={48} className="mx-auto text-slate-300 mb-3" />
                <p>{t.noData}</p>
                <p className="text-xs text-slate-400 mt-1">Items added here will be visible to all staff in {storeLocation}.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;