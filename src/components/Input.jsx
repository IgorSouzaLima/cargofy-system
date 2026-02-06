import React from 'react';

export default function Input({ label, type = 'text', value, onChange, placeholder = '' }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-100 rounded-xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-sm font-semibold transition-all"
      />
    </div>
  );
}
