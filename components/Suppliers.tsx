import React, { useState } from 'react';
import { Plus, Trash2, Mail, Phone, Globe, User, PenTool } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Language, Translation, Supplier } from '../types';
import { DAYS_RO, DAYS_HU, METHODS_RO, METHODS_HU } from '../constants';

interface SuppliersProps {
  t: Translation;
  lang: Language;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  storeLocation?: string;
}

const Suppliers: React.FC<SuppliersProps> = ({ t, lang, suppliers, setSuppliers, storeLocation }) => {
  const [showForm, setShowForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({});
  const [isCustomMethod, setIsCustomMethod] = useState(false);
  const [loading, setLoading] = useState(false);

  const days = lang === 'RO' ? DAYS_RO : DAYS_HU;
  const methods = lang === 'RO' ? METHODS_RO : METHODS_HU;
  const methodValues: string[] = ['Email', 'Phone', 'Online', 'Agent'];

  const handleAdd = async () => {
    if (!newSupplier.name || !newSupplier.orderDay) return;
    setLoading(true);
    
    const supplierPayload = {
      name: newSupplier.name,
      contact: newSupplier.contact || '',
      orderMethod: newSupplier.orderMethod || 'Email',
      orderDay: newSupplier.orderDay,
      deliveryDay: newSupplier.deliveryDay || '',
      user_id: (await supabase.auth.getUser()).data.user?.id,
      store_location: storeLocation
    };
    
    const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierPayload])
        .select()
        .single();

    if (!error && data) {
        setSuppliers([...suppliers, data]);
        setNewSupplier({});
        setIsCustomMethod(false);
        setShowForm(false);
    } else {
        alert("Error adding supplier");
        console.error(error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.confirmDelete)) {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if(!error) {
        setSuppliers(suppliers.filter(s => s.id !== id));
      } else {
          alert("Error deleting supplier");
      }
    }
  };

  const handleMethodChange = (val: string) => {
      if (val === 'CUSTOM') {
          setIsCustomMethod(true);
          setNewSupplier({...newSupplier, orderMethod: ''});
      } else {
          setIsCustomMethod(false);
          setNewSupplier({...newSupplier, orderMethod: val});
      }
  }

  const getMethodIcon = (method: string) => {
    const m = method?.toLowerCase() || '';
    if (m.includes('email')) return <Mail size={16} />;
    if (m.includes('phone') || m.includes('tel')) return <Phone size={16} />;
    if (m.includes('online') || m.includes('web')) return <Globe size={16} />;
    if (m.includes('agent')) return <User size={16} />;
    return <PenTool size={16} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{t.suppliers}</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
        >
          {showForm ? <span className="flex items-center space-x-2">{t.cancel}</span> : <span className="flex items-center space-x-2"><Plus size={18} /><span>{t.addSupplier}</span></span>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-in slide-in-from-top-4 border-l-4 border-l-orange-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.name}</label>
              <input 
                type="text" 
                value={newSupplier.name || ''} 
                onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.contact}</label>
              <input 
                type="text" 
                value={newSupplier.contact || ''} 
                onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.orderDay}</label>
              <select 
                value={newSupplier.orderDay || ''} 
                onChange={e => setNewSupplier({...newSupplier, orderDay: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select...</option>
                {days.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.deliveryDay}</label>
              <select 
                value={newSupplier.deliveryDay || ''} 
                onChange={e => setNewSupplier({...newSupplier, deliveryDay: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select...</option>
                {days.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.method}</label>
                    <select 
                        value={isCustomMethod ? 'CUSTOM' : newSupplier.orderMethod || 'Email'} 
                        onChange={e => handleMethodChange(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    >
                        {methodValues.map((m, i) => <option key={m} value={m}>{methods[i]}</option>)}
                        <option value="CUSTOM">{t.other}</option>
                    </select>
                </div>
                {isCustomMethod && (
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">{t.customMethod}</label>
                         <input 
                            type="text" 
                            value={newSupplier.orderMethod || ''} 
                            onChange={e => setNewSupplier({...newSupplier, orderMethod: e.target.value})}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                            autoFocus
                        />
                    </div>
                )}
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleAdd}
              disabled={!newSupplier.name || !newSupplier.orderDay || loading}
              className="bg-lime-600 hover:bg-lime-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? "..." : t.save}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{supplier.name}</h3>
              <button onClick={() => handleDelete(supplier.id)} className="text-slate-400 hover:text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-lime-50 text-lime-600 rounded-md">
                   {getMethodIcon(supplier.orderMethod)}
                </div>
                <span>{supplier.orderMethod}</span>
              </div>
              <div className="flex items-center space-x-2">
                 <div className="w-7"></div>
                 <span className="text-slate-500">{supplier.contact}</span>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <span className="text-slate-500">{t.orderDay}:</span>
                <span className="font-medium text-slate-800">{supplier.orderDay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{t.deliveryDay}:</span>
                <span className="font-medium text-slate-800">{supplier.deliveryDay}</span>
              </div>
            </div>
          </div>
        ))}
        
        {suppliers.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            {t.noData}
          </div>
        )}
      </div>
    </div>
  );
};

export default Suppliers;