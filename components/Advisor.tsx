import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { Language, Translation, Message } from '../types';
import { askBusinessAdvisor } from '../services/gemini';

interface AdvisorProps {
  t: Translation;
  lang: Language;
}

const Advisor: React.FC<AdvisorProps> = ({ t, lang }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: lang === 'RO' ? 'Bună! Sunt asistentul tău virtual. Cu ce te pot ajuta astăzi?' : 'Szia! A virtuális asszisztensed vagyok. Miben segíthetek ma?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset welcome message when language changes
  useEffect(() => {
    setMessages([{ 
      role: 'model', 
      text: lang === 'RO' ? 'Bună! Sunt asistentul tău virtual. Cu ce te pot ajuta astăzi?' : 'Szia! A virtuális asszisztensed vagyok. Miben segíthetek ma?' 
    }]);
  }, [lang]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const responseText = await askBusinessAdvisor(userMsg, lang);
    
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[600px] flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
        <h3 className="text-white font-bold text-lg flex items-center space-x-2">
          <Bot size={24} />
          <span>{t.askAi}</span>
        </h3>
        <p className="text-orange-100 text-sm mt-1 opacity-90">
          Powered by Gemini 2.0 Flash
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-orange-500 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1 opacity-70 text-xs">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span className="uppercase tracking-wider font-bold">{msg.role === 'user' ? 'You' : 'AI'}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-sm">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.aiPlaceholder}
            disabled={loading}
            className="w-full pl-4 pr-12 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-xl transition-all outline-none text-slate-800 placeholder-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Advisor;