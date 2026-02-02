import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, Lock, Mail, Clock, FileText, Search, Calendar, Layers, 
  CheckCircle2, AlertCircle, Edit3, Download, SteeringWheel, ArrowRight, Camera, Paperclip, ExternalLink, Building2, FileBarChart, CreditCard
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

  const [reportFilters, setReportFilters] = useState({ nf: '', contratante: '', dataInicio: '', dataFim: '' });

  const [formData, setFormData] = useState({
    numeroNF: '', dataNF: '', dataSaida: '', dataEntrega: '', 
    contratante: '', destinatario: '', cidade: '', 
    volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
    valorFrete: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', 
    meioPagamento: 'Pix', dataVencimento: '', statusFinanceiro: 'Pendente',
    nome: '', email: '', telefone: '', modelo: '', tipo: ''
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
      (item.contratante?.toLowerCase().includes(term)) ||
      (item.nome?.toLowerCase().includes(term)) ||
      (item.placa?.toLowerCase().includes(term)) ||
      (item.cidade?.toLowerCase().includes(term)) ||
      (item.motorista?.toLowerCase().includes(term))
    );
  }, [activeTab, statusFilter, viagens, financeiro, clientes, motoristas, veiculos, searchNF]);

  const reportData = useMemo(() => {
    return viagens.filter(v => {
      const matchNF = reportFilters.nf ? v.numeroNF?.toLowerCase().includes(reportFilters.nf.toLowerCase()) : true;
      const matchContratante = reportFilters.contratante ? v.contratante?.toLowerCase().includes(reportFilters.contratante.toLowerCase()) : true;
      let matchDate = true;
      if (reportFilters.dataInicio && reportFilters.dataFim) {
        const itemDate = new Date(v.dataSaida);
        const start = new Date(reportFilters.dataInicio);
        const end = new Date(reportFilters.dataFim);
        matchDate = itemDate >= start && itemDate <= end;
      }
      return matchNF && matchContratante && matchDate;
    });
  }, [viagens, reportFilters]);

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
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
          ...formData, userId: user.uid, createdAt: serverTimestamp()
        });

        // Automação Financeira: Se for uma viagem com valor de frete, adiciona no financeiro
        if (colName === 'viagens' && formData.valorFrete > 0) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financeiro'), {
            viagemId: docRef.id,
            numeroNF: formData.numeroNF,
            contratante: formData.contratante,
            valor: formData.valorFrete,
            meioPagamento: formData.meioPagamento,
            dataVencimento: formData.dataVencimento || formData.dataSaida,
            status: 'Pendente',
            tipo: 'Receita',
            userId: user.uid,
            createdAt: serverTimestamp()
          });
        }
      }
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({ 
      numeroNF: '', dataNF: '', dataSaida: '', dataEntrega: '', 
      contratante: '', destinatario: '', cidade: '', 
      volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
      valorFrete: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', 
      meioPagamento: 'Pix', dataVencimento: '', statusFinanceiro: 'Pendente',
      nome: '', email: '', telefone: '', modelo: '', tipo: ''
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
          <NavItem icon={FileBarChart} label="Relatórios" active={activeTab === 'relatorios'} onClick={() => setActiveTab('relatorios')} />
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
                placeholder="Pesquisar registro..." 
                value={searchNF}
                onChange={(e) => setSearchNF(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm font-medium transition-all"
              />
            </div>
          </div>
          <button onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 transition-all">
            <Plus size={16} /> Novo Registro
          </button>
        </header>

        <div className="p-8 overflow-y-auto">
          {activeTab === 'relatorios' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                    <FileBarChart size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relatórios</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase">Busque por NF, Empresa ou Data</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Input label="Número NF" placeholder="Filtrar NF..." value={reportFilters.nf} onChange={v => setReportFilters({...reportFilters, nf: v})} />
                  <Input label="Empresa Contratante" placeholder="Filtrar empresa..." value={reportFilters.contratante} onChange={v => setReportFilters({...reportFilters, contratante: v})} />
                  <Input label="Data Início" type="date" value={reportFilters.dataInicio} onChange={v => setReportFilters({...reportFilters, dataInicio: v})} />
                  <Input label="Data Fim" type="date" value={reportFilters.dataFim} onChange={v => setReportFilters({...reportFilters, dataFim: v})} />
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">NF</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Contratante</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Data Saída</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Frete</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map(v => (
                        <tr key={v.id} className="text-sm hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-bold text-slate-800">{v.numeroNF}</td>
                          <td className="px-6 py-4 font-bold text-blue-600 uppercase text-[11px]">{v.contratante}</td>
                          <td className="px-6 py-4 text-slate-500">{v.dataSaida ? new Date(v.dataSaida + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                          <td className="px-6 py-4 font-black text-slate-800">R$ {parseFloat(v.valorFrete || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 uppercase text-[9px] font-black">{v.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-white">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{activeTab}</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Registro</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Detalhes</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{item.numeroNF || item.nome || item.modelo}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.contratante || item.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{item.cidade || item.tipo}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase">{item.motorista || item.telefone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500">
                          {item.status || item.statusFinanceiro || 'Ativo'}
                        </span>
                        {item.valorFrete && <p className="font-black text-slate-900 text-sm">R$ {parseFloat(item.valorFrete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                          <button onClick={async () => { if(confirm('Excluir?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', activeTab === 'dashboard' ? 'viagens' : activeTab, item.id)); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar" : "Novo"}>
        <form onSubmit={handleSave} className="space-y-6">
          {(activeTab === 'dashboard' || activeTab === 'viagens') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Número NF" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                <Input label="Contratante" value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
                <Input label="Valor Frete (R$)" type="number" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cidade Destino" value={formData.cidade} onChange={v => setFormData({...formData, cidade: v})} />
                <Input label="Data Saída" type="date" value={formData.dataSaida} onChange={v => setFormData({...formData, dataSaida: v})} />
              </div>

              {/* Pagamento e Financeiro */}
              <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <CreditCard size={18} />
                  <h4 className="text-xs font-black uppercase tracking-wider">Informações de Pagamento</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Meio de Pagamento</label>
                    <select className="w-full p-3 bg-white rounded-xl text-sm font-bold outline-none border border-blue-200" value={formData.meioPagamento} onChange={e => setFormData({...formData, meioPagamento: e.target.value})}>
                      <option value="Pix">Pix</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                  {formData.meioPagamento === 'Boleto' && (
                    <div className="animate-in fade-in slide-in-from-left-2">
                      <Input label="Vencimento do Boleto" type="date" value={formData.dataVencimento} onChange={v => setFormData({...formData, dataVencimento: v})} />
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-blue-400 font-bold uppercase italic">* Ao salvar, uma conta a receber será gerada automaticamente no financeiro.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Motorista" value={formData.motorista} onChange={v => setFormData({...formData, motorista: v})} />
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status Viagem</label>
                  <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Pendente">Pendente</option>
                    <option value="Em rota">Em rota</option>
                    <option value="Entregue">Entregue</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clientes' && <Input label="Razão Social" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />}
          {activeTab === 'motoristas' && <Input label="Nome Motorista" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />}
          {activeTab === 'veiculos' && <Input label="Modelo Veículo" value={formData.modelo} onChange={v => setFormData({...formData, modelo: v})} />}

          <div className="flex gap-3 pt-6 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400">Cancelar</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg">Confirmar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
      <Icon size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Input({ label, type = "text", value, onChange, placeholder = "" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input type={type} placeholder={placeholder} value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-4 py-2.5 bg-slate-100 rounded-xl outline-none border border-transparent focus:border-blue-400 text-sm font-semibold" />
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
    catch(err) { alert('Erro na autenticação.'); }
  };
  return (
    <div className="h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <Truck className="mx-auto text-blue-600 mb-4" size={48} />
          <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">CargoFy</h2>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <Input label="E-mail" value={email} onChange={setEmail} />
          <Input label="Senha" type="password" value={pass} onChange={setPass} />
          <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">{isReg ? 'Criar Conta' : 'Entrar'}</button>
          <button type="button" onClick={() => setIsReg(!isReg)} className="w-full text-center text-[10px] font-black text-slate-400 uppercase mt-4 underline">{isReg ? 'Login' : 'Nova Conta'}</button>
        </form>
      </div>
    </div>
  );
}

export default App;
