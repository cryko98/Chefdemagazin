import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Store, Loader2, MapPin, UserCircle } from 'lucide-react';
import { STORE_LOCATIONS, TRANSLATIONS } from '../constants';
import { StoreLocation, UserRole } from '../types';

interface AuthProps {
  lang: 'RO' | 'HU';
}

const Auth: React.FC<AuthProps> = ({ lang }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration specific fields
  const [selectedRole, setSelectedRole] = useState<UserRole>('MANAGER');
  const [selectedStore, setSelectedStore] = useState<StoreLocation>('Cherechiu');

  const t = TRANSLATIONS[lang];
  
  // Local translations for auth screen only
  const labels = {
    RO: {
      title: 'LaDoiPasi Manager',
      subtitle: 'Conectare în cont',
      email: 'Email',
      password: 'Parolă',
      login: 'Autentificare',
      register: 'Înregistrare',
      noAccount: 'Nu ai cont?',
      hasAccount: 'Ai deja cont?',
      remember: 'Rămâi conectat',
      loading: 'Se încarcă...',
      registerSuccess: 'Înregistrare reușită! Verifică email-ul sau autentifică-te.',
    },
    HU: {
      title: 'LaDoiPasi Manager',
      subtitle: 'Bejelentkezés',
      email: 'Email',
      password: 'Jelszó',
      login: 'Bejelentkezés',
      register: 'Regisztráció',
      noAccount: 'Nincs még fiókod?',
      hasAccount: 'Van már fiókod?',
      remember: 'Bejelentkezve maradok',
      loading: 'Feldolgozás...',
      registerSuccess: 'Sikeres regisztráció! Jelentkezz be.',
    }
  };

  const localT = labels[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  role: selectedRole,
                  store_location: selectedStore
              }
          }
        });
        if (error) throw error;
        else alert(localT.registerSuccess);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-lime-600 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
               <Store className="text-orange-500 w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{localT.title}</h1>
          <p className="text-lime-100 mt-2">{isLogin ? localT.subtitle : localT.register}</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{localT.email}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="manager@ladoipasi.ro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{localT.password}</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                            <MapPin size={14} /> {t.selectStore}
                        </label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value as StoreLocation)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                        >
                            {STORE_LOCATIONS.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                            <UserCircle size={14} /> {t.selectRole}
                        </label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                        >
                            <option value="MANAGER">{t.roles.manager}</option>
                            <option value="CASHIER">{t.roles.cashier}</option>
                        </select>
                    </div>
                </div>
            )}

            {isLogin && (
                <div className="flex items-center">
                    <input 
                        id="remember-me" 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                        {localT.remember}
                    </label>
                </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? localT.login : localT.register)}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors"
            >
              {isLogin ? localT.noAccount : localT.hasAccount}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;