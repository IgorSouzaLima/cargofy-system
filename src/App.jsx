import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, ChevronRight, 
  CheckCircle2, Clock, Package, MapPin, X, Trash2, Briefcase, 
  CreditCard, AlertTriangle, TrendingUp, BarChart3, Phone, 
  Mail, Fingerprint, Map, Hash, Search
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cargofy-prod-v1';

// --- COMPONENTES DE UI ---

const Card = ({ title, value, icon: Icon, color, subValue }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between transition-all hover:shadow-md">
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-xl font-black text-slate-800 mt-1">{value}</h3>
      {subValue && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subValue}</p>}
    </div>
    <div className={`p-2.5 rounded-lg ${color} shadow-sm text-white`}>
      <Icon size={20} />
    </div>
  </div>
);

const InputField = ({ label, name, type = "text", options = [], defaultValue, required = false, maxLength, onChange, placeholder }) => {
  const baseClass = "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
      {type === 'select' ? (
        <select name={name} defaultValue={defaultValue} className={baseClass} required={required} onChange={onChange}>
          <option value="">Selecione...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} className={baseClass} required={required} maxLength={maxLength} onChange={onChange} />
      )}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto bg-white">{children}</div>
      </div>
    </div>
  );
};

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [viagens, setViagens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);

  const [modalState, setModalState] = useState({ open: false, type: '', data: null });
  const [selectedPayment, setSelectedPayment] = useState('');

  // Autenticação (Regra 3: Auth antes de Queries)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Erro na autenticação:", err); 
      }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Sincronização Firestore (Regra 1: Caminhos estritos)
  useEffect(() => {
    if (!user) return;
    
    const getColRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

    const unsubV = onSnapshot(getColRef('viagens'), 
      (s) => setViagens(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Erro Viagens:", err)
    );
    
    const unsubC = onSnapshot(getColRef('clientes'), 
      (s) => setClientes(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Erro Clientes:", err)
    );
    
    const unsubM = onSnapshot(getColRef('motoristas'), 
      (s) => setMotoristas(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Erro Motoristas:", err)
    );
    
    const unsubVe = onSnapshot(getColRef('veiculos'), 
      (s) => setVeiculos(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Erro Veiculos:", err)
    );

    return () => { unsubV(); unsubC(); unsubM(); unsubVe(); };
  }, [user]);

  // Cálculos de Performance
  const stats = useMemo(() => {
    const hoje = new Date();
    const emRota = viagens.filter(v => v.status === 'Em rota').length;
    const entregues = viagens.filter(v => v.status === 'Entregue').length;
    const aguardando = viagens.filter(v => v.status === 'Aguardando').length;
    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFechado) || 0), 0);
    
    const boletos = viagens.filter(v => v.meioPagamento === 'Boleto Bancário');
    const boletosAtrasados = boletos.filter(v => v.status !== 'Entregue' && v.dataVencimento && new Date(v.dataVencimento) < hoje).length;
    const valorAtrasado = boletos
      .filter(v => v.status !== 'Entregue' && v.dataVencimento && new Date(v.dataVencimento) < hoje)
      .reduce((acc, curr) => acc + (Number(curr.valorFechado) || 0), 0);

    return { 
      emRota, entregues, aguardando, total: viagens.length,
      faturamento,
      boletosTotal: boletos.length,
      boletosAtrasados,
      valorAtrasado
    };
  }, [viagens]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target);
    const rawData = Object.fromEntries(formData.entries());
    
    try {
      const colPath = ['artifacts', appId, 'public', 'data', modalState.type];
      if (modalState.data?.id) {
        await updateDoc(doc(db, ...colPath, modalState.data.id), rawData);
      } else {
        await addDoc(collection(db, ...colPath), { ...rawData, createdAt: new Date().toISOString() });
      }
      setModalState({ open: false, type: '', data: null });
    } catch (err) { 
      console.error("Erro ao salvar:", err);
    }
  };

  const handleDelete = async (col, id) => {
    if (!user || !window.confirm("Deseja realmente excluir este registro?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="animate-pulse font-black italic text-3xl mb-4 tracking-tighter">CargoFy</div>
      <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sincronizando...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Truck size={20} /></div>
          <h1 className="text-xl font-black tracking-tighter italic">CargoFy</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Fretes" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <div className="pt-4 pb-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Financeiro</div>
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="pt-4 pb-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cadastros</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Truck} label="Veículos" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{activeTab}</h2>
          <button onClick={() => { setSelectedPayment(''); setModalState({ open: true, type: 'viagens', data: null }); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
            <Plus size={16} /> Novo Lançamento
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card title="Entregues" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" />
                <Card title="Em Trânsito" value={stats.emRota} icon={MapPin} color="bg-blue-500" />
                <Card title="Atrasados" value={stats.boletosAtrasados} icon={AlertTriangle} color="bg-red-500" />
                <Card title="Faturamento" value={`R$ ${stats.faturamento.toLocaleString('pt-BR')}`} icon={DollarSign} color="bg-slate-800" />
              </section>

              <TableLayout 
                title="Últimas Cargas" 
                data={viagens.slice(0, 5)} 
                col="viagens" 
                onEdit={(d) => { setSelectedPayment(d.meioPagamento || ''); setModalState({ open: true, type: 'viagens', data: d }); }} 
                onDelete={handleDelete} 
              />
            </div>
          )}

          {activeTab === 'viagens' && <TableLayout title="Gestão de Fretes" data={viagens} col="viagens" onEdit={(d) => { setSelectedPayment(d.meioPagamento || ''); setModalState({ open: true, type: 'viagens', data: d }); }} onDelete={handleDelete} />}
          
          {activeTab === 'clientes' && <TableLayout title="Clientes" data={clientes} col="clientes" onEdit={(d) => setModalState({ open: true, type: 'clientes', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'clientes', data: null })} />}
          
          {activeTab === 'motoristas' && <TableLayout title="Motoristas" data={motoristas} col="motoristas" onEdit={(d) => setModalState({ open: true, type: 'motoristas', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'motoristas', data: null })} />}
          
          {activeTab === 'veiculos' && <TableLayout title="Veículos" data={veiculos} col="veiculos" onEdit={(d) => setModalState({ open: true, type: 'veiculos', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'veiculos', data: null })} />}
          
          {activeTab === 'financeiro' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Faturamento Bruto" value={`R$ ${stats.faturamento.toLocaleString('pt-BR')}`} icon={TrendingUp} color="bg-blue-600" />
                <Card title="Inadimplência" value={`R$ ${stats.valorAtrasado.toLocaleString('pt-BR')}`} icon={AlertTriangle} color="bg-red-600" />
                <Card title="Ticket Médio" value={`R$ ${stats.total > 0 ? (stats.faturamento / stats.total).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : 0}`} icon={BarChart3} color="bg-indigo-600" />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modais de Cadastro */}
      <Modal 
        isOpen={modalState.open} 
        onClose={() => setModalState({ open: false, type: '', data: null })} 
        title={`Registo: ${modalState.type}`}
      >
        <form onSubmit={handleSave} className="space-y-6">
          {modalState.type === 'viagens' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="NF" name="notaFiscal" defaultValue={modalState.data?.notaFiscal} required />
              <InputField label="Status" name="status" type="select" options={['Aguardando', 'Em rota', 'Entregue']} defaultValue={modalState.data?.status} />
              <InputField label="Cliente" name="contratante" type="select" options={clientes.map(c => c.razaoSocial || c.nome)} defaultValue={modalState.data?.contratante} required />
              <InputField label="Cidade" name="cidade" defaultValue={modalState.data?.cidade} required />
              <InputField label="Valor" name="valorFechado" type="number" defaultValue={modalState.data?.valorFechado} required />
              <InputField label="Pagamento" name="meioPagamento" type="select" options={['PIX', 'Boleto Bancário', 'Dinheiro']} defaultValue={modalState.data?.meioPagamento} onChange={(e) => setSelectedPayment(e.target.value)} />
              {(selectedPayment === 'Boleto Bancário' || modalState.data?.meioPagamento === 'Boleto Bancário') && (
                <InputField label="Vencimento" name="dataVencimento" type="date" defaultValue={modalState.data?.dataVencimento} />
              )}
            </div>
          )}

          {modalState.type === 'clientes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Razão Social" name="razaoSocial" defaultValue={modalState.data?.razaoSocial} required />
              <InputField label="CNPJ" name="documento" defaultValue={modalState.data?.documento} required />
              <InputField label="Cidade" name="cidade" defaultValue={modalState.data?.cidade} />
              <InputField label="Telefone" name="telefone" defaultValue={modalState.data?.telefone} />
            </div>
          )}

          {modalState.type === 'motoristas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Nome" name="nome" defaultValue={modalState.data?.nome} required />
              <InputField label="CPF" name="cpf" defaultValue={modalState.data?.cpf} required />
              <InputField label="CNH" name="cnh" defaultValue={modalState.data?.cnh} />
              <InputField label="Fone" name="telefone" defaultValue={modalState.data?.telefone} />
            </div>
          )}

          {modalState.type === 'veiculos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Placa" name="placa" defaultValue={modalState.data?.placa} required />
              <InputField label="Tipo" name="tipo" type="select" options={['Truck', 'Carreta', 'VUC']} defaultValue={modalState.data?.tipo} />
              <InputField label="Modelo" name="modelo" defaultValue={modalState.data?.modelo} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button type="button" onClick={() => setModalState({ open: false, type: '', data: null })} className="px-4 py-2 font-bold text-slate-400">Cancelar</button>
            <button type="submit" className="bg-slate-900 text-white px-8 py-2 rounded-lg font-bold">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={16} /> <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

function TableLayout({ title, data, col, onEdit, onDelete, onAdd }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50/50">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
        {onAdd && <button onClick={onAdd} className="bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-md font-bold">+ Adicionar</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b">
            <tr>
              <th className="px-6 py-3 text-left">Nome/Identificação</th>
              <th className="px-6 py-3 text-left">Documento/Detalhes</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr><td colSpan="3" className="px-6 py-10 text-center text-slate-300">Nenhum registo.</td></tr>
            ) : data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 group">
                <td className="px-6 py-4 font-bold uppercase">{item.nome || item.razaoSocial || item.placa || item.notaFiscal}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{item.documento || item.cpf || item.tipo || item.contratante}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => onEdit(item)} className="p-1.5 hover:text-blue-600"><ChevronRight size={16} /></button>
                    <button onClick={() => onDelete(col, item.id)} className="p-1.5 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
