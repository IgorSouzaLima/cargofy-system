import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInAnonymously
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
  Briefcase, LogOut, Lock, Mail, Clock, FileText, Search, Calendar, Layers, 
  CheckCircle2, AlertCircle, Edit3, Download, ArrowRight, Camera, Paperclip, 
  ExternalLink, Building2, FileBarChart, CreditCard, Hash, Scale, Box,
  User as UserIcon, Settings, ChevronRight
} from 'lucide-react';

// --- CONFIGURAÇÃO ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cargofy-pro-v1';

// --- COMPONENTES DE INTERFACE ---

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
    {onClick && (
      <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
        Filtrar lista <ChevronRight size={12} />
      </div>
    )}
  </button>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
        <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Preencha todos os campos obrigatórios</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-8 overflow-y-auto bg-white">{children}</div>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);
  
  // Estados de dados
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

  // Autenticação (Regra 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erro na autenticação anónima:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listeners do Firestore (Regra 1 e 2)
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
      }, (error) => {
        console.error(`Erro ao carregar ${colName}:`, error);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const stats = useMemo(() => {
    const pendentes = viagens.filter(v => v.status === 'Pendente').length;
    const emRota = viagens.filter(v => v.status === 'Em rota').length;
    const entregues = viagens.filter(v => v.status === 'Entregue').length;
    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFrete) || 0), 0);
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
      (item.motorista?.toLowerCase().includes(term)) ||
      (item.chaveID?.toLowerCase().includes(term))
    );
  }, [activeTab, statusFilter, viagens, financeiro, clientes, motoristas, veiculos, searchNF]);

  const handleOpenEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    const colName = (activeTab === 'dashboard' || activeTab === 'viagens') ? 'viagens' : activeTab;
    
    try {
      // Normalização de dados numéricos
      const dataToSave = {
        ...formData,
        valorFrete: Number(formData.valorFrete) || 0,
        valorNF: Number(formData.valorNF) || 0,
        peso: Number(formData.peso) || 0,
        volume: Number(formData.volume) || 0,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), dataToSave);
      } else {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
          ...dataToSave,
          userId: user.uid,
          createdAt: serverTimestamp()
        });

        // Automação Financeira: Cria entrada se for uma viagem com valor
        if (colName === 'viagens' && dataToSave.valorFrete > 0) {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financeiro'), {
            viagemId: docRef.id,
            numeroNF: formData.numeroNF,
            contratante: formData.contratante,
            valor: dataToSave.valorFrete,
            meioPagamento: formData.meioPagamento,
            dataVencimento: formData.meioPagamento === 'Boleto' ? (formData.dataVencimento || formData.dataSaida) : formData.dataSaida,
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
    } catch (err) { 
      console.error("Erro ao salvar:", err);
    }
  };

  const resetForm = () => {
    setFormData({ 
      numeroNF: '', dataNF: '', dataSaida: '', dataEntrega: '', 
      contratante: '', destinatario: '', cidade: '', 
      volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
      valorFrete: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', 
      meioPagamento: 'Pix', dataVencimento: '',
      nome: '', email: '', telefone: '', modelo: '', tipo: ''
    });
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col p-8 shadow-2xl shrink-0 z-20">
        <div className="flex items-center gap-4 mb-12 px-2">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Truck className="text-white" size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">CargoFy</h1>
        </div>
        
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setStatusFilter('Todos');}} />
          <NavItem icon={Package} label="Gestão de Viagens" active={activeTab === 'viagens'} onClick={() => {setActiveTab('viagens'); setStatusFilter('Todos');}} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          
          <div className="pt-8 pb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Administração</div>
          
          <NavItem icon={Users} label="Base de Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Layers} label="Frota" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
        
        <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-black">OP</div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Operador</p>
              <p className="text-xs font-bold text-white truncate w-32">Logística Matriz</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 text-slate-500 hover:text-red-400 text-[10px] font-black uppercase py-2 transition-colors"><LogOut size={14}/> Encerrar Sessão</button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{activeTab === 'dashboard' ? 'Visão Geral' : activeTab}</h2>
            <div className="h-6 w-px bg-slate-100"></div>
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar por NF, Placa, Cliente..." 
                value={searchNF}
                onChange={(e) => setSearchNF(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500/10 text-xs font-bold transition-all border border-transparent focus:bg-white focus:border-slate-200"
              />
            </div>
          </div>
          
          <button 
            onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} 
            className="flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={16} /> Adicionar Novo
          </button>
        </header>

        <div className="p-10 overflow-y-auto space-y-10">
          {/* Dashboard Cards */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card title="Cargas Ativas" value={stats.total} icon={Package} color="bg-indigo-600" onClick={() => setStatusFilter('Todos')} active={statusFilter === 'Todos'} />
              <Card title="Veículos em Rota" value={stats.emRota} icon={Truck} color="bg-amber-500" onClick={() => setStatusFilter('Em rota')} active={statusFilter === 'Em rota'} />
              <Card title="Entregas Concluídas" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" onClick={() => setStatusFilter('Entregue')} active={statusFilter === 'Entregue'} />
              <Card title="Receita Prevista" value={`R$ ${stats.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-blue-600" />
            </div>
          )}

          {/* Tabela de Dados */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 bg-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Listagem de Registros</h3>
              </div>
              <div className="flex gap-2">
                {['Todos', 'Pendente', 'Em rota', 'Entregue'].map(f => (activeTab === 'dashboard' || activeTab === 'viagens') && (
                  <button 
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase transition-all ${statusFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informação Principal</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Logística / Local</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro / Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.length > 0 ? filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30 group transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-800 text-sm">
                            {item.numeroNF || item.nome || item.modelo || "Sem identificação"}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 uppercase mt-0.5 tracking-tight">
                            {item.contratante || item.email || item.placa || "N/D"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700">{item.cidade || item.tipo || "---"}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                            <UserIcon size={10} /> {item.motorista || item.telefone || "Não atribuído"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                            item.status === 'Entregue' || item.status === 'Pago' ? 'bg-emerald-100 text-emerald-600' : 
                            item.status === 'Em rota' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.status || item.statusFinanceiro || 'Ativo'}
                          </span>
                          {(item.valorFrete || item.valor) && (
                            <span className="font-black text-slate-900 text-xs tabular-nums">
                              R$ {Number(item.valorFrete || item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenEdit(item)} className="p-2.5 text-blue-600 hover:bg-blue-100 rounded-xl transition-all" title="Editar"><Edit3 size={16}/></button>
                          <button onClick={async () => { if(confirm('Excluir este registo permanentemente?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', (activeTab === 'dashboard' ? 'viagens' : activeTab), item.id)); }} className="p-2.5 text-red-400 hover:bg-red-100 rounded-xl transition-all" title="Eliminar"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <Box size={48} className="mb-4" />
                          <p className="text-xs font-black uppercase tracking-[0.2em]">Nenhum registo encontrado</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Unificado */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `Editar ${activeTab}` : `Novo Registro em ${activeTab}`}>
        <form onSubmit={handleSave} className="space-y-10">
          {(activeTab === 'dashboard' || activeTab === 'viagens') && (
            <div className="space-y-10">
              {/* Documentação */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={18}/></div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Documentação de Carga</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-8">
                    <Input label="Chave de Acesso NF-e (44 dígitos)" placeholder="0000 0000 0000..." value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
                  </div>
                  <div className="md:col-span-4">
                    <Input label="Número NF" placeholder="Ex: 12345" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Data de Emissão NF" type="date" value={formData.dataNF} onChange={v => setFormData({...formData, dataNF: v})} />
                  <Input label="Valor Total da Carga (R$)" type="number" value={formData.valorNF} onChange={v => setFormData({...formData, valorNF: v})} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">Anexo XML/PDF</label>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-2xl cursor-not-allowed">
                      <Paperclip size={14} className="text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Upload via Cloud Storage</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Rota e Destino */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><MapPin size={18}/></div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Logística de Rota</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Empresa Contratante" placeholder="Nome da empresa..." value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
                  <Input label="Destinatário Final" placeholder="Nome do recebedor..." value={formData.destinatario} onChange={v => setFormData({...formData, destinatario: v})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Cidade/UF Destino" placeholder="Ex: São Paulo/SP" value={formData.cidade} onChange={v => setFormData({...formData, cidade: v})} />
                  <Input label="Data Programada Saída" type="date" value={formData.dataSaida} onChange={v => setFormData({...formData, dataSaida: v})} />
                  <Input label="Previsão de Entrega" type="date" value={formData.dataEntrega} onChange={v => setFormData({...formData, dataEntrega: v})} />
                </div>
              </section>

              {/* Especificações Técnicas */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Scale size={18}/></div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Especificações Técnicas</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input label="Volume de Carga (Qtd)" type="number" value={formData.volume} onChange={v => setFormData({...formData, volume: v})} />
                  <Input label="Peso Bruto (kg)" type="number" value={formData.peso} onChange={v => setFormData({...formData, peso: v})} />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">Status Operacional</label>
                    <select 
                      className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-black uppercase outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all appearance-none" 
                      value={formData.status} 
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Pendente">Aguardando Coleta</option>
                      <option value="Em rota">Em Trânsito</option>
                      <option value="Entregue">Entrega Realizada</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                   <Input label="Motorista Escalado" placeholder="Selecione o motorista..." value={formData.motorista} onChange={v => setFormData({...formData, motorista: v})} />
                   <Input label="Veículo / Prefixo" value={formData.veiculo} onChange={v => setFormData({...formData, veiculo: v})} />
                   <Input label="Placa" placeholder="ABC-1234" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
                </div>
              </section>

              {/* Financeiro Acoplado */}
              <section className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-500/30 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg"><CreditCard size={18}/></div>
                  <h4 className="text-xs font-black uppercase tracking-widest">Informações de Frete e Faturamento</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-blue-200 uppercase ml-1">Valor do Frete Acordado (R$)</label>
                    <input 
                      type="number" 
                      value={formData.valorFrete} 
                      onChange={e => setFormData({...formData, valorFrete: e.target.value})}
                      className="w-full px-5 py-4 bg-white/10 rounded-2xl outline-none border border-white/20 focus:border-white focus:bg-white/20 text-sm font-bold placeholder:text-blue-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-blue-200 uppercase ml-1">Forma de Pagamento</label>
                    <select 
                      className="w-full p-4 bg-white/10 rounded-2xl text-sm font-bold outline-none border border-white/20 focus:border-white appearance-none" 
                      value={formData.meioPagamento} 
                      onChange={e => setFormData({...formData, meioPagamento: e.target.value})}
                    >
                      <option className="text-slate-900" value="Pix">Pix Instantâneo</option>
                      <option className="text-slate-900" value="Boleto">Boleto Bancário</option>
                      <option className="text-slate-900" value="Transferência">TED / DOC</option>
                      <option className="text-slate-900" value="Cartão">Cartão de Crédito</option>
                    </select>
                  </div>
                  {formData.meioPagamento === 'Boleto' && (
                    <div className="animate-in slide-in-from-top-4 duration-300">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-blue-200 uppercase ml-1">Vencimento do Boleto</label>
                        <input 
                          type="date" 
                          value={formData.dataVencimento} 
                          onChange={e => setFormData({...formData, dataVencimento: e.target.value})}
                          className="w-full px-5 py-4 bg-white/10 rounded-2xl outline-none border border-white/20 focus:border-white text-sm font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                   <p className="text-[10px] font-bold text-blue-200 uppercase italic opacity-80 flex items-center gap-2">
                     <AlertCircle size={12} /> Ao salvar, uma conta a receber será gerada automaticamente no módulo financeiro.
                   </p>
                </div>
              </section>
            </div>
          )}

          {/* Outros Formulários (Clientes, Motoristas, Veículos) */}
          {activeTab === 'clientes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Razão Social / Nome Completo" placeholder="Ex: Logística Brasil LTDA" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="CNPJ / CPF" placeholder="00.000.000/0001-00" value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
              <Input label="E-mail de Contato" type="email" placeholder="contato@empresa.com" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
              <Input label="Telefone / WhatsApp" placeholder="(00) 00000-0000" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
              <div className="md:col-span-2">
                 <Input label="Endereço Comercial" placeholder="Rua, Número, Bairro, Cidade - UF" value={formData.cidade} onChange={v => setFormData({...formData, cidade: v})} />
              </div>
            </div>
          )}

          {activeTab === 'motoristas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome do Colaborador" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="Registro CNH / Categoria" placeholder="Ex: 000000000 - Categoria E" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
              <Input label="Telefone de Emergência" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
              <Input label="CPF" value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
            </div>
          )}

          {activeTab === 'veiculos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Modelo e Marca" placeholder="Ex: Volvo FH 540" value={formData.modelo} onChange={v => setFormData({...formData, modelo: v})} />
              <Input label="Placa" placeholder="AAA-0A00" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
              <Input label="Tipo de Carroceria" placeholder="Ex: Grade Baixa / Baú" value={formData.tipo} onChange={v => setFormData({...formData, tipo: v})} />
              <Input label="Ano / Fabricação" type="number" value={formData.volume} onChange={v => setFormData({...formData, volume: v})} />
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Referência / NF" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
              <Input label="Devedor / Cliente" value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
              <Input label="Valor a Receber (R$)" type="number" value={formData.valor} onChange={v => setFormData({...formData, valor: v})} />
              <Input label="Data de Vencimento" type="date" value={formData.dataVencimento} onChange={v => setFormData({...formData, dataVencimento: v})} />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide ml-1">Status de Cobrança</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-black uppercase outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Pendente">Aguardando Pagamento</option>
                  <option value="Pago">Liquidado / Recebido</option>
                  <option value="Atrasado">Inadimplente</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-10 border-t border-slate-100">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Descartar Alterações</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95">Confirmar e Guardar Dados</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
      <Icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} /> 
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Input({ label, type = "text", value, onChange, placeholder = "" }) {
  return (
    <div className="space-y-1.5 w-full">
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
}

export default App;
