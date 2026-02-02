import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
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
  LayoutDashboard, 
  Truck, 
  Users, 
  DollarSign, 
  Plus, 
  Package, 
  MapPin, 
  X, 
  Trash2, 
  Briefcase, 
  LogOut, 
  Lock, 
  Mail, 
  Clock,
  FileText,
  Upload,
  Download,
  Search,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
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
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} shadow-lg shadow-current/10`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- ECRÃ DE AUTENTICAÇÃO ---

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError('Credenciais inválidas ou erro de conexão.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="bg-white w-full max-w-[440px] rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100">
        <div className="p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-inner">
            <Truck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">CargoFy</h1>
          <p className="text-blue-100/80 text-sm mt-2 font-medium italic">Gestão Logística Completa</p>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold" placeholder="usuario@exemplo.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
            {isRegistering ? 'Criar Conta' : 'Acessar Sistema'}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-slate-400 text-xs font-bold hover:text-blue-600 transition-colors uppercase tracking-widest">
              {isRegistering ? 'Já possuo login' : 'Solicitar acesso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- DASHBOARD PRINCIPAL ---

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchNF, setSearchNF] = useState('');
  
  // Estados dos formulários
  const [formData, setFormData] = useState({
    numeroNF: '', dataNF: '', cliente: '', destinatario: '', cidade: '', 
    volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
    valorFrete: '', motorista: '', comprovante: null, vencimento: '', 
    statusFinanceiro: 'Pendente', nome: '', email: '', telefone: '', 
    modelo: '', placa: '', tipo: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const stats = useMemo(() => {
    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFrete) || 0), 0);
    const custos = financeiro.reduce((acc, curr) => acc + (Number(curr.valorPago) || 0), 0);
    return { 
      faturamento, 
      lucro: faturamento - custos, 
      emRota: viagens.filter(v => v.status === 'Em rota').length, 
      total: viagens.length 
    };
  }, [viagens, financeiro]);

  const filteredViagens = useMemo(() => {
    if (!searchNF) return viagens;
    return viagens.filter(v => v.numeroNF?.toLowerCase().includes(searchNF.toLowerCase()));
  }, [viagens, searchNF]);

  const handleSaveData = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    // Determina a coleção baseada na aba ativa (botão inteligente)
    let colName = activeTab === 'dashboard' ? 'viagens' : activeTab;
    
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  const resetForm = () => {
    setFormData({ 
      numeroNF: '', dataNF: '', cliente: '', destinatario: '', cidade: '', 
      volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
      valorFrete: '', motorista: '', comprovante: null, vencimento: '', 
      statusFinanceiro: 'Pendente', nome: '', email: '', telefone: '', 
      modelo: '', placa: '', tipo: ''
    });
  };

  const handleDelete = async (col, id) => {
    if (window.confirm("Apagar este registro permanentemente?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    }
  };

  const getFinanceiroStatus = (vencimento, status) => {
    if (status === 'Pago') return { label: 'Pago', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    if (!vencimento) return { label: 'Pendente', color: 'bg-slate-100 text-slate-500', icon: Clock };
    
    const hoje = new Date();
    const dataVenc = new Date(vencimento);
    const diff = (dataVenc - hoje) / (1000 * 60 * 60 * 24);

    if (diff < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    if (diff <= 3) return { label: 'Urgente', color: 'bg-orange-100 text-orange-700', icon: Clock };
    return { label: 'No Prazo', color: 'bg-blue-100 text-blue-700', icon: Clock };
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      Sincronizando Banco de Dados...
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col shrink-0 relative z-20 shadow-2xl">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl"><Truck className="text-white" size={24} /></div>
          <h1 className="text-2xl font-black tracking-tighter">CargoFy</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Viagens" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          
          <div className="pt-8 pb-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cadastros</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Layers} label="Veículos" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
        <div className="p-6 mt-auto border-t border-slate-800">
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white transition-all hover:bg-red-500/20">
            <LogOut size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Sair</span>
          </button>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-white border-b flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-8">
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Gestão de {activeTab}</h2>
              <p className="text-xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Visão Geral' : activeTab}</p>
            </div>
            {/* Campo de Busca NF */}
            <div className="relative group w-64 hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar NF..." 
                value={searchNF}
                onChange={(e) => setSearchNF(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => { resetForm(); setModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
              <Plus size={18} /> {activeTab === 'dashboard' ? 'Lançar Viagem' : `Novo(a) ${activeTab.slice(0, -1)}`}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card title="Cargas em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-600" />
                <Card title="Lucro Mensal" value={`R$ ${stats.lucro.toLocaleString('pt-BR')}`} icon={DollarSign} color="bg-emerald-500" />
                <Card title="Faturamento" value={`R$ ${stats.faturamento.toLocaleString('pt-BR')}`} icon={Briefcase} color="bg-indigo-600" />
                <Card title="Total Viagens" value={stats.total} icon={Package} color="bg-slate-800" />
              </div>
              
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                   <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Listagem Geral de Notas Fiscais</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">NF</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destinatário / Cidade</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Frete</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredViagens.map(v => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-700">{v.numeroNF}</p>
                            <p className="text-[10px] text-slate-400 truncate w-32">{v.chaveID}</p>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-semibold text-slate-700">{v.destinatario}</p>
                            <p className="text-xs text-slate-400">{v.cidade}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              v.status === 'Em rota' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}>{v.status}</span>
                          </td>
                          <td className="px-8 py-5 font-black text-slate-900 text-right">R$ {Number(v.valorFrete).toLocaleString('pt-BR')}</td>
                          <td className="px-8 py-5">
                            <button onClick={() => handleDelete('viagens', v.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'viagens' && <TableView data={viagens} columns={['numeroNF', 'destinatario', 'cidade', 'valorFrete', 'status']} onDel={(id) => handleDelete('viagens', id)} prefix="R$ " />}
          {activeTab === 'financeiro' && <FinanceiroView data={financeiro} getStatus={getFinanceiroStatus} onDel={(id) => handleDelete('financeiro', id)} />}
          {activeTab === 'clientes' && <TableView data={clientes} columns={['nome', 'email', 'telefone']} onDel={(id) => handleDelete('clientes', id)} />}
          {activeTab === 'motoristas' && <TableView data={motoristas} columns={['nome', 'telefone']} onDel={(id) => handleDelete('motoristas', id)} />}
          {activeTab === 'veiculos' && <TableView data={veiculos} columns={['modelo', 'placa', 'tipo']} onDel={(id) => handleDelete('veiculos', id)} />}
        </div>
      </main>

      {/* Modal de Cadastro Dinâmico */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Novo Lançamento: ${activeTab}`}>
        <form onSubmit={handleSaveData} className="space-y-6">
          {(activeTab === 'viagens' || activeTab === 'dashboard') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Nº Nota Fiscal (NF)" value={formData.numeroNF} onChange={val => setFormData({...formData, numeroNF: val})} />
                <InputField label="Data da NF" type="date" value={formData.dataNF} onChange={val => setFormData({...formData, dataNF: val})} />
                <SelectField label="Status de Entrega" value={formData.status} options={['Pendente', 'Em rota', 'Entregue']} onChange={val => setFormData({...formData, status: val})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Cliente Contratante" value={formData.cliente} onChange={val => setFormData({...formData, cliente: val})} />
                <InputField label="Destinatário" value={formData.destinatario} onChange={val => setFormData({...formData, destinatario: val})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Cidade Destino" value={formData.cidade} onChange={val => setFormData({...formData, cidade: val})} />
                <InputField label="Volume (M³)" type="number" value={formData.volume} onChange={val => setFormData({...formData, volume: val})} />
                <InputField label="Peso (KG)" type="number" value={formData.peso} onChange={val => setFormData({...formData, peso: val})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Valor da Nota (R$)" type="number" value={formData.valorNF} onChange={val => setFormData({...formData, valorNF: val})} />
                <InputField label="Valor do Frete (R$)" type="number" value={formData.valorFrete} onChange={val => setFormData({...formData, valorFrete: val})} />
              </div>
              <InputField label="Chave de Acesso ID (44 Caracteres)" value={formData.chaveID} onChange={val => setFormData({...formData, chaveID: val})} />
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Upload size={12} /> Comprovante de Carga</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer">
                  <input type="file" className="hidden" id="file-up" onChange={(e) => setFormData({...formData, comprovante: e.target.files[0]?.name})} />
                  <label htmlFor="file-up" className="cursor-pointer block">
                    <p className="text-xs font-bold text-slate-500">{formData.comprovante || "Arraste ou clique para anexar imagem/PDF"}</p>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'financeiro' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Referência / Documento" value={formData.numeroNF} onChange={val => setFormData({...formData, numeroNF: val})} />
                <InputField label="Data de Vencimento" type="date" value={formData.vencimento} onChange={val => setFormData({...formData, vencimento: val})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Valor do Boleto (R$)" type="number" value={formData.valorFrete} onChange={val => setFormData({...formData, valorFrete: val})} />
                <SelectField label="Status de Pagamento" value={formData.statusFinanceiro} options={['Pendente', 'Pago']} onChange={val => setFormData({...formData, statusFinanceiro: val})} />
              </div>
            </>
          )}

          {activeTab === 'clientes' && (
            <div className="space-y-4">
              <InputField label="Razão Social / Nome" value={formData.nome} onChange={val => setFormData({...formData, nome: val})} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="E-mail" type="email" value={formData.email} onChange={val => setFormData({...formData, email: val})} />
                <InputField label="Telefone de Contato" value={formData.telefone} onChange={val => setFormData({...formData, telefone: val})} />
              </div>
            </div>
          )}

          {activeTab === 'motoristas' && (
            <div className="space-y-4">
              <InputField label="Nome Completo do Motorista" value={formData.nome} onChange={val => setFormData({...formData, nome: val})} />
              <InputField label="CPF / Telefone" value={formData.telefone} onChange={val => setFormData({...formData, telefone: val})} />
            </div>
          )}

          {activeTab === 'veiculos' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Modelo do Veículo" value={formData.modelo} onChange={val => setFormData({...formData, modelo: val})} />
              <InputField label="Placa" value={formData.placa} onChange={val => setFormData({...formData, placa: val})} />
              <SelectField label="Tipo" value={formData.tipo} options={['Truck', 'Toco', 'VUC', 'Carreta']} onChange={val => setFormData({...formData, tipo: val})} />
            </div>
          )}

          <div className="pt-6 flex gap-4">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-8 py-4 rounded-2xl text-xs font-black uppercase text-slate-400 hover:bg-slate-100">Cancelar</button>
            <button type="submit" className="flex-[2] bg-blue-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700">Confirmar Cadastro</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- VIEWS ESPECÍFICAS ---

function TableView({ data, columns, onDel, prefix = "" }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left min-w-[600px]">
        <thead className="bg-slate-50/50">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {col === 'numeroNF' ? 'NF' : col === 'valorFrete' ? 'Valor' : col}
              </th>
            ))}
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map(item => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
              {columns.map(col => (
                <td key={col} className="px-8 py-5 font-bold text-slate-700">
                  {col.includes('valor') || col.includes('Frete') ? `${prefix}${Number(item[col] || 0).toLocaleString('pt-BR')}` : item[col]}
                </td>
              ))}
              <td className="px-8 py-5 text-right">
                <button onClick={() => onDel(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FinanceiroView({ data, getStatus, onDel }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
      <table className="w-full text-left min-w-[700px]">
        <thead className="bg-slate-50/50">
          <tr>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map(item => {
            const status = getStatus(item.vencimento, item.statusFinanceiro);
            const Icon = status.icon;
            return (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5 font-bold text-slate-700 flex items-center gap-2">
                  <Calendar size={14} className="text-slate-300" />
                  {item.vencimento ? new Date(item.vencimento).toLocaleDateString('pt-BR') : 'S/D'}
                </td>
                <td className="px-8 py-5 font-medium text-slate-600">NF: {item.numeroNF}</td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 w-fit ${status.color}`}>
                    <Icon size={12} /> {status.label}
                  </span>
                </td>
                <td className="px-8 py-5 font-black text-slate-900 text-right">R$ {Number(item.valorFrete || 0).toLocaleString('pt-BR')}</td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => onDel(item.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- INPUTS ESTILIZADOS ---

function InputField({ label, type = "text", value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input type={type} required value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm cursor-pointer">
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-3.5 rounded-2xl transition-all ${
      active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}>
      <Icon size={18} /> <span className="text-xs font-bold uppercase tracking-[0.15em]">{label}</span>
    </button>
  );
}

export default App;
