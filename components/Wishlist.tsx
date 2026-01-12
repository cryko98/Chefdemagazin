import React, { useState } from 'react';
import { Plus, Trash2, Heart, RefreshCw } from 'lucide-react';
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
        const { data } = await supabase.from('wishlist').select('*').eq('store_location', storeLocation);
        if (data) setWishlist(data);
    }
    setRefreshing(false);
  };

  const handleAdd = async () => {
    if (!newItemName) return;
    setLoading(true);

    const payload = {
      name: newItemName,
      addedDate: new Date().toLocaleDateString(),
      notes: newItemNote,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      store_location: storeLocation
    };
    
    // Optimistic Update
    const tempId = Math.random().toString();
    const tempItem: WishlistItem = { ...payload, id: tempId, addedDate: new Date().toLocaleDateString() };
    setWishlist(prev => [...prev, tempItem]);

    const { data, error } = await supabase.from('wishlist').insert([payload]).select().single();
    if(data) {
        setWishlist(prev => prev.map(item => item.id === tempId ? data : item));
        setNewItemName('');
        setNewItemNote('');
    } else {
        console.error(error);
        setWishlist(prev => prev.filter(item => item.id !== tempId));
        alert('Error adding wishlist item');
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    // Optimistic delete
    setWishlist(prev => prev.filter(w => w.id !== id));
    
    const { error } = await supabase.from('wishlist').delete().eq('id', id);
    if(error) {
        // Revert on error
        handleRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                <Heart className="text-rose-500" />
                <span>{t.addWishlist}</span>
            </h2>
            <button 
                onClick={handleRefresh} 
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title={t.refresh}
            >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
        </div>
       
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    <Plus size={18} />
                    <span>{loading ? "..." : t.add}</span>
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wishlist.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start animate-in fade-in slide-in-from-bottom-2">
                <div>
                    <h3 className="font-bold text-slate-800">{item.name}</h3>
                    {item.notes && <p className="text-sm text-slate-600 mt-1">{item.notes}</p>}
                    <p className="text-xs text-slate-400 mt-2">Added: {item.addedDate}</p>
                </div>
                <button 
                    onClick={() => handleRemove(item.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        ))}
        {wishlist.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                {t.noData}
            </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;