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
  query,
  where
} from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, FileText, Search, Layers, 
  CheckCircle2, AlertCircle, Edit3, Camera, 
  CreditCard, Scale, Box, User as UserIcon, ChevronRight, Calendar, Hash, Filter, Download,
  Clock // Adicionado Clock que estava faltando
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = { 
  apiKey: "AIzaSyDncBYgIrudOBBwjsNFe9TS7Zr0b2nJLRo", 
  authDomain: "cargofy-b4435.firebaseapp.com", 
  projectId: "cargofy-b4435", 
  storageBucket: "cargofy-b4435.firebasestorage.app", 
  messagingSenderId: "827918943476", 
  appId: "1:827918943476:web:a1a33a1e6dd84e4e8c8aa1"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cargofy-pro-v2';

// --- UI COMPONENTS ---

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    {Icon && <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const Input = ({ label, type = "text", value, onChange, placeholder = "", maxLength }) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">{label}</label>
    <input 
      type={type} 
      placeholder={placeholder} 
      value={value || ''} 
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)} 
      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-xs font-bold transition-all placeholder:opacity-30" 
    />
  </div>
);

const StatCard = ({ title, count, icon: Icon, color, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 p-6 rounded-[2rem] border transition-all text-left ${active ? 'bg-white border-blue-500 shadow-xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}
  >
    <div className={`p-3 rounded-2xl w-fit mb-4 ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
    <p className="text-3xl font-black text-slate-900 mt-1">{count}</p>
  </button>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
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
  const [loading, setLoading] = useState(true);
  const [dashboardFilter, setDashboardFilter] = useState('Todos');
  
  // Estados de Dados
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  
  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Viagens Avançado
    numeroNF: '', chaveNF: '', cte: '', 
    contratante: '', destinatario: '', 
    volume: '', peso: '', valorNF: '',
    motorista: '', veiculo: '', placa: '',
    dataSaida: '', dataEntrega: '', status: 'Pendente',
    comprovanteUrl: '',
    // Financeiro
    metodoPagamento: 'Pix', dataVencimentoBoleto: '', valorFinanceiro: '',
    // Cadastros
    nome: '', cnpjCpf: '', email: '', telefone: '', endereco: '',
    modelo: '', marca: '', ano: '', tipoVeiculo: 'Truck'
  });

  // Auth Fix
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (e) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erro Auth:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Listeners Firestore
  useEffect(() => {
    if (!user) return;
    const collections = ['viagens', 'financeiro', 'clientes', 'motoristas', 'veiculos'];
    const unsubscribes = collections.map(colName => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', colName));
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (colName === 'viagens') setViagens(data);
        if (colName === 'financeiro') setFinanceiro(data);
        if (colName === 'clientes') setClientes(data);
        if (colName === 'motoristas') setMotoristas(data);
        if (colName === 'veiculos') setVeiculos(data);
      }, (err) => console.error(err));
    });
    return () => unsubscribes.forEach(u => u());
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    const colName = (activeTab === 'dashboard' || activeTab === 'viagens') ? 'viagens' : activeTab;
    
    try {
      const data = { ...formData, userId: user.uid, updatedAt: serverTimestamp() };
      let currentId = editingId;

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), data);
      } else {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), { ...data, createdAt: serverTimestamp() });
        currentId = docRef.id;

        // Lógica Financeira Automática para Viagens
        if (colName === 'viagens') {
          const finData = {
            descricao: `Frete NF ${formData.numeroNF} - ${formData.contratante}`,
            valor: formData.valorNF || 0,
            tipo: 'Receita',
            categoria: 'Frete',
            metodo: formData.metodoPagamento,
            dataVencimento: formData.metodoPagamento === 'Boleto' ? formData.dataVencimentoBoleto : new Date().toISOString().split('T')[0],
            pago: formData.metodoPagamento !== 'Boleto',
            viagemId: currentId,
            userId: user.uid,
            createdAt: serverTimestamp()
          };
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financeiro'), finData);
        }
      }
      
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({
      numeroNF: '', chaveNF: '', cte: '', contratante: '', destinatario: '', volume: '', peso: '', valorNF: '', motorista: '', veiculo: '', placa: '', dataSaida: '', dataEntrega: '', status: 'Pendente', comprovanteUrl: '',
      metodoPagamento: 'Pix', dataVencimentoBoleto: '', valorFinanceiro: '',
      nome: '', cnpjCpf: '', email: '', telefone: '', endereco: '',
      modelo: '', marca: '', ano: '', tipoVeiculo: 'Truck'
    });
  };

  const filteredData = useMemo(() => {
    let list = [];
    if (activeTab === 'dashboard' || activeTab === 'viagens') {
      list = viagens;
      if (dashboardFilter !== 'Todos') {
        list = list.filter(v => v.status === dashboardFilter);
      }
    } else {
      list = activeTab === 'financeiro' ? financeiro : 
             activeTab === 'clientes' ? clientes : 
             activeTab === 'motoristas' ? motoristas : veiculos;
    }
    
    if (!search) return list;
    const s = search.toLowerCase();
    return list.filter(item => 
      Object.values(item).some(val => typeof val === 'string' && val.toLowerCase().includes(s))
    );
  }, [activeTab, search, dashboardFilter, viagens, financeiro, clientes, motoristas, veiculos]);

  const stats = useMemo(() => ({
    pendente: viagens.filter(v => v.status === 'Pendente').length,
    emRota: viagens.filter(v => v.status === 'Em rota').length,
    concluida: viagens.filter(v => v.status === 'Entregue').length,
    total: viagens.length
  }), [viagens]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0f172a] text-white font-black italic tracking-widest animate-pulse">CARGOFY...</div>;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col p-6 shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Truck className="text-blue-500" size={28} />
          <h1 className="text-xl font-black italic">CARGOFY</h1>
        </div>
        <nav className="flex-1 space-y-1">
          <NavItem icon={LayoutDashboard} label="Painel Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Viagens / Cargas" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="py-4 opacity-20 text-[10px] font-black uppercase tracking-widest px-4">Cadastros</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Layers} label="Frota" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>

        <button 
          onClick={() => setReportModalOpen(true)}
          className="mt-4 flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/5 text-blue-400 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Download size={18} /> Gerar Relatórios
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Pesquisar em ${activeTab}...`} 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-blue-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Adicionar {activeTab === 'dashboard' ? 'Viagem' : activeTab.slice(0, -1)}
            </button>
          </div>
        </header>

        <div className="p-8 overflow-y-auto space-y-8">
          {/* Dashboard Stats */}
          {activeTab === 'dashboard' && (
            <div className="flex gap-6">
              <StatCard title="Todas as Cargas" count={stats.total} icon={Layers} color="bg-slate-800" active={dashboardFilter === 'Todos'} onClick={() => setDashboardFilter('Todos')} />
              <StatCard title="Pendentes" count={stats.pendente} icon={Clock} color="bg-amber-500" active={dashboardFilter === 'Pendente'} onClick={() => setDashboardFilter('Pendente')} />
              <StatCard title="Em Rota" count={stats.emRota} icon={Truck} color="bg-blue-500" active={dashboardFilter === 'Em rota'} onClick={() => setDashboardFilter('Em rota')} />
              <StatCard title="Concluídas" count={stats.concluida} icon={CheckCircle2} color="bg-emerald-500" active={dashboardFilter === 'Entregue'} onClick={() => setDashboardFilter('Entregue')} />
            </div>
          )}

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {activeTab === 'dashboard' ? `Cargas: ${dashboardFilter}` : `Listagem de ${activeTab}`}
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratante / Rota</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logística</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${item.status === 'Entregue' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {activeTab === 'viagens' || activeTab === 'dashboard' ? <Package size={18}/> : <UserIcon size={18}/>}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-800">{item.numeroNF || item.nome || item.descricao || item.modelo || item.placa}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{item.chaveNF || item.cnpjCpf || item.tipo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-tight">{item.contratante || item.email || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {item.cidadeOrigem && item.cidadeDestino ? `${item.cidadeOrigem} → ${item.cidadeDestino}` : (item.telefone || '-')}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      {item.volume ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md w-fit">{item.volume} VOL | {item.peso} KG</span>
                          <span className="text-[10px] font-bold text-slate-400">R$ {Number(item.valorNF).toLocaleString('pt-BR')}</span>
                        </div>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase w-fit ${item.status === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : item.status === 'Em rota' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                          {item.status || 'Ativo'}
                        </span>
                        {item.dataEntrega && <span className="text-[9px] font-bold text-slate-400 italic">Entregue em: {item.dataEntrega}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormData(item); setEditingId(item.id); setModalOpen(true); }} className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"><Edit3 size={14}/></button>
                        <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', (activeTab === 'dashboard' ? 'viagens' : activeTab), item.id))} className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Viagens / Cadastro */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Gestão de ${activeTab}`}>
        <form onSubmit={handleSave} className="space-y-10">
          {(activeTab === 'viagens' || activeTab === 'dashboard') && (
            <div className="space-y-8">
              <section>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <FileText size={14} /> Dados Fiscais da Carga
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Número da NF" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                  <div className="col-span-2">
                    <Input label="Chave de Acesso NF (44 dígitos)" maxLength={44} value={formData.chaveNF} onChange={v => setFormData({...formData, chaveNF: v})} />
                  </div>
                  <Input label="CT-e" value={formData.cte} onChange={v => setFormData({...formData, cte: v})} />
                  <Input label="Valor da Nota (R$)" type="number" value={formData.valorNF} onChange={v => setFormData({...formData, valorNF: v})} />
                  <div className="flex gap-4">
                    <Input label="Volume" type="number" value={formData.volume} onChange={v => setFormData({...formData, volume: v})} />
                    <Input label="Peso (KG)" type="number" value={formData.peso} onChange={v => setFormData({...formData, peso: v})} />
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <MapPin size={14} /> Rota e Envolvidos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Empresa Contratante" value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
                  <Input label="Empresa Destinatária" value={formData.destinatario} onChange={v => setFormData({...formData, destinatario: v})} />
                  <Input label="Cidade Origem" value={formData.cidadeOrigem} onChange={v => setFormData({...formData, cidadeOrigem: v})} />
                  <Input label="Cidade Destino" value={formData.cidadeDestino} onChange={v => setFormData({...formData, cidadeDestino: v})} />
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Truck size={14} /> Operação e Logística
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input label="Motorista" value={formData.motorista} onChange={v => setFormData({...formData, motorista: v})} />
                  <Input label="Veículo" value={formData.veiculo} onChange={v => setFormData({...formData, veiculo: v})} />
                  <Input label="Placa" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
                  <Input label="Data de Saída" type="date" value={formData.dataSaida} onChange={v => setFormData({...formData, dataSaida: v})} />
                </div>
              </section>

              <section className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4">Finalização e Pagamento</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Meio de Pagamento</label>
                    <select className="w-full p-4 bg-white rounded-xl mt-1 text-xs font-bold border" value={formData.metodoPagamento} onChange={e => setFormData({...formData, metodoPagamento: e.target.value})}>
                      <option value="Pix">Pix (À vista)</option>
                      <option value="Boleto">Boleto (A prazo)</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Transferência">Transferência</option>
                    </select>
                  </div>
                  {formData.metodoPagamento === 'Boleto' && (
                    <Input label="Vencimento do Boleto" type="date" value={formData.dataVencimentoBoleto} onChange={v => setFormData({...formData, dataVencimentoBoleto: v})} />
                  )}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status Atual</label>
                    <select className="w-full p-4 bg-white rounded-xl mt-1 text-xs font-bold border" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Pendente">Pendente</option>
                      <option value="Em rota">Em rota</option>
                      <option value="Entregue">Entregue / Concluído</option>
                    </select>
                  </div>
                </div>
                
                {formData.status === 'Entregue' && (
                  <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <Input label="Data da Entrega" type="date" value={formData.dataEntrega} onChange={v => setFormData({...formData, dataEntrega: v})} />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Comprovante de Entrega (Foto)</label>
                      <button type="button" className="w-full flex items-center justify-center gap-2 p-3.5 bg-white border-2 border-dashed border-blue-200 rounded-xl text-blue-500 text-[10px] font-black uppercase hover:bg-blue-50 transition-all">
                        <Camera size={16} /> Tirar ou Anexar Foto
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Descrição" value={formData.descricao} onChange={v => setFormData({...formData, descricao: v})} />
              <Input label="Valor (R$)" type="number" value={formData.valorFinanceiro} onChange={v => setFormData({...formData, valorFinanceiro: v})} />
              <Input label="Vencimento" type="date" value={formData.dataVencimento} onChange={v => setFormData({...formData, dataVencimento: v})} />
              <Input label="Categoria" value={formData.categoria} onChange={v => setFormData({...formData, categoria: v})} />
            </div>
          )}

          {(activeTab === 'clientes' || activeTab === 'motoristas' || activeTab === 'veiculos') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTab === 'veiculos' ? (
                <>
                  <Input label="Placa" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
                  <Input label="Modelo" value={formData.modelo} onChange={v => setFormData({...formData, modelo: v})} />
                </>
              ) : (
                <>
                  <Input label="Nome" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
                  <Input label="CNPJ/CPF" value={formData.cnpjCpf} onChange={v => setFormData({...formData, cnpjCpf: v})} />
                </>
              )}
              <Input label="Telefone/Contato" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
            </div>
          )}

          <div className="pt-8 border-t flex gap-4">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-all">Confirmar e Salvar</button>
          </div>
        </form>
      </Modal>

      {/* Modal de Relatórios */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Gerador de Relatórios Logísticos">
        <div className="space-y-6">
          <p className="text-xs text-slate-500 font-medium">Filtre as viagens para exportação de dados e conferência de faturamento.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Pesquisar NF" placeholder="0001" onChange={setSearch} />
            <Input label="Por Contratante" placeholder="Nome da empresa" onChange={setSearch} />
            <Input label="Data Inicial" type="date" />
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h5 className="text-[10px] font-black uppercase text-slate-400 mb-4">Resultados Encontrados: {filteredData.length}</h5>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredData.slice(0, 10).map(v => (
                <div key={v.id} className="flex justify-between items-center p-3 bg-white rounded-xl text-[10px] font-bold">
                  <span>NF: {v.numeroNF} | {v.contratante}</span>
                  <span className="text-blue-600">R$ {v.valorNF}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full py-4 bg-[#0f172a] text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
            <Download size={16} /> Baixar Relatório (PDF/Excel)
          </button>
        </div>
      </Modal>
    </div>
  );
}
