import React from 'react';
import { Language } from '../types';

interface LanguageToggleProps {
  current: Language;
  onToggle: (lang: Language) => void;
  mobile?: boolean;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ current, onToggle, mobile }) => {
  return (
    <div className={`flex items-center space-x-1 p-1 rounded-lg border ${
        mobile 
        ? 'bg-lime-700 border-lime-500' 
        : 'bg-slate-100 border-slate-200'
    }`}>
      <button
        onClick={() => onToggle('RO')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          current === 'RO' 
            ? (mobile ? 'bg-white text-lime-700 shadow-sm' : 'bg-blue-600 text-white shadow-sm')
            : (mobile ? 'text-lime-200 hover:text-white' : 'text-slate-600 hover:bg-slate-200')
        }`}
      >
        RO
      </button>
      <button
        onClick={() => onToggle('HU')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          current === 'HU' 
            ? (mobile ? 'bg-white text-lime-700 shadow-sm' : 'bg-green-600 text-white shadow-sm')
            : (mobile ? 'text-lime-200 hover:text-white' : 'text-slate-600 hover:bg-slate-200')
        }`}
      >
        HU
      </button>
    </div>
  );
};

export default LanguageToggle;