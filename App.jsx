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
  deleteDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  DollarSign, 
  Search, 
  Plus, 
  ChevronRight, 
  Clock,
  Package,
  MapPin,
  X,
  Trash2,
  Briefcase,
  LogOut,
  Lock,
  Mail
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

// --- COMPONENTES DE UI ---

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

// --- TELA DE LOGIN ---

function LoginPage({ onLogin }) {
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
      setError('Falha na autenticação. Verifique os dados.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 bg-blue-600 text-white text-center">
          <Truck size={48} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">CargoFy Online</h1>
          <p className="text-blue-100 text-sm mt-2">Gestão Profissional de Transportes</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">{error}</div>}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="exemplo@cargofy.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="••••••••"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
          </button>
          <button 
            type="button" 
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full text-slate-500 text-sm font-medium hover:text-blue-600 transition-colors"
          >
            {isRegistering ? 'Já tem conta? Faça Login' : 'Não tem conta? Registe-se'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- APLICAÇÃO PRINCIPAL ---

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viagens, setViagens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);

  const [modalState, setModalState] = useState({ open: false, type: '', data: null });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    return { faturamento, lucro: faturamento - custos, emRota: viagens.filter(v => v.status === 'Em rota').length, total: viagens.length };
  }, [viagens]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Carregando...</div>;
  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
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
        <button onClick={() => signOut(auth)} className="p-6 flex items-center gap-3 text-slate-400 hover:text-white border-t border-slate-800 transition-colors">
          <LogOut size={18} /> <span className="text-sm font-medium">Sair</span>
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <div className="text-sm text-slate-500">Olá, <span className="font-bold text-slate-900">{user.email}</span></div>
          <button onClick={() => setModalState({ open: true, type: 'viagens', data: null })} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md">
            <Plus size={18} /> Nova Viagem
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
           {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card title="Em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-500" />
                <Card title="Lucro" value={`R$ ${stats.lucro.toLocaleString()}`} icon={DollarSign} color="bg-emerald-500" />
                <Card title="Total" value={stats.total} icon={Package} color="bg-slate-700" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      <Icon size={18} /> <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default App;
