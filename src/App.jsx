import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
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
  query
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  DollarSign, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Clock,
  Package,
  MapPin, 
  X,
  Trash2,
  Briefcase,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Phone,
  Mail,
  Fingerprint,
  Map,
  Hash
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cargofy-b4435-prod';

// --- COMPONENTES DE UI ---

const Card = ({ title, value, icon: Icon, color, subValue }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between transition-all hover:shadow-md">
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-xl font-black text-slate-800 mt-1">{value}</h3>
      {subValue && <p className="text-[10px] text-slate-400 mt-1 font-medium">{subValue}</p>}
    </div>
    <div className={`p-2.5 rounded-lg ${color} shadow-sm`}>
      <Icon size={20} className="text-white" />
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto bg-white">{children}</div>
      </div>
    </div>
  );
};

// --- APLICAÇÃO PRINCIPAL ---

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [viagens, setViagens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);

  const [modalState, setModalState] = useState({ open: false, type: '', data: null });
  const [selectedPayment, setSelectedPayment] = useState('');

  // Autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { 
        console.error("Auth error details:", err); 
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listeners Firestore
  useEffect(() => {
    if (!user) return;
    
    const getColRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

    const unsubV = onSnapshot(getColRef('viagens'), 
      (s) => setViagens(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching viagens:", err)
    );
    
    const unsubC = onSnapshot(getColRef('clientes'), 
      (s) => setClientes(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching clientes:", err)
    );
    
    const unsubM = onSnapshot(getColRef('motoristas'), 
      (s) => setMotoristas(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching motoristas:", err)
    );
    
    const unsubVe = onSnapshot(getColRef('veiculos'), 
      (s) => setVeiculos(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Error fetching veiculos:", err)
    );

    return () => { unsubV(); unsubC(); unsubM(); unsubVe(); };
  }, [user]);

  // Cálculos de Performance
  const stats = useMemo(() => {
    const hoje = new Date();
    
    const emRota = viagens.filter(v => v.status === 'Em rota').length;
    const entregues = viagens.filter(v => v.status === 'Entregue').length;
    const aguardando = viagens.filter(v => v.status === 'Aguardando').length;

    const faturamento = viagens.reduce((acc, curr) => acc + (Number(curr.valorFechado) || 0), 0);
    const boletos = viagens.filter(v => v.meioPagamento === 'Boleto Bancário');
    
    const boletosPagos = boletos.filter(v => v.status === 'Entregue').length;
    const boletosAtrasados = boletos.filter(v => v.status !== 'Entregue' && v.dataVencimento && new Date(v.dataVencimento) < hoje).length;
    const boletosNoPrazo = boletos.filter(v => v.status !== 'Entregue' && (!v.dataVencimento || new Date(v.dataVencimento) >= hoje)).length;

    const valorAtrasado = boletos
      .filter(v => v.status !== 'Entregue' && v.dataVencimento && new Date(v.dataVencimento) < hoje)
      .reduce((acc, curr) => acc + (Number(curr.valorFechado) || 0), 0);

    return { 
      emRota, entregues, aguardando, total: viagens.length,
      faturamento,
      boletosTotal: boletos.length,
      boletosPagos,
      boletosAtrasados,
      boletosNoPrazo,
      valorAtrasado
    };
  }, [viagens]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target);
    const rawData = Object.fromEntries(formData.entries());
    
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', modalState.type);
      if (modalState.data?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', modalState.type, modalState.data.id), rawData);
      } else {
        await addDoc(colRef, { ...rawData, createdAt: new Date().toISOString() });
      }
      setModalState({ open: false, type: '', data: null });
    } catch (err) { 
      console.error("Error saving:", err);
    }
  };

  const handleDelete = async (col, id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="animate-pulse font-black italic text-3xl mb-4 tracking-tighter">CargoFy</div>
      <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Sincronizando...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Truck size={20} /></div>
          <h1 className="text-xl font-black tracking-tighter italic">CargoFy</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={Package} label="Fretes" active={activeTab === 'viagens'} onClick={() => setActiveTab('viagens')} />
          <div className="pt-4 pb-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Financeiro</div>
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <div className="pt-4 pb-2 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cadastros</div>
          <NavItem icon={Users} label="Clientes" active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} />
          <NavItem icon={Briefcase} label="Motoristas" active={activeTab === 'motoristas'} onClick={() => setActiveTab('motoristas')} />
          <NavItem icon={Truck} label="Veículos" active={activeTab === 'veiculos'} onClick={() => setActiveTab('veiculos')} />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{activeTab}</h2>
          <button onClick={() => { setSelectedPayment(''); setModalState({ open: true, type: 'viagens', data: null }); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
            <Plus size={16} /> Novo Lançamento
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="Cargas Entregues" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" />
                <Card title="Em Trânsito" value={stats.emRota} icon={MapPin} color="bg-blue-500" />
                <Card title="Aguardando" value={stats.aguardando} icon={Clock} color="bg-amber-500" />
                <Card title="Total de Viagens" value={stats.total} icon={BarChart3} color="bg-slate-700" />
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-blue-500" /> Últimos Fretes Lançados
                  </h4>
                  <button onClick={() => setActiveTab('viagens')} className="text-[10px] font-bold text-blue-600 hover:underline">Ver Gestão Completa</button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">NF</th>
                          <th className="px-6 py-4">Contratante</th>
                          <th className="px-6 py-4">Destinatário</th>
                          <th className="px-6 py-4">Cidade</th>
                          <th className="px-6 py-4">Peso (kg)</th>
                          <th className="px-6 py-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {viagens.slice(0, 6).map(v => (
                          <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700">{v.notaFiscal}</td>
                            <td className="px-6 py-4 text-slate-500 font-medium">{v.contratante}</td>
                            <td className="px-6 py-4 text-slate-500">{v.destinatario}</td>
                            <td className="px-6 py-4 text-slate-500">{v.cidade}</td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{Number(v.peso || 0).toLocaleString('pt-BR')}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${v.status === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : v.status === 'Em rota' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                {v.status || 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" /> Performance Financeira (Boletos)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card title="Boletos Pagos" value={stats.boletosPagos} icon={CheckCircle2} color="bg-emerald-600" />
                  <Card title="Boletos no Prazo" value={stats.boletosNoPrazo} icon={Clock} color="bg-indigo-500" />
                  <Card title="Atrasados" value={stats.boletosAtrasados} icon={AlertTriangle} color="bg-red-500" subValue={`Dívida: R$ ${stats.valorAtrasado.toLocaleString('pt-BR')}`} />
                  <Card title="Total Boletos" value={stats.boletosTotal} icon={CreditCard} color="bg-slate-800" />
                </div>
              </section>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="flex-1 space-y-1">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento Consolidado</p>
                   <h2 className="text-4xl font-black text-slate-900 tracking-tighter">R$ {stats.faturamento.toLocaleString('pt-BR')}</h2>
                 </div>
                 <div className="flex gap-12 items-center">
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Fretes Totais</p>
                      <p className="text-xl font-black text-slate-700">{stats.total}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Média p/ Frete</p>
                      <p className="text-xl font-black text-blue-600">R$ {stats.total > 0 ? (stats.faturamento / stats.total).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : 0}</p>
                    </div>
                    <button onClick={() => setActiveTab('financeiro')} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-black shadow-xl shadow-slate-200 transition-all">Relatório Detalhado</button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'viagens' && <TableLayout title="Gestão de Fretes" data={viagens} col="viagens" onEdit={(d) => { setSelectedPayment(d.meioPagamento || ''); setModalState({ open: true, type: 'viagens', data: d }); }} onDelete={handleDelete} />}
          {activeTab === 'financeiro' && <FinanceiroView stats={stats} viagens={viagens} />}
          
          {activeTab === 'clientes' && <TableLayout title="Clientes" data={clientes} col="clientes" onEdit={(d) => setModalState({ open: true, type: 'clientes', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'clientes', data: null })} />}
          {activeTab === 'motoristas' && <TableLayout title="Motoristas" data={motoristas} col="motoristas" onEdit={(d) => setModalState({ open: true, type: 'motoristas', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'motoristas', data: null })} />}
          {activeTab === 'veiculos' && <TableLayout title="Veículos" data={veiculos} col="veiculos" onEdit={(d) => setModalState({ open: true, type: 'veiculos', data: d })} onDelete={handleDelete} onAdd={() => setModalState({ open: true, type: 'veiculos', data: null })} />}
        </div>
      </main>

      {/* Modal Lançamentos e Cadastros Completos */}
      <Modal 
        isOpen={modalState.open} 
        onClose={() => setModalState({ open: false, type: '', data: null })} 
        title={
          modalState.type === 'viagens' ? "Lançamento de Viagem" : 
          modalState.type === 'clientes' ? "Cadastro de Cliente" :
          modalState.type === 'motoristas' ? "Cadastro de Motorista" : "Cadastro de Veículo"
        }
      >
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* FORMULÁRIO DE VIAGENS */}
          {modalState.type === 'viagens' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <InputField label="Nº Nota Fiscal" name="notaFiscal" defaultValue={modalState.data?.notaFiscal} required />
                <InputField label="Valor NF" name="valorNF" type="number" defaultValue={modalState.data?.valorNF} required />
                <InputField label="Status" name="status" type="select" options={['Aguardando', 'Em rota', 'Entregue', 'Cancelada']} defaultValue={modalState.data?.status || 'Aguardando'} />
                <div className="md:col-span-3">
                  <InputField label="Chave de Acesso (44 carac.)" name="chaveNF" defaultValue={modalState.data?.chaveNF} maxLength={44} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-xl border-slate-200">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 border-b pb-1 uppercase tracking-widest">Rotas</h5>
                  <InputField label="Contratante" name="contratante" type="select" options={clientes.map(c => c.razaoSocial || c.nome)} defaultValue={modalState.data?.contratante} required />
                  <InputField label="Destinatário" name="destinatario" defaultValue={modalState.data?.destinatario} required />
                  <InputField label="Cidade Destino" name="cidade" defaultValue={modalState.data?.cidade} required />
                </div>
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-slate-400 border-b pb-1 uppercase tracking-widest">Operação</h5>
                  <InputField label="Veículo" name="veiculo" type="select" options={veiculos.map(v => `${v.placa} - ${v.tipo}`)} defaultValue={modalState.data?.veiculo} />
                  <InputField label="Motorista" name="motorista" type="select" options={motoristas.map(m => m.nome)} defaultValue={modalState.data?.motorista} />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Volume" name="volume" type="number" defaultValue={modalState.data?.volume} />
                    <InputField label="Peso (Kg)" name="peso" type="number" defaultValue={modalState.data?.peso} />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField label="Valor do Frete" name="valorFechado" type="number" defaultValue={modalState.data?.valorFechado} required />
                  <InputField label="Adiantamento" name="valorPago" type="number" defaultValue={modalState.data?.valorPago} />
                  <InputField label="Pagamento" name="meioPagamento" type="select" options={['PIX', 'Boleto Bancário', 'Dinheiro']} defaultValue={modalState.data?.meioPagamento} onChange={(e) => setSelectedPayment(e.target.value)} />
                </div>
                {(selectedPayment === 'Boleto Bancário' || modalState.data?.meioPagamento === 'Boleto Bancário') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <InputField label="Número do Boleto" name="numeroBoleto" defaultValue={modalState.data?.numeroBoleto} required />
                    <InputField label="Data de Vencimento" name="dataVencimento" type="date" defaultValue={modalState.data?.dataVencimento} required />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE CLIENTES COMPLETOS */}
          {modalState.type === 'clientes' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest"><Users size={14}/> Dados Corporativos</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Razão Social" name="razaoSocial" defaultValue={modalState.data?.razaoSocial} required />
                  <InputField label="Nome Fantasia" name="nome" defaultValue={modalState.data?.nome} required />
                  <InputField label="CNPJ / CPF" name="documento" defaultValue={modalState.data?.documento} required />
                  <InputField label="Inscrição Estadual" name="ie" defaultValue={modalState.data?.ie} />
                </div>
              </section>
              
              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest"><Map size={14}/> Endereço</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <InputField label="Logradouro" name="endereco" defaultValue={modalState.data?.endereco} />
                  </div>
                  <InputField label="Número" name="numero" defaultValue={modalState.data?.numero} />
                  <InputField label="Bairro" name="bairro" defaultValue={modalState.data?.bairro} />
                  <InputField label="Cidade" name="cidade" defaultValue={modalState.data?.cidade} />
                  <InputField label="UF" name="uf" defaultValue={modalState.data?.uf} maxLength={2} />
                </div>
              </section>

              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest"><Phone size={14}/> Contato</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Telefone / WhatsApp" name="telefone" defaultValue={modalState.data?.telefone} />
                  <InputField label="E-mail Financeiro" name="email" type="email" defaultValue={modalState.data?.email} />
                </div>
              </section>
            </div>
          )}

          {/* FORMULÁRIO DE MOTORISTAS COMPLETOS */}
          {modalState.type === 'motoristas' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest"><Briefcase size={14}/> Dados do Condutor</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Nome Completo" name="nome" defaultValue={modalState.data?.nome} required />
                  <InputField label="CPF" name="cpf" defaultValue={modalState.data?.cpf} required />
                  <InputField label="RG" name="rg" defaultValue={modalState.data?.rg} />
                  <InputField label="Data de Nascimento" name="dataNascimento" type="date" defaultValue={modalState.data?.dataNascimento} />
                </div>
              </section>

              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest"><Fingerprint size={14}/> Habilitação (CNH)</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Número CNH" name="cnh" defaultValue={modalState.data?.cnh} required />
                  <InputField label="Categoria" name="cnhCategoria" defaultValue={modalState.data?.cnhCategoria} maxLength={5} placeholder="Ex: E" />
                  <InputField label="Validade CNH" name="cnhValidade" type="date" defaultValue={modalState.data?.cnhValidade} required />
                </div>
              </section>

              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-widest"><Phone size={14}/> Contato e Emergência</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Celular Principal" name="telefone" defaultValue={modalState.data?.telefone} required />
                  <InputField label="Contato de Emergência" name="emergencia" defaultValue={modalState.data?.emergencia} placeholder="Nome - Fone" />
                </div>
              </section>
            </div>
          )}

          {/* FORMULÁRIO DE VEÍCULOS COMPLETOS */}
          {modalState.type === 'veiculos' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest"><Truck size={14}/> Identificação</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Placa" name="placa" defaultValue={modalState.data?.placa} required placeholder="ABC1D23" />
                  <InputField label="Frota/Prefixo" name="prefixo" defaultValue={modalState.data?.prefixo} />
                  <InputField label="Tipo de Veículo" name="tipo" type="select" options={['Truck', 'Carreta', 'VUC', 'Fiorino', 'Bitrem']} defaultValue={modalState.data?.tipo} required />
                </div>
              </section>

              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest"><Hash size={14}/> Especificações Técnicas</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Marca/Modelo" name="modelo" defaultValue={modalState.data?.modelo} placeholder="Ex: Scania R450" />
                  <InputField label="Ano Fab/Mod" name="ano" defaultValue={modalState.data?.ano} />
                  <InputField label="Cor" name="cor" defaultValue={modalState.data?.cor} />
                  <InputField label="Capacidade Carga (Kg)" name="capacidadeKg" type="number" defaultValue={modalState.data?.capacidadeKg} />
                  <InputField label="Volume (m³)" name="capacidadeM3" type="number" defaultValue={modalState.data?.capacidadeM3} />
                  <InputField label="RENAVAM" name="renavam" defaultValue={modalState.data?.renavam} />
                </div>
              </section>

              <section className="space-y-4">
                <h5 className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-widest"><CreditCard size={14}/> Registro Nacional</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="RNTRC (ANTT)" name="rntrc" defaultValue={modalState.data?.rntrc} />
                  <InputField label="Vencimento Seguro" name="seguroVencimento" type="date" defaultValue={modalState.data?.seguroVencimento} />
                </div>
              </section>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button type="button" onClick={() => setModalState({ open: false, type: '', data: null })} className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancelar</button>
            <button type="submit" className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center gap-2">
              <Plus size={16} /> Salvar Registro
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={16} /> <span className="text-xs font-bold tracking-tight">{label}</span>
    </button>
  );
}

function TableLayout({ title, data, col, onEdit, onDelete, onAdd }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">{title}</h3>
        {onAdd && <button onClick={onAdd} className="bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-lg hover:bg-black transition-all">+ Novo Cadastro</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest">
            <tr>
              <th className="px-6 py-4 text-left">Identificação</th>
              <th className="px-6 py-4 text-left">Detalhes / Documento</th>
              <th className="px-6 py-4 text-left">Contato / Info</th>
              <th className="px-6 py-4 text-right">Gerenciar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-300 italic">Nenhum registro encontrado.</td></tr>
            ) : data.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800 uppercase">{item.nome || item.razaoSocial || item.placa}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.documento || item.cpf || item.tipo}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-600 text-xs font-medium">{item.ie || item.cnh || item.modelo || '-'}</div>
                  <div className="text-[9px] text-slate-400 uppercase">{item.cidade || item.cnhCategoria || item.prefixo}</div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                     {item.telefone && <><Phone size={10} className="text-slate-400" /> {item.telefone}</>}
                   </div>
                   <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.email || item.emergencia || item.rntrc}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><ChevronRight size={16} /></button>
                    <button onClick={() => onDelete(col, item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinanceiroView({ stats, viagens }) {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <section className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-500" /> Fluxo de Cobrança e Boletos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Pagos" value={stats.boletosPagos} icon={CheckCircle2} color="bg-emerald-600" />
          <Card title="A Vencer" value={stats.boletosNoPrazo} icon={Clock} color="bg-indigo-600" />
          <Card title="Em Atraso" value={stats.boletosAtrasados} icon={AlertTriangle} color="bg-red-500" />
          <Card title="Total Cobranças" value={stats.boletosTotal} icon={CreditCard} color="bg-slate-800" />
        </div>
      </section>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 font-bold text-slate-800 text-xs uppercase tracking-widest">
          Extrato Detalhado de Cobranças
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Boleto/NF</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Meio</th>
                <th className="px-6 py-4">Vencimento</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {viagens.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-slate-700">{v.numeroBoleto || v.notaFiscal}</td>
                  <td className="px-6 py-4 text-slate-500">{v.contratante}</td>
                  <td className="px-6 py-4 text-slate-400 text-[10px] font-bold">{v.meioPagamento}</td>
                  <td className="px-6 py-4 text-slate-500">{v.dataVencimento ? new Date(v.dataVencimento).toLocaleDateString('pt-BR') : '-'}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">R$ {Number(v.valorFechado || 0).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, type = "text", options = [], defaultValue, required = false, maxLength, onChange, placeholder }) {
  const baseClass = "w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm mt-1 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300";
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
      {type === 'select' ? (
        <select name={name} defaultValue={defaultValue} className={baseClass} required={required} onChange={onChange}>
          <option value="">Selecione...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} name={name} defaultValue={defaultValue} placeholder={placeholder} className={baseClass} required={required} maxLength={maxLength} onChange={onChange} />
      )}
    </div>
  );
}
