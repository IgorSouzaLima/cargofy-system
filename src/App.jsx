import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously,
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
  serverTimestamp, 
  query 
} from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, FileText, Search, Layers, 
  CheckCircle2, AlertCircle, Edit3, Paperclip, 
  CreditCard, Scale, Box, User as UserIcon, ChevronRight
} from 'lucide-react';

// --- INICIALIZAÇÃO FIREBASE (Regra 3) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cargofy-pro-v1';

// --- COMPONENTES DE UI ---

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
    <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} /> 
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const Card = ({ title, value, icon: Icon, color, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left bg-white p-6 rounded-2xl shadow-sm border transition-all duration-200 ${active ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-100 hover:border-blue-200'}`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
        <Icon size={20} />
      </div>
    </div>
  </button>
);

const Input = ({ label, type = "text", value, onChange, placeholder = "" }) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">{label}</label>
    <input 
      type={type} 
      placeholder={placeholder} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-xs font-bold transition-all placeholder:text-slate-300" 
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  
  // Dados
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchNF, setSearchNF] = useState('');

  const [formData, setFormData] = useState({
    numeroNF: '', dataNF: '', dataSaida: '', dataEntrega: '', 
    contratante: '', destinatario: '', cidade: '', 
    volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
    valorFrete: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', 
    meioPagamento: 'Pix', dataVencimento: '',
    nome: '', email: '', telefone: '', modelo: '', tipo: ''
  });

  // Auth (Regra 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners (Regra 1 e 2)
  useEffect(() => {
    if (!user) return;

    const collections = ['viagens', 'financeiro', 'clientes', 'motoristas', 'veiculos'];
    const unsubscribes = collections.map(colName => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', colName));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (colName === 'viagens') setViagens(data);
        if (colName === 'financeiro') setFinanceiro(data);
        if (colName === 'clientes') setClientes(data);
        if (colName === 'motoristas') setMotoristas(data);
        if (colName === 'veiculos') setVeiculos(data);
      }, (err) => console.error(err));
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const stats = useMemo(() => {
    const entregues = viagens.filter(v => v.status === 'Entregue').length;
    const emRota = viagens.filter(v => v.status === 'Em rota').length;
    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFrete) || 0), 0);
    return { total: viagens.length, emRota, entregues, faturamento };
  }, [viagens]);

  const filteredData = useMemo(() => {
    let list = [];
    if (activeTab === 'dashboard' || activeTab === 'viagens') {
      list = statusFilter === 'Todos' ? viagens : viagens.filter(v => v.status === statusFilter);
    } else if (activeTab === 'financeiro') list = financeiro;
    else if (activeTab === 'clientes') list = clientes;
    else if (activeTab === 'motoristas') list = motoristas;
    else if (activeTab === 'veiculos') list = veiculos;

    if (!searchNF) return list;
    const s = searchNF.toLowerCase();
    return list.filter(item => 
      (item.numeroNF?.toLowerCase().includes(s)) || 
      (item.contratante?.toLowerCase().includes(s)) ||
      (item.nome?.toLowerCase().includes(s)) ||
      (item.placa?.toLowerCase().includes(s))
    );
  }, [activeTab, statusFilter, viagens, financeiro, clientes, motoristas, veiculos, searchNF]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    const colName = (activeTab === 'dashboard' || activeTab === 'viagens') ? 'viagens' : activeTab;
    
    try {
      const payload = { ...formData, updatedAt: serverTimestamp(), userId: user.uid };
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), { ...payload, createdAt: serverTimestamp() });
      }
      setModalOpen(false);
      setEditingId(null);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-white">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Iniciando CargoFy...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Truck className="text-blue-500" size={28} />
          <h1 className="text-xl font-black italic tracking-tighter">CARGOFY</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Viagens" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="py-4 opacity-20 text-[10px] font-black uppercase tracking-widest">Registos</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Layers} label="Frota" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none"
              value={searchNF}
              onChange={e => setSearchNF(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingId(null); setModalOpen(true); }}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/20"
          >
            Novo Registo
          </button>
        </header>

        <div className="p-8 overflow-y-auto space-y-8">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-4 gap-6">
              <Card title="Total Cargas" value={stats.total} icon={Package} color="bg-blue-600" />
              <Card title="Em Rota" value={stats.emRota} icon={Truck} color="bg-amber-500" />
              <Card title="Concluídas" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" />
              <Card title="Faturamento" value={`R$ ${stats.faturamento.toLocaleString()}`} icon={DollarSign} color="bg-slate-900" />
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-slate-800">{item.numeroNF || item.nome || item.modelo}</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase">{item.contratante || item.placa || item.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-600">{item.cidade || item.tipo || "---"}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{item.motorista || item.telefone || "Não Atribuído"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${item.status === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {item.status || "Ativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormData(item); setEditingId(item.id); setModalOpen(true); }} className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"><Edit3 size={14}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', (activeTab === 'dashboard' ? 'viagens' : activeTab), item.id))} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Gerir Registo">
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-6">
          {(activeTab === 'viagens' || activeTab === 'dashboard') && (
            <>
              <Input label="Número NF" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
              <Input label="Chave de Acesso" value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
              <Input label="Contratante" value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
              <Input label="Cidade Destino" value={formData.cidade} onChange={v => setFormData({...formData, cidade: v})} />
              <Input label="Valor Frete (R$)" type="number" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">Status</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Pendente">Pendente</option>
                  <option value="Em rota">Em rota</option>
                  <option value="Entregue">Entregue</option>
                </select>
              </div>
            </>
          )}
          {activeTab === 'clientes' && (
            <>
              <Input label="Nome/Razão Social" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="CNPJ/CPF" value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
              <Input label="Email" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
              <Input label="Telefone" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
            </>
          )}
          <div className="col-span-2 pt-6">
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-transform">Guardar Alterações</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
