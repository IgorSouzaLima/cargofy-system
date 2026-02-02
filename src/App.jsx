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
  CheckCircle2, AlertCircle, Edit3, Camera, Link as LinkIcon,
  CreditCard, Scale, Box, User as UserIcon, ChevronRight, Calendar, Hash, Filter, Download,
  Clock, Printer
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

const Input = ({ label, type = "text", value, onChange, placeholder = "", maxLength, suffix }) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">{label}</label>
    <div className="relative">
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value || ''} 
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)} 
        className="w-full px-5 py-3.5 bg-slate-50 rounded-xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-xs font-bold transition-all placeholder:opacity-30" 
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">{suffix}</span>}
    </div>
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
  
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    numeroNF: '', chaveNF: '', cte: '', 
    contratante: '', destinatario: '', 
    volume: '', peso: '', valorNF: '',
    valorFrete: '', valorPago: '',
    motorista: '', veiculo: '', placa: '',
    dataSaida: '', dataEntrega: '', status: 'Pendente',
    comprovanteUrl: '',
    metodoPagamento: 'Pix', dataVencimentoBoleto: '', valorFinanceiro: '',
    nome: '', cnpjCpf: '', email: '', telefone: '', endereco: '',
    modelo: '', marca: '', ano: '', tipoVeiculo: 'Truck'
  });

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

        if (colName === 'viagens') {
          const finData = {
            descricao: `Frete NF ${formData.numeroNF} - ${formData.contratante}`,
            valor: Number(formData.valorFrete) || 0,
            valorPago: Number(formData.valorPago) || 0,
            tipo: 'Receita',
            categoria: 'Frete',
            metodo: formData.metodoPagamento,
            dataVencimento: formData.metodoPagamento === 'Boleto' ? formData.dataVencimentoBoleto : new Date().toISOString().split('T')[0],
            pago: Number(formData.valorPago) >= Number(formData.valorFrete),
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
      numeroNF: '', chaveNF: '', cte: '', contratante: '', destinatario: '', volume: '', peso: '', valorNF: '', 
      valorFrete: '', valorPago: '', motorista: '', veiculo: '', placa: '', dataSaida: '', dataEntrega: '', 
      status: 'Pendente', comprovanteUrl: '', metodoPagamento: 'Pix', dataVencimentoBoleto: '', valorFinanceiro: '',
      nome: '', cnpjCpf: '', email: '', telefone: '', endereco: '', modelo: '', marca: '', ano: '', tipoVeiculo: 'Truck'
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
      Object.values(item).some(val => val && val.toString().toLowerCase().includes(s))
    );
  }, [activeTab, search, dashboardFilter, viagens, financeiro, clientes, motoristas, veiculos]);

  const stats = useMemo(() => ({
    pendente: viagens.filter(v => v.status === 'Pendente').length,
    emRota: viagens.filter(v => v.status === 'Em rota').length,
    concluida: viagens.filter(v => v.status === 'Entregue').length,
    total: viagens.length,
    financeiroTotal: viagens.reduce((acc, v) => acc + (Number(v.valorFrete) || 0), 0),
    financeiroRecebido: viagens.reduce((acc, v) => acc + (Number(v.valorPago) || 0), 0)
  }), [viagens]);

  const handlePrintReport = () => {
    window.print();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#0f172a] text-white font-black italic tracking-widest animate-pulse">CARGOFY...</div>;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans print:bg-white">
      {/* Sidebar - Oculta na impressão */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col p-6 shrink-0 print:hidden">
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
        <button onClick={() => setReportModalOpen(true)} className="mt-4 flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/5 text-blue-400 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest">
          <Download size={18} /> Gerar Relatórios
        </button>
      </aside>

      <main className="flex-1 flex flex-col print:p-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 print:hidden">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Pesquisar...`} 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-blue-200"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2">
            <Plus size={16} /> Adicionar {activeTab === 'dashboard' ? 'Viagem' : activeTab.slice(0, -1)}
          </button>
        </header>

        <div className="p-8 overflow-y-auto space-y-8 print:p-0">
          {activeTab === 'dashboard' && (
            <div className="flex gap-6 print:hidden">
              <StatCard title="Todas" count={stats.total} icon={Layers} color="bg-slate-800" active={dashboardFilter === 'Todos'} onClick={() => setDashboardFilter('Todos')} />
              <StatCard title="Pendentes" count={stats.pendente} icon={Clock} color="bg-amber-500" active={dashboardFilter === 'Pendente'} onClick={() => setDashboardFilter('Pendente')} />
              <StatCard title="Em Rota" count={stats.emRota} icon={Truck} color="bg-blue-500" active={dashboardFilter === 'Em rota'} onClick={() => setDashboardFilter('Em rota')} />
              <StatCard title="Entregues" count={stats.concluida} icon={CheckCircle2} color="bg-emerald-500" active={dashboardFilter === 'Entregue'} onClick={() => setDashboardFilter('Entregue')} />
            </div>
          )}

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden print:border-none print:shadow-none">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contratante / Rota</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${item.status === 'Entregue' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} print:hidden`}>
                          {activeTab === 'viagens' || activeTab === 'dashboard' ? <Package size={18}/> : <UserIcon size={18}/>}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-800">{item.numeroNF || item.nome || item.descricao || item.placa}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{item.chaveNF || item.cnpjCpf || item.tipo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-tight">{item.contratante || item.email || '-'}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.cidadeOrigem ? `${item.cidadeOrigem} → ${item.cidadeDestino}` : (item.telefone || '-')}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">Frete: R$ {Number(item.valorFrete || 0).toLocaleString()}</span>
                        <span className={`text-[10px] font-bold ${Number(item.valorPago) >= Number(item.valorFrete) ? 'text-emerald-500' : 'text-amber-500'}`}>
                          Pago: R$ {Number(item.valorPago || 0).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${item.status === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {item.status || 'Ativo'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right print:hidden">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.comprovanteUrl && <a href={item.comprovanteUrl} target="_blank" className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600"><LinkIcon size={14}/></a>}
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

      {/* MODAL DE RELATÓRIO (O MOTOR DE RELATÓRIOS) */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Relatório Logístico & Financeiro">
        <div className="space-y-8 print:block">
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase italic">CARGOFY REPORT</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">Gerado em: {new Date().toLocaleDateString()} às {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo Operacional</p>
              <p className="text-lg font-black text-blue-600">{viagens.length} Viagens Registadas</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total de Fretes</p>
              <p className="text-2xl font-black text-slate-900">R$ {stats.financeiroTotal.toLocaleString()}</p>
            </div>
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Total Recebido</p>
              <p className="text-2xl font-black text-emerald-700">R$ {stats.financeiroRecebido.toLocaleString()}</p>
            </div>
            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center">
              <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Pendente</p>
              <p className="text-2xl font-black text-amber-700">R$ {(stats.financeiroTotal - stats.financeiroRecebido).toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} /> Detalhamento de Viagens
            </h4>
            <div className="border rounded-2xl overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-black uppercase">NF</th>
                    <th className="px-4 py-3 text-left font-black uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left font-black uppercase">Data</th>
                    <th className="px-4 py-3 text-right font-black uppercase">Frete</th>
                    <th className="px-4 py-3 text-right font-black uppercase">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {viagens.map(v => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-bold">{v.numeroNF}</td>
                      <td className="px-4 py-3">{v.contratante}</td>
                      <td className="px-4 py-3 font-medium text-slate-400">{v.dataSaida || '---'}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">R$ {Number(v.valorFrete || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">R$ {Number(v.valorPago || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4 print:hidden">
            <button onClick={() => setReportModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Fechar</button>
            <button onClick={handlePrintReport} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl flex items-center justify-center gap-2">
              <Printer size={16} /> Imprimir Relatório / Salvar PDF
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Lançamento: ${activeTab}`}>
        <form onSubmit={handleSave} className="space-y-8">
          {(activeTab === 'viagens' || activeTab === 'dashboard') && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Número da NF" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                <div className="col-span-2">
                  <Input label="Chave de Acesso (44 dígitos)" maxLength={44} value={formData.chaveNF} onChange={v => setFormData({...formData, chaveNF: v})} />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                <Input label="Valor do Frete Combinado" type="number" suffix="R$" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
                <Input label="Valor Já Pago" type="number" suffix="R$" value={formData.valorPago} onChange={v => setFormData({...formData, valorPago: v})} />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Contratante" value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
                <Input label="Destinatário" value={formData.destinatario} onChange={v => setFormData({...formData, destinatario: v})} />
                <Input label="Cidade Origem" value={formData.cidadeOrigem} onChange={v => setFormData({...formData, cidadeOrigem: v})} />
                <Input label="Cidade Destino" value={formData.cidadeDestino} onChange={v => setFormData({...formData, cidadeDestino: v})} />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Motorista" value={formData.motorista} onChange={v => setFormData({...formData, motorista: v})} />
                <Input label="Placa" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status</label>
                  <select className="w-full p-4 bg-slate-50 rounded-xl text-xs font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Pendente">Pendente</option>
                    <option value="Em rota">Em rota</option>
                    <option value="Entregue">Entregue</option>
                  </select>
                </div>
              </section>

              {formData.status === 'Entregue' && (
                <section className="p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100 space-y-4">
                  <Input label="Data da Entrega" type="date" value={formData.dataEntrega} onChange={v => setFormData({...formData, dataEntrega: v})} />
                  <Input 
                    label="Link do Comprovante (Nuvem/Drive/WhatsApp)" 
                    placeholder="https://link-da-sua-foto.com/comprovante.jpg" 
                    value={formData.comprovanteUrl} 
                    onChange={v => setFormData({...formData, comprovanteUrl: v})} 
                  />
                  <p className="text-[9px] text-emerald-600 font-bold italic">* Cole aqui o link da imagem salva no Google Drive, Dropbox ou servidor de imagens.</p>
                </section>
              )}
            </>
          )}
          
          {activeTab !== 'viagens' && activeTab !== 'dashboard' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome/Descrição" value={formData.nome || formData.descricao || formData.placa} onChange={v => setFormData({...formData, nome: v, descricao: v})} />
                <Input label="Contato/Info" value={formData.telefone || formData.modelo} onChange={v => setFormData({...formData, telefone: v, modelo: v})} />
             </div>
          )}

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl">Salvar Lançamento</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
