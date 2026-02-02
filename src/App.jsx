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
  where,
  getDocs
} from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, FileText, Search, Layers, 
  CheckCircle2, AlertCircle, Edit3, Camera, Link as LinkIcon,
  CreditCard, Scale, Box, User as UserIcon, ChevronRight, Calendar, Hash, Filter, Download,
  Clock, Printer, Weight, Thermometer, Eye, EyeOff, Receipt, AlertTriangle, Building2
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
const appId = 'cargofy-pro-v2-boletos';

// --- COMPONENTES UI ---

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    {Icon && <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const Input = ({ label, type = "text", value, onChange, placeholder = "", maxLength, suffix }) => (
  <div className="space-y-1.5 w-full text-left">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">{label}</label>
    <div className="relative">
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value || ''} 
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)} 
        className="w-full px-5 py-3.5 bg-white rounded-xl outline-none border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-xs font-bold transition-all placeholder:text-slate-300 text-slate-700 shadow-sm" 
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{suffix}</span>}
    </div>
  </div>
);

const StatCard = ({ title, count, icon: Icon, color, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 p-6 rounded-[2rem] border-2 transition-all text-left ${active ? 'bg-white border-blue-500 shadow-xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200 shadow-sm'}`}
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
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto bg-[#fdfdfd]">{children}</div>
      </div>
    </div>
  );
};

// --- APLICAÇÃO ---

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

  const [reportFilters, setReportFilters] = useState({
    dataInicio: '',
    dataFim: '',
    numeroNF: '',
    contratante: '',
  });

  const [formData, setFormData] = useState({
    numeroNF: '', chaveNF: '', cte: '', 
    contratante: '', destinatario: '', 
    volume: '', peso: '', valorNF: '',
    valorFrete: '', valorPago: '',
    motorista: '', veiculo: '', placa: '',
    dataSaida: '', dataEntrega: '', status: 'Pendente',
    comprovanteUrl: '',
    formaPagamento: 'Pix',
    numeroBoleto: '', dataVencimentoBoleto: '', valorBoleto: '',
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
      const data = { 
        ...formData, 
        valorFrete: Number(formData.valorFrete) || 0,
        valorPago: Number(formData.valorPago) || 0,
        valorNF: Number(formData.valorNF) || 0,
        peso: Number(formData.peso) || 0,
        valorBoleto: formData.formaPagamento === 'Boleto' ? Number(formData.valorBoleto) || 0 : 0,
        userId: user.uid, 
        updatedAt: serverTimestamp() 
      };
      
      let currentId = editingId;

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), data);
        
        if (colName === 'viagens') {
          const finQuery = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'financeiro'),
            where('viagemId', '==', editingId)
          );
          const finSnap = await getDocs(finQuery);
          if (!finSnap.empty) {
            const finDoc = finSnap.docs[0];
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financeiro', finDoc.id), {
              valor: Number(data.valorFrete),
              valorPago: Number(data.valorPago),
              metodo: data.formaPagamento,
              numeroBoleto: data.numeroBoleto || '',
              vencimento: data.dataVencimentoBoleto || '',
              pago: Number(data.valorPago) >= Number(data.valorFrete),
              updatedAt: serverTimestamp()
            });
          }
        }
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
            metodo: formData.formaPagamento,
            numeroBoleto: formData.numeroBoleto || '',
            vencimento: formData.dataVencimentoBoleto || '',
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
      status: 'Pendente', comprovanteUrl: '', formaPagamento: 'Pix',
      numeroBoleto: '', dataVencimentoBoleto: '', valorBoleto: '',
      nome: '', cnpjCpf: '', email: '', telefone: '', endereco: '', modelo: '', marca: '', ano: '', tipoVeiculo: 'Truck'
    });
  };

  const getBoletoStatus = (vencimento, pago) => {
    if (pago) return { label: 'Pago', color: 'bg-emerald-100 text-emerald-700' };
    if (!vencimento) return { label: 'Aguardando', color: 'bg-slate-100 text-slate-500' };
    
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const dataVenc = new Date(vencimento);
    dataVenc.setHours(0,0,0,0);

    if (dataVenc < hoje) return { label: 'Atrasado', color: 'bg-red-100 text-red-700' };
    if (dataVenc.getTime() === hoje.getTime()) return { label: 'Vence Hoje', color: 'bg-amber-100 text-amber-700' };
    return { label: 'No Prazo', color: 'bg-blue-100 text-blue-700' };
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

  const reportResults = useMemo(() => {
    return viagens.filter(v => {
        const matchesNF = reportFilters.numeroNF ? v.numeroNF?.toLowerCase().includes(reportFilters.numeroNF.toLowerCase()) : true;
        const matchesContratante = reportFilters.contratante ? v.contratante?.toLowerCase().includes(reportFilters.contratante.toLowerCase()) : true;
        const matchesInicio = reportFilters.dataInicio ? new Date(v.dataSaida) >= new Date(reportFilters.dataInicio) : true;
        const matchesFim = reportFilters.dataFim ? new Date(v.dataSaida) <= new Date(reportFilters.dataFim) : true;
        return matchesNF && matchesContratante && matchesInicio && matchesFim;
    });
  }, [viagens, reportFilters]);

  const boletosAtivos = useMemo(() => {
    return viagens.filter(v => v.formaPagamento === 'Boleto');
  }, [viagens]);

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden font-sans print:bg-white text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col p-6 shrink-0 print:hidden shadow-2xl z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <Truck className="text-blue-500" size={28} />
          <h1 className="text-xl font-black italic tracking-tighter">CARGOFY</h1>
        </div>
        <nav className="flex-1 space-y-1">
          <NavItem icon={LayoutDashboard} label="Painel Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Viagens / Cargas" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="py-6 opacity-30 text-[9px] font-black uppercase tracking-[0.2em] px-4">Cadastros</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Layers} label="Frota" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
        <button onClick={() => setReportModalOpen(true)} className="mt-4 flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
          <Download size={18} /> Relatórios
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col print:p-0 relative">
        <header className="h-20 bg-white border-b-2 border-slate-200 flex items-center justify-between px-8 print:hidden z-10 shadow-sm">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Pesquisar em ${activeTab}...`} 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border-2 border-slate-200 focus:border-blue-500 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <button onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0">
                <Plus size={16} /> Novo Lançamento
            </button>
          </div>
        </header>

        <div className="p-8 overflow-y-auto space-y-8 print:p-0">
          {/* Dashboard Stats */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex gap-6">
                <StatCard title="Total Viagens" count={viagens.length} icon={Layers} color="bg-slate-800" active={dashboardFilter === 'Todos'} onClick={() => setDashboardFilter('Todos')} />
                <StatCard title="Em Rota" count={viagens.filter(v => v.status === 'Em rota').length} icon={Truck} color="bg-blue-500" active={dashboardFilter === 'Em rota'} onClick={() => setDashboardFilter('Em rota')} />
                <StatCard title="Boletos Pendentes" count={boletosAtivos.filter(v => Number(v.valorPago) < Number(v.valorFrete)).length} icon={Receipt} color="bg-amber-500" active={false} onClick={() => {}} />
                <StatCard title="Boletos Atrasados" count={boletosAtivos.filter(v => getBoletoStatus(v.dataVencimentoBoleto, Number(v.valorPago) >= Number(v.valorFrete)).label === 'Atrasado').length} icon={AlertTriangle} color="bg-red-500" active={false} onClick={() => {}} />
              </div>

              {/* Monitor de Boletos Bancários */}
              <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                        <Receipt size={16} className="text-blue-500" /> Monitor de Boletos Bancários
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {boletosAtivos.map(bol => {
                        const status = getBoletoStatus(bol.dataVencimentoBoleto, Number(bol.valorPago) >= Number(bol.valorFrete));
                        return (
                            <div key={bol.id} className="p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${status.color}`}>
                                        {status.label}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setFormData(bol); setEditingId(bol.id); setModalOpen(true); }} className="p-1.5 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                                            <Edit3 size={12} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Boleto Nº {bol.numeroBoleto || 'Pendente'}</p>
                                <p className="text-sm font-black text-slate-800 truncate mb-1">{bol.contratante}</p>
                                <div className="flex justify-between items-end mt-4">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Vencimento</p>
                                        <p className="text-xs font-black text-slate-700">{bol.dataVencimentoBoleto ? new Date(bol.dataVencimentoBoleto).toLocaleDateString() : 'Não definido'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Valor</p>
                                        <p className="text-sm font-black text-blue-600">R$ {Number(bol.valorFrete).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Tabela Principal */}
          <div className="bg-white rounded-[2rem] shadow-sm border-2 border-slate-200 overflow-hidden print:border-none print:shadow-none">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 border-b-2 border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificação</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pagamento</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Prazo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50">
                {filteredData.map(item => {
                  const statusFin = getBoletoStatus(item.dataVencimentoBoleto || item.vencimento, Number(item.valorPago) >= Number(item.valorFrete || item.valor));
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    {item.formaPagamento === 'Boleto' ? <Receipt size={18}/> : <DollarSign size={18}/>}
                                </div>
                                <div>
                                    <p className="font-black text-sm text-slate-800">{item.numeroNF ? `NF ${item.numeroNF}` : (item.nome || item.descricao)}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.contratante || item.categoria || 'Geral'}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="space-y-1">
                                <p className="text-xs font-black text-slate-700">R$ {Number(item.valorFrete || item.valor).toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                                    <CreditCard size={10} /> {item.formaPagamento || item.metodo || 'Pix'}
                                </p>
                            </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${statusFin.color} border border-black/5`}>
                                    {statusFin.label}
                                </span>
                                {item.dataVencimentoBoleto && (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        Vence: {new Date(item.dataVencimentoBoleto).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="px-8 py-6 text-right print:hidden">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setFormData(item); setEditingId(item.id); setModalOpen(true); }} className="p-2 bg-blue-50 hover:bg-blue-600 rounded-lg text-blue-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                                <button onClick={() => { if(window.confirm('Excluir registro?')) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', (activeTab === 'dashboard' ? 'viagens' : activeTab), item.id))}} className="p-2 bg-red-50 hover:bg-red-600 rounded-lg text-red-500 hover:text-white transition-all"><Trash2 size={14}/></button>
                            </div>
                        </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL DE LANÇAMENTO */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Detalhes do Lançamento">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-5">
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b-2 border-slate-50">
                        <FileText size={16} className="text-blue-500"/> Informações do Carregamento
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Número da NF" value={formData.numeroNF} placeholder="Ex: 00123" onChange={v => setFormData({...formData, numeroNF: v})} />
                        <Input label="Empresa Contratante" value={formData.contratante} placeholder="Nome do Cliente" onChange={v => setFormData({...formData, contratante: v})} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Peso Bruto" type="number" suffix="KG" value={formData.peso} onChange={v => setFormData({...formData, peso: v})} />
                        <Input label="Valor Frete Total" type="number" suffix="R$" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
                        <Input label="Valor Adiantado/Pago" type="number" suffix="R$" value={formData.valorPago} onChange={v => setFormData({...formData, valorPago: v})} />
                    </div>
                </div>

                <div className="p-6 bg-blue-50/50 rounded-3xl border-2 border-blue-200 shadow-sm space-y-5">
                    <h4 className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b-2 border-blue-100">
                        <CreditCard size={16}/> Condições de Faturamento
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Meio de Pagamento</label>
                            <select 
                                className="w-full p-4 bg-white rounded-xl text-xs font-bold border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                                value={formData.formaPagamento}
                                onChange={e => setFormData({...formData, formaPagamento: e.target.value})}
                            >
                                <option value="Pix">Pix / Transferência</option>
                                <option value="Boleto">Boleto Bancário</option>
                                <option value="Cartão">Cartão de Crédito</option>
                                <option value="Dinheiro">Dinheiro Espécie</option>
                            </select>
                        </div>
                        {formData.formaPagamento === 'Boleto' && (
                            <Input label="Data Vencimento" type="date" value={formData.dataVencimentoBoleto} onChange={v => setFormData({...formData, dataVencimentoBoleto: v})} />
                        )}
                    </div>
                    
                    {formData.formaPagamento === 'Boleto' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                            <Input label="Número do Boleto" placeholder="Código identificador" value={formData.numeroBoleto} onChange={v => setFormData({...formData, numeroBoleto: v})} />
                            <Input label="Valor do Boleto" type="number" suffix="R$" value={formData.valorBoleto} onChange={v => setFormData({...formData, valorBoleto: v})} />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="p-6 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-5">
                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2 pb-2 border-b-2 border-slate-50">
                        <Truck size={16} className="text-blue-500"/> Dados Logísticos
                    </h4>
                    <Input label="Placa do Veículo" placeholder="ABC-1234" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
                    <Input label="Nome do Motorista" placeholder="Nome completo" value={formData.motorista} onChange={v => setFormData({...formData, motorista: v})} />
                    <Input label="Data de Saída" type="date" value={formData.dataSaida} onChange={v => setFormData({...formData, dataSaida: v})} />
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Status da Carga</label>
                        <select 
                            className="w-full p-4 bg-white rounded-xl text-xs font-bold border-2 border-slate-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value})}
                        >
                            <option value="Pendente">Pendente</option>
                            <option value="Em rota">Em rota</option>
                            <option value="Entregue">Entregue</option>
                        </select>
                    </div>
                </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-colors">Cancelar</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-700 transition-all hover:scale-[1.01] active:scale-[0.99]">Guardar Alterações</button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE RELATÓRIOS */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Exportação de Relatórios">
         <div className="space-y-8">
            <div className="p-8 bg-white border-2 border-slate-200 rounded-3xl shadow-sm space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-slate-50">
                    <Filter className="text-blue-600" size={18} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Painel de Filtragem Avançada</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input 
                        label="Filtrar Contratante" 
                        placeholder="Nome da empresa..." 
                        value={reportFilters.contratante} 
                        onChange={v => setReportFilters({...reportFilters, contratante: v})} 
                    />
                    <Input 
                        label="Filtrar por NF" 
                        placeholder="Número da nota..." 
                        value={reportFilters.numeroNF} 
                        onChange={v => setReportFilters({...reportFilters, numeroNF: v})} 
                    />
                    <Input label="Data Inicial" type="date" value={reportFilters.dataInicio} onChange={v => setReportFilters({...reportFilters, dataInicio: v})} />
                    <Input label="Data Final" type="date" value={reportFilters.dataFim} onChange={v => setReportFilters({...reportFilters, dataFim: v})} />
                </div>
                
                <div className="flex justify-between items-center pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Total de registros encontrados: <span className="text-blue-600 font-black">{reportResults.length}</span>
                    </p>
                    <button 
                        onClick={() => setReportFilters({ dataInicio: '', dataFim: '', numeroNF: '', contratante: '' })}
                        className="text-[9px] font-black uppercase text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                        <X size={12} /> Limpar Filtros
                    </button>
                </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-[2rem] overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b-2 border-slate-100 sticky top-0 z-10">
                        <tr>
                            <th className="p-5 font-black uppercase tracking-wider text-slate-500 bg-slate-50">NF</th>
                            <th className="p-5 font-black uppercase tracking-wider text-slate-500 bg-slate-50">Contratante</th>
                            <th className="p-5 font-black uppercase tracking-wider text-slate-500 bg-slate-50">Data Saída</th>
                            <th className="p-5 font-black uppercase tracking-wider text-slate-500 bg-slate-50">Motorista</th>
                            <th className="p-5 font-black uppercase tracking-wider text-slate-500 bg-slate-50 text-right">Valor Frete</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50 font-bold text-slate-700">
                        {reportResults.length > 0 ? (
                            reportResults.map(r => (
                                <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-5">{r.numeroNF || '---'}</td>
                                    <td className="p-5 uppercase tracking-tighter">{r.contratante}</td>
                                    <td className="p-5">{r.dataSaida ? new Date(r.dataSaida).toLocaleDateString() : '---'}</td>
                                    <td className="p-5 text-slate-500">{r.motorista || 'Não inf.'}</td>
                                    <td className="p-5 text-right font-black text-blue-600">R$ {Number(r.valorFrete).toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-10 text-center text-slate-400 font-black uppercase tracking-widest bg-slate-50/30">
                                    Nenhum registro encontrado para estes filtros.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex gap-4">
                <button onClick={() => window.print()} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95">
                    <Printer size={18} /> Gerar PDF e Imprimir
                </button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
