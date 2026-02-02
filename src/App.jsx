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
  Clock
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
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
      setError('Credenciais inválidas ou erro de ligação ao servidor.');
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
          <p className="text-blue-100/80 text-sm mt-2 font-medium italic">Professional Logistics Management</p>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">{error}</div>}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold" placeholder="nome@empresa.com" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavra-passe</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold" placeholder="••••••••" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
            {isRegistering ? 'Criar Nova Conta' : 'Aceder ao Dashboard'}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-slate-400 text-xs font-bold hover:text-blue-600 transition-colors uppercase tracking-widest">
              {isRegistering ? 'Já tenho conta' : 'Solicitar Acesso'}
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
  const [modalOpen, setModalOpen] = useState(false);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    numeroNF: '',
    status: 'Pendente',
    valorFechado: '',
    valorPago: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Escuta de dados em tempo real
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'viagens'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setViagens(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Erro ao carregar dados:", error));
    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFechado) || 0), 0);
    const custos = viagens.reduce((acc, curr) => acc + (Number(curr.valorPago) || 0), 0);
    return { 
      faturamento, 
      lucro: faturamento - custos, 
      emRota: viagens.filter(v => v.status === 'Em rota').length, 
      total: viagens.length 
    };
  }, [viagens]);

  // FUNÇÃO PARA ADICIONAR DADOS
  const handleSaveViagem = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'viagens'), {
        ...formData,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setModalOpen(false);
      setFormData({ numeroNF: '', status: 'Pendente', valorFechado: '', valorPago: '' });
    } catch (err) {
      console.error("Erro ao guardar registo:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja apagar este registo permanentemente?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'viagens', id));
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-slate-400">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-black uppercase tracking-widest">Sincronizando...</span>
    </div>
  );

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans text-slate-900">
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col shrink-0 relative z-20 shadow-2xl">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Truck className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">CargoFy</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Viagens" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="pt-8 pb-3 px-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Administração</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
        </nav>
        <div className="p-6 mt-auto border-t border-slate-800">
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white transition-all hover:bg-red-500/20">
            <LogOut size={18} /> <span className="text-xs font-bold uppercase tracking-widest">Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-24 bg-white border-b flex items-center justify-between px-10 shrink-0">
          <div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Painel Logístico</h2>
            <p className="text-xl font-bold text-slate-800 capitalize">{activeTab}</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
            <Plus size={18} /> Registar Viagem
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card title="Em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-600" />
                <Card title="Lucro Bruto" value={`€ ${stats.lucro.toLocaleString()}`} icon={DollarSign} color="bg-emerald-500" />
                <Card title="Faturamento" value={`€ ${stats.faturamento.toLocaleString()}`} icon={Briefcase} color="bg-indigo-600" />
                <Card title="Viagens Totais" value={stats.total} icon={Package} color="bg-slate-800" />
              </div>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referência NF</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor (€)</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {viagens.map(v => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 font-bold text-slate-700">{v.numeroNF}</td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            v.status === 'Em rota' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                          }`}>{v.status}</span>
                        </td>
                        <td className="px-8 py-5 font-black text-slate-900 text-right">{Number(v.valorFechado).toLocaleString()}</td>
                        <td className="px-8 py-5">
                          <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {viagens.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-8 py-10 text-center text-slate-400 text-sm font-medium">Nenhum registo encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab !== 'dashboard' && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <Clock size={48} className="mb-4 opacity-20" />
              <p className="font-black uppercase tracking-widest text-xs">Módulo {activeTab} em configuração</p>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Registo de Viagem">
        <form onSubmit={handleSaveViagem} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº da Fatura / NF</label>
              <input type="text" required value={formData.numeroNF} onChange={e => setFormData({...formData, numeroNF: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold" placeholder="Ex: 10293" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Operacional</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold appearance-none">
                <option value="Pendente">Pendente</option>
                <option value="Em rota">Em rota</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receita Prevista (€)</label>
              <input type="number" required value={formData.valorFechado} onChange={e => setFormData({...formData, valorFechado: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custos Estimados (€)</label>
              <input type="number" required value={formData.valorPago} onChange={e => setFormData({...formData, valorPago: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold" placeholder="0.00" />
            </div>
          </div>
          <div className="pt-6 flex gap-4">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-8 py-4 rounded-2xl text-xs font-black uppercase text-slate-400 hover:bg-slate-100">Cancelar</button>
            <button type="submit" className="flex-[2] bg-blue-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700">Guardar Operação</button>
          </div>
        </form>
      </Modal>
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
