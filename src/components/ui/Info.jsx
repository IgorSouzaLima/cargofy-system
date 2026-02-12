import React from 'react';

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
      <p className="font-bold text-slate-800">{value || '---'}</p>
    </div>
  );
}

export default Info;
