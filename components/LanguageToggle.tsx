import React from 'react';
import { Language } from '../types';

interface LanguageToggleProps {
  current: Language;
  onToggle: (lang: Language) => void;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ current, onToggle }) => {
  return (
    <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
      <button
        onClick={() => onToggle('RO')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          current === 'RO' 
            ? 'bg-blue-600 text-white shadow-sm' 
            : 'text-slate-600 hover:bg-slate-200'
        }`}
      >
        RO
      </button>
      <button
        onClick={() => onToggle('HU')}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          current === 'HU' 
            ? 'bg-green-600 text-white shadow-sm' 
            : 'text-slate-600 hover:bg-slate-200'
        }`}
      >
        HU
      </button>
    </div>
  );
};

export default LanguageToggle;