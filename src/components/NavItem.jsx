import React from 'react';

export default function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      <Icon size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
