
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
  setDoc, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  DollarSign, 
  Search, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Clock,
  Package,
  MapPin,
  X,
  Download,
  Trash2,
  Briefcase
} from 'lucide-react';

// --- CONFIGURAÇÃO REAL DO FIREBASE ---
const firebaseConfig = { 
  apiKey: "AIzaSyDncBYgIrudOBBwjsNFe9TS7Zr0b2nJLRo", 
  authDomain: "cargofy-b4435.firebaseapp.com", 
  projectId: "cargofy-b4435", 
  storageBucket: "cargofy-b4435.firebasestorage.app", 
  messagingSenderId: "827918943476", 
  appId: "1:827918943476:web:a1a33a1e6dd84e4e8c8aa1", 
  measurementId: "G-RPBGSK3YGV" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cargofy-b4435-prod';

// --- COMPONENTES AUXILIARES ---

const Card = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- APLICAÇÃO ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viagens, setViagens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);

  const [modalState, setModalState] = useState({ open: false, type: '', data: null });

  // Autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) { console.error("Erro Auth:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sincronização Firestore
  useEffect(() => {
    if (!user) return;
    const getPath = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

    const unsubV = onSnapshot(getPath('viagens'), (s) => setViagens(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubC = onSnapshot(getPath('clientes'), (s) => setClientes(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubM = onSnapshot(getPath('motoristas'), (s) => setMotoristas(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubVe = onSnapshot(getPath('veiculos'), (s) => setVeiculos(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubV(); unsubC(); unsubM(); unsubVe(); };
  }, [user]);

  const stats = useMemo(() => {
    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFechado) || 0), 0);
    const custos = viagens.reduce((acc, curr) => acc + (Number(curr.valorPago) || 0), 0);
    return {
      faturamento,
      lucro: faturamento - custos,
      emRota: viagens.filter(v => v.status === 'Em rota').length,
      aguardando: viagens.filter(v => v.status === 'Aguardando').length,
      total: viagens.length
    };
  }, [viagens]);

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const colName = modalState.type;

    try {
      if (modalState.data?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, modalState.data.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), { ...data, createdAt: new Date().toISOString() });
      }
      setModalState({ open: false, type: '', data: null });
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (col, id) => {
    if (!window.confirm("Confirmar exclusão?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-medium">A carregar CargoFy...</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <Truck className="text-blue-500" size={28} />
          <h1 className="text-xl font-bold tracking-tight">CargoFy</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Viagens" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase">Gestão</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Truck} label="Frota" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => setModalState({ open: true, type: 'viagens', data: null })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-100">
            <Plus size={18} /> Nova Viagem
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card title="Em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-500" />
                <Card title="Aguardando" value={stats.aguardando} icon={Clock} color="bg-amber-500" />
                <Card title="Total Mês" value={stats.total} icon={Package} color="bg-slate-700" />
                <Card title="Lucro Bruto" value={`R$ ${stats.lucro.toLocaleString()}`} icon={DollarSign} color="bg-emerald-500" />
              </div>
              <TableLayout title="Últimas Atividades" data={viagens.slice(0, 5)} col="viagens" onEdit={(d) => setModalState({ open: true, type: 'viagens', data: d })} onDelete={handleDelete} />
            </div>
          )}

          {activeTab === 'viagens' && <TableLayout title="Todas as Viagens" data={viagens} col="viagens" onEdit={(d) => setModalState({ open: true, type: 'viagens', data: d })} onDelete={handleDelete} />}
          {activeTab === 'clientes' && <TableLayout title="Clientes" data={clientes} col="clientes" onEdit={(d) => setModalState({ open: true, type: 'clientes', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'clientes', data: null })} />}
          {activeTab === 'motoristas' && <TableLayout title="Motoristas" data={motoristas} col="motoristas" onEdit={(d) => setModalState({ open: true, type: 'motoristas', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'motoristas', data: null })} />}
          {activeTab === 'veiculos' && <TableLayout title="Frota" data={veiculos} col="veiculos" onEdit={(d) => setModalState({ open: true, type: 'veiculos', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'veiculos', data: null })} />}
          
          {activeTab === 'financeiro' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center">
              <DollarSign className="mx-auto text-emerald-500 mb-4" size={48} />
              <h2 className="text-2xl font-bold mb-2">Resumo Financeiro</h2>
              <p className="text-slate-500 mb-6">Acompanhe a rentabilidade da sua frota em tempo real.</p>
              <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
                <div className="bg-slate-50 p-6 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 uppercase">Faturamento</span>
                  <p className="text-2xl font-black">R$ {stats.faturamento.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-xl">
                  <span className="text-xs font-bold text-emerald-600 uppercase">Lucro Líquido</span>
                  <p className="text-2xl font-black text-emerald-700">R$ {stats.lucro.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Genérico */}
      <Modal isOpen={modalState.open} onClose={() => setModalState({ open: false, type: '', data: null })} title={modalState.data ? `Editar` : `Cadastrar`}>
        <form onSubmit={handleSave} className="space-y-4">
          {modalState.type === 'viagens' && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="NF" name="notaFiscal" defaultValue={modalState.data?.notaFiscal} />
              <InputField label="Status" name="status" type="select" options={['Aguardando', 'Em rota', 'Entregue']} defaultValue={modalState.data?.status} />
              <InputField label="Contratante" name="contratante" type="select" options={clientes.map(c => c.razaoSocial || c.nome)} defaultValue={modalState.data?.contratante} />
              <InputField label="Motorista" name="motorista" type="select" options={motoristas.map(m => m.nome)} defaultValue={modalState.data?.motorista} />
              <InputField label="Frete (R$)" name="valorFechado" type="number" defaultValue={modalState.data?.valorFechado} />
              <InputField label="Custos (R$)" name="valorPago" type="number" defaultValue={modalState.data?.valorPago} />
            </div>
          )}
          {modalState.type === 'clientes' && (
            <div className="grid grid-cols-1 gap-4">
              <InputField label="Razão Social" name="razaoSocial" defaultValue={modalState.data?.razaoSocial} />
              <InputField label="CNPJ" name="cnpj" defaultValue={modalState.data?.cnpj} />
            </div>
          )}
          {modalState.type === 'motoristas' && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Nome" name="nome" defaultValue={modalState.data?.nome} />
              <InputField label="CPF" name="cpf" defaultValue={modalState.data?.cpf} />
            </div>
          )}
          {modalState.type === 'veiculos' && (
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Placa" name="placa" defaultValue={modalState.data?.placa} />
              <InputField label="Modelo" name="tipo" defaultValue={modalState.data?.tipo} />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setModalState({ open: false, type: '', data: null })} className="px-4 py-2 text-slate-500 font-bold">Cancelar</button>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      <Icon size={18} /> <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function TableLayout({ title, data, col, onEdit, onDelete, onAdd }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">{title}</h3>
        {onAdd && <button onClick={onAdd} className="text-blue-600 text-xs font-bold border border-blue-200 px-3 py-1 rounded-md hover:bg-blue-50">+ Adicionar</button>}
      </div>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest">
            <tr>
              <th className="px-6 py-3 text-left">Principal</th>
              <th className="px-6 py-3 text-left">Detalhes</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold">{item.notaFiscal || item.razaoSocial || item.nome || item.placa}</td>
                <td className="px-6 py-4 text-slate-500">{item.status || item.cnpj || item.cpf || item.tipo}</td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><ChevronRight size={16} /></button>
                  <button onClick={() => onDelete(col, item.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InputField({ label, name, type = "text", options = [], defaultValue }) {
  const css = "w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase">{label}</label>
      {type === 'select' ? (
        <select name={name} defaultValue={defaultValue} className={css}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} name={name} defaultValue={defaultValue} className={css} />
      )}
    </div>
  );
}
