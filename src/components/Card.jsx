import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Card({ title, value, icon: Icon, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white p-6 rounded-2xl shadow-sm border ${active ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-100'} flex items-start justify-between transition-all hover:shadow-md hover:scale-[1.02] active:scale-95`}
    >
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-xl font-black text-slate-800 mt-1">{value}</h3>
        {onClick && <p className="text-[9px] font-bold text-blue-500 mt-2 flex items-center gap-1 uppercase">Ver detalhes <ArrowRight size={10} /></p>}
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
        <Icon size={20} />
      </div>
    </button>
  );
}
