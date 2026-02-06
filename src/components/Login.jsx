import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import Input from './Input';

export default function Login({ auth }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isReg, setIsReg] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    try {
      if (isReg) await createUserWithEmailAndPassword(auth, email, pass);
      else await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      alert('Falha na autenticação. Verifique os dados.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_15%_85%,_rgba(14,165,233,0.2),transparent_34%)]" />
      <div className="relative min-h-screen grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 p-6 lg:p-10 items-center">
        <section className="hidden xl:flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-10 min-h-[78vh]">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/15 border border-blue-300/20">
              <Truck size={18} className="text-blue-300" />
              <span className="text-xs font-black tracking-[0.2em] uppercase text-blue-100">CargoFy TMS</span>
            </div>
            <h1 className="mt-8 text-4xl font-black leading-tight tracking-tight max-w-xl">Plataforma profissional para gestão operacional de transporte e frete.</h1>
            <p className="mt-5 text-slate-300 max-w-xl">Controle cargas, documentos, financeiro e comprovantes em um único painel com visão de operação em tempo real.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Rastreamento de Cargas', 'Gestão de CT-e e NF', 'Conciliação Financeira', 'Relatórios Operacionais'].map((item) => (
              <div key={item} className="px-4 py-3 rounded-xl border border-white/10 bg-slate-900/50 text-sm font-semibold text-slate-200">{item}</div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-lg mx-auto">
          <div className="rounded-3xl border border-slate-200/20 bg-white shadow-2xl p-8 md:p-10 text-slate-900">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-lg shadow-blue-600/30">
                <Truck size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">CargoFy TMS</h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Acesso seguro ao painel operacional</p>
              </div>
            </div>

            <form onSubmit={handle} className="space-y-4">
              <Input label="E-mail corporativo" value={email} onChange={setEmail} placeholder="seuemail@empresa.com" />
              <Input label="Senha" type="password" value={pass} onChange={setPass} placeholder="••••••••" />

              <button className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all">
                {isReg ? 'Criar Conta' : 'Entrar no TMS'}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <button type="button" onClick={() => setIsReg(!isReg)} className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors">
                  {isReg ? 'Já possui conta? Fazer login' : 'Primeiro acesso? Criar conta'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
