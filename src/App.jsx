import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, Lock, Mail, Clock, FileText, Search, Calendar, Layers, 
  CheckCircle2, AlertCircle, Edit3, Download, SteeringWheel, ArrowRight, Camera, Paperclip, ExternalLink
} from 'lucide-react';

// --- CONFIGURAÇÃO ---
const firebaseConfig = { 
  apiKey: "AIzaSyDncBYgIrudOBBwjsNFe9TS7Zr0b2nJLRo", 
  authDomain: "cargofy-b4435.firebaseapp.com", 
  projectId: "cargofy-b4435", 
  storageBucket: "cargofy-b4435.firebasestorage.app", 
  appId: "1:827918943476:web:a1a33a1e6dd84e4e8c8aa1" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'cargofy-b4435-prod';

// --- COMPONENTES DE UI ---

const Card = ({ title, value, icon: Icon, color, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-full text-left bg-white p-6 rounded-2xl shadow-sm border ${active ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-100'} flex items-start justify-between transition-all hover:shadow-md hover:scale-[1.02] active:scale-95`}
  >
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-xl font-black text-slate-800 mt-1">{value}</h3>
      {onClick && <p className="text-[9px] font-bold text-blue-500 mt-2 flex items-center gap-1 uppercase">Ver detalhes <ArrowRight size={10}/></p>}
    </div>
    <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
      <Icon size={20} />
    </div>
  </button>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchNF, setSearchNF] = useState('');

  const [formData, setFormData] = useState({
    numeroNF: '', dataNF: '', dataSaida: '', cliente: '', destinatario: '', cidade: '', 
    volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
    valorFrete: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', vencimento: '', 
    statusFinanceiro: 'Pendente', nome: '', email: '', telefone: '', 
    modelo: '', tipo: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
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
      }, (error) => console.error(`Erro ao carregar ${colName}:`, error));
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const stats = useMemo(() => {
    const pendentes = viagens.filter(v => v.status === 'Pendente').length;
    const emRota = viagens.filter(v => v.status === 'Em rota').length;
    const entregues = viagens.filter(v => v.status === 'Entregue').length;
    const faturamento = viagens.reduce((acc, curr) => acc + (parseFloat(curr.valorFrete) || 0), 0);
    return { pendentes, emRota, entregues, faturamento, total: viagens.length };
  }, [viagens]);

  const filteredData = useMemo(() => {
    let list = [];
    switch (activeTab) {
      case 'dashboard':
      case 'viagens': 
        list = statusFilter === 'Todos' ? viagens : viagens.filter(v => v.status === statusFilter);
        break;
      case 'financeiro': list = financeiro; break;
      case 'clientes': list = clientes; break;
      case 'motoristas': list = motoristas; break;
      case 'veiculos': list = veiculos; break;
      default: list = [];
    }

    if (!searchNF) return list;
    const term = searchNF.toLowerCase();
    return list.filter(item => 
      (item.numeroNF?.toLowerCase().includes(term)) ||
      (item.nome?.toLowerCase().includes(term)) ||
      (item.placa?.toLowerCase().includes(term)) ||
      (item.cidade?.toLowerCase().includes(term)) ||
      (item.motorista?.toLowerCase().includes(term))
    );
  }, [activeTab, statusFilter, viagens, financeiro, clientes, motoristas, veiculos, searchNF]);

  const handleOpenEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const colName = (activeTab === 'dashboard' || activeTab === 'viagens') ? 'viagens' : activeTab;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), formData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
          ...formData, userId: user.uid, createdAt: serverTimestamp()
        });
      }
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({ 
      numeroNF: '', dataNF: '', dataSaida: '', cliente: '', destinatario: '', cidade: '', 
      volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
      valorFrete: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', vencimento: '', 
      statusFinanceiro: 'Pendente', nome: '', email: '', telefone: '', 
      modelo: '', tipo: ''
    });
  };

  if (!user) return <Login />;

  return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-900 font-sans">
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col p-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => {setActiveTab('dashboard'); setStatusFilter('Todos');}}>
          <Truck className="text-blue-500" size={28} />
          <h1 className="text-xl font-black tracking-tighter uppercase">CargoFy</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Painel" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setStatusFilter('Todos');}} />
          <NavItem icon={Package} label="Viagens" active={activeTab === 'viagens'} onClick={() => {setActiveTab('viagens'); setStatusFilter('Todos');}} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Gestão</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Layers} label="Veículos" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
        <button onClick={() => signOut(auth)} className="mt-auto flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold uppercase py-4 border-t border-white/10"><LogOut size={16}/> Sair</button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={searchNF}
                onChange={(e) => setSearchNF(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm font-medium transition-all"
              />
            </div>
            {statusFilter !== 'Todos' && (
              <button onClick={() => setStatusFilter('Todos')} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                Filtro: {statusFilter} <X size={12}/>
              </button>
            )}
          </div>
          <button onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 transition-all">
            <Plus size={16} /> Novo Registro
          </button>
        </header>

        <div className="p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card title="Cargas Pendentes" value={stats.pendentes} icon={Clock} color="bg-amber-500" active={statusFilter === 'Pendente'} onClick={() => setStatusFilter('Pendente')} />
              <Card title="Cargas em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-600" active={statusFilter === 'Em rota'} onClick={() => setStatusFilter('Em rota')} />
              <Card title="Concluídas" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" active={statusFilter === 'Entregue'} onClick={() => setStatusFilter('Entregue')} />
              <Card title="Faturamento" value={`R$ ${stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-indigo-600" />
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{activeTab}</h3>
              <span className="text-[10px] font-bold text-slate-400">{filteredData.length} registros</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">NF / Identificação</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Transporte</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status / Financeiro</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800">{item.numeroNF || item.nome || item.modelo || "---"}</p>
                        {item.urlComprovante && (
                          <a href={item.urlComprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" className="text-blue-500 hover:scale-110 transition-transform">
                            <Paperclip size={14} />
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{item.chaveID || item.email || item.placa}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{item.motorista || item.telefone || item.tipo || '---'}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase">{item.veiculo} {item.placa}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          item.status === 'Em rota' ? 'bg-blue-100 text-blue-600' : 
                          item.status === 'Entregue' ? 'bg-emerald-100 text-emerald-600' :
                          item.status === 'Pendente' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {item.status || item.statusFinanceiro || 'Ativo'}
                        </span>
                        {item.valorFrete && <p className="font-black text-slate-900 text-sm">R$ {parseFloat(item.valorFrete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                        <button onClick={async () => { 
                          if(confirm('Excluir registro?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', (activeTab === 'dashboard' || activeTab === 'viagens' ? 'viagens' : activeTab), item.id));
                        }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Registro" : "Novo Cadastro"}>
        <form onSubmit={handleSave} className="space-y-6">
          {(activeTab === 'dashboard' || activeTab === 'viagens') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Número NF" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                <Input label="Data de Saída" type="date" value={formData.dataSaida} onChange={v => setFormData({...formData, dataSaida: v})} />
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Motorista</label>
                  <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold outline-none" value={formData.motorista} onChange={e => setFormData({...formData, motorista: e.target.value})}>
                    <option value="">Selecionar...</option>
                    {motoristas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status da Carga</label>
                  <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none ring-2 ring-blue-500/10" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Pendente">Pendente</option>
                    <option value="Em rota">Em rota</option>
                    <option value="Entregue">Entregue</option>
                  </select>
                </div>
              </div>

              {/* CAMPO DO COMPROVANTE: APARECE APENAS QUANDO ENTREGUE */}
              {formData.status === 'Entregue' && (
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Camera size={18} />
                    <h4 className="text-xs font-black uppercase tracking-wider">Comprovante de Entrega</h4>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">Insira o link da foto ou documento para comprovação:</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://link-da-foto-ou-arquivo.com/foto.jpg"
                      value={formData.urlComprovante || ''}
                      onChange={e => setFormData({...formData, urlComprovante: e.target.value})}
                      className="flex-1 px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 ring-emerald-500/20"
                    />
                    {formData.urlComprovante && (
                      <a href={formData.urlComprovante} target="_blank" rel="noreferrer" className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
                        <ExternalLink size={18} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cidade Destino" value={formData.cidade} onChange={v => setFormData({...formData, cidade: v})} />
                <Input label="Valor Frete (R$)" type="number" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
                <Input label="Chave ID (NF-e)" value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
              </div>
            </div>
          )}

          {activeTab === 'clientes' && (
            <div className="space-y-4">
              <Input label="Nome / Razão Social" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="E-mail" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
              <Input label="Telefone" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
            </div>
          )}

          {activeTab === 'motoristas' && (
            <div className="space-y-4">
              <Input label="Nome Completo" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="Telefone / Contato" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
            </div>
          )}

          {activeTab === 'veiculos' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Modelo" value={formData.modelo} onChange={v => setFormData({...formData, modelo: v})} />
              <Input label="Placa" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Cancelar</button>
            <button type="submit" className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20">Salvar Registro</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      <Icon size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-4 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm font-semibold transition-all" />
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isReg, setIsReg] = useState(false);
  const handle = async (e) => {
    e.preventDefault();
    try { isReg ? await createUserWithEmailAndPassword(auth, email, pass) : await signInWithEmailAndPassword(auth, email, pass); } 
    catch(err) { alert('Erro na autenticação: ' + err.message); }
  };
  return (
    <div className="h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <Truck className="mx-auto text-blue-600 mb-4" size={48} />
          <h2 className="text-2xl font-black uppercase tracking-tighter">CargoFy</h2>
          <p className="text-slate-400 text-xs font-bold uppercase mt-2 tracking-widest">Logística inteligente</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <Input label="E-mail" value={email} onChange={setEmail} />
          <Input label="Senha" type="password" value={pass} onChange={setPass} />
          <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">{isReg ? 'Criar Conta' : 'Entrar'}</button>
          <button type="button" onClick={() => setIsReg(!isReg)} className="w-full text-center text-xs font-bold text-slate-400 uppercase mt-4 underline decoration-slate-200 underline-offset-4">{isReg ? 'Já tenho conta' : 'Criar nova conta'}</button>
        </form>
      </div>
    </div>
  );
}

export default App;
