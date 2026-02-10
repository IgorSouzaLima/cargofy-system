import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, Lock, Mail, Clock, FileText, Search, Calendar, Layers, 
  CheckCircle2, AlertCircle, Edit3, Download, ArrowRight, Camera, Paperclip, ExternalLink, Building2, Eye, Upload
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
  const [dashboardCargaFilter, setDashboardCargaFilter] = useState('');
  const [dashboardBoletoFilter, setDashboardBoletoFilter] = useState('');
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchNF, setSearchNF] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [reportEmpresa, setReportEmpresa] = useState('Todas');
  const [reportInicio, setReportInicio] = useState('');
  const [reportFim, setReportFim] = useState('');
  const [reportNumeroCarga, setReportNumeroCarga] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  const [formData, setFormData] = useState({
    numeroNF: '', 
    numeroCarga: '', 
    numeroCTe: '', 
    dataCTe: '', 
    dataNF: '', 
    dataSaida: '', 
    dataEntrega: '', // Novo campo
    contratante: '', // Novo campo
    destinatario: '', // Novo campo
    cidade: '', 
    volume: '', // Novo campo
    peso: '', // Novo campo
    valorNF: '', // Novo campo
    chaveID: '', 
    status: 'Pendente', 
    valorFrete: '', 
    valorDistribuicao: '', 
    lucro: '', 
    metodoPagamento: '', 
    numeroBoleto: '', 
    dataVencimentoBoleto: '', 
    motorista: '', 
    veiculo: '', 
    placa: '', 
    urlComprovante: '', 
    boleto: '', 
    vencimento: '', 
    statusFinanceiro: 'Pendente', 
    nome: '', 
    email: '', 
    telefone: '', 
    modelo: '', 
    tipo: '',
    observacao: ''
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

  const cargaStatusMap = useMemo(() => {
    const agrupado = {};
    viagens.forEach(v => {
      const chave = (v.numeroCarga || '').trim();
      if (!chave) return;
      if (!agrupado[chave]) agrupado[chave] = [];
      agrupado[chave].push(v);
    });

    const mapa = {};
    Object.entries(agrupado).forEach(([chave, itens]) => {
      mapa[chave] = {
        total: itens.length,
        entregues: itens.filter(i => i.status === 'Entregue').length,
        allEntregues: itens.every(i => i.status === 'Entregue')
      };
    });
    return mapa;
  }, [viagens]);

  const mapaCTePorReferencia = useMemo(() => {
    const mapa = {};
    viagens.forEach(v => {
      const cte = (v.numeroCTe || '').trim();
      if (!cte) return;
      const nf = (v.numeroNF || '').trim();
      const carga = (v.numeroCarga || '').trim();
      if (nf && !mapa[`nf:${nf}`]) mapa[`nf:${nf}`] = cte;
      if (carga && !mapa[`carga:${carga}`]) mapa[`carga:${carga}`] = cte;
    });
    return mapa;
  }, [viagens]);

  const getNumeroCTeResolvido = (item) => {
    const cteAtual = (item?.numeroCTe || '').trim();
    if (cteAtual) return cteAtual;

    const nf = (item?.numeroNF || '').trim();
    if (nf && mapaCTePorReferencia[`nf:${nf}`]) return mapaCTePorReferencia[`nf:${nf}`];

    const carga = (item?.numeroCarga || '').trim();
    if (carga && mapaCTePorReferencia[`carga:${carga}`]) return mapaCTePorReferencia[`carga:${carga}`];

    return '';
  };

  const getStatusViagem = (viagem) => {
    const chave = (viagem.numeroCarga || '').trim();
    if (chave && cargaStatusMap[chave]) {
      return cargaStatusMap[chave].allEntregues ? 'Entregue' : 'Em rota';
    }
    return viagem.status || 'Pendente';
  };


  const dashboardViagensBase = useMemo(() => {
    if (!monthFilter) return viagens;
    return viagens.filter(v => {
      const dataBase = v.dataSaida || v.dataNF || v.dataEntrega || v.dataCTe;
      return (dataBase || '').slice(0, 7) === monthFilter;
    });
  }, [viagens, monthFilter]);

  const stats = useMemo(() => {
    const pendentes = dashboardViagensBase.filter(v => getStatusViagem(v) === 'Pendente').length;
    const emRota = dashboardViagensBase.filter(v => getStatusViagem(v) === 'Em rota').length;
    const entregues = dashboardViagensBase.filter(v => getStatusViagem(v) === 'Entregue').length;
    return { pendentes, emRota, entregues, total: dashboardViagensBase.length };
  }, [dashboardViagensBase, getStatusViagem]);

  const financeiroResumo = useMemo(() => {
    const faturou = viagens.reduce((acc, curr) => acc + (parseFloat(curr.valorFrete) || 0), 0);
    const gastouDistribuicao = viagens.reduce((acc, curr) => acc + (parseFloat(curr.valorDistribuicao) || 0), 0);
    const lucroTotal = faturou - gastouDistribuicao;
    return { faturou, gastouDistribuicao, lucroTotal };
  }, [viagens]);

  const normalizarStatusFinanceiro = (status) => (status || 'pendente').trim().toLowerCase();


  const getStatusFinanceiro = (item) => {
    const statusAtual = normalizarStatusFinanceiro(item.statusFinanceiro);
    if (statusAtual === 'pago') return 'Pago';

    const dataVencimento = item.dataVencimentoBoleto || item.vencimento;
    if (dataVencimento) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const venc = new Date(`${dataVencimento}T12:00:00`);
      if (!Number.isNaN(venc.getTime()) && venc < hoje) return 'Vencido';
    }

    return 'Pendente';
  };

  const dashboardFinanceiroBase = useMemo(() => {
    if (!monthFilter) return financeiro;
    return financeiro.filter(item => {
      const dataBase = item.dataVencimentoBoleto || item.vencimento;
      return (dataBase || '').slice(0, 7) === monthFilter;
    });
  }, [financeiro, monthFilter]);

  const boletoStats = useMemo(() => {
    const boletosGerados = dashboardFinanceiroBase.length;
    const boletosPagos = dashboardFinanceiroBase.filter(f => getStatusFinanceiro(f) === 'Pago').length;
    const boletosAtrasados = dashboardFinanceiroBase.filter(f => getStatusFinanceiro(f) === 'Vencido').length;
    const boletosPendentes = dashboardFinanceiroBase.filter(f => getStatusFinanceiro(f) === 'Pendente').length;

    return { boletosGerados, boletosPendentes, boletosAtrasados, boletosPagos };
  }, [dashboardFinanceiroBase]);

  const empresasRelatorio = useMemo(() => {
    const empresas = [...new Set(viagens.map(v => v.contratante).filter(Boolean))];
    return ['Todas', ...empresas];
  }, [viagens]);

  const relatorioData = useMemo(() => {
    return viagens.filter(v => {
      if (reportEmpresa !== 'Todas' && v.contratante !== reportEmpresa) return false;
      if (reportNumeroCarga && (v.numeroCarga || '').trim() !== reportNumeroCarga.trim()) return false;
      const dataBase = v.dataSaida || v.dataNF || v.dataEntrega;
      if (!dataBase) return !reportInicio && !reportFim;
      const data = new Date(`${dataBase}T12:00:00`);
      if (Number.isNaN(data.getTime())) return false;
      if (reportInicio) {
        const ini = new Date(`${reportInicio}T00:00:00`);
        if (data < ini) return false;
      }
      if (reportFim) {
        const fim = new Date(`${reportFim}T23:59:59`);
        if (data > fim) return false;
      }
      return true;
    });
  }, [viagens, reportEmpresa, reportNumeroCarga, reportInicio, reportFim]);

  const resumoRelatorio = useMemo(() => {
    const faturou = relatorioData.reduce((acc, curr) => acc + (parseFloat(curr.valorFrete) || 0), 0);
    const distribuicao = relatorioData.reduce((acc, curr) => acc + (parseFloat(curr.valorDistribuicao) || 0), 0);
    return { faturou, distribuicao, lucro: faturou - distribuicao };
  }, [relatorioData]);

  const relatorioPorCarga = !!reportNumeroCarga.trim();

  const downloadRelatorioCSV = () => {
    const header = relatorioPorCarga
      ? ['Carga', 'NF', 'CT-e', 'Data CT-e', 'Empresa', 'Data', 'Frete']
      : ['Carga', 'NF', 'CT-e', 'Data CT-e', 'Empresa', 'Data', 'Frete', 'Distribuicao', 'Lucro'];

    const rows = relatorioData.map(item => {
      const base = [
        item.numeroCarga || '',
        item.numeroNF || '',
        item.numeroCTe || '',
        item.dataCTe || '',
        item.contratante || '',
        item.dataSaida || item.dataNF || item.dataEntrega || '',
        (parseFloat(item.valorFrete) || 0).toFixed(2)
      ];

      if (relatorioPorCarga) return base;

      return [
        ...base,
        (parseFloat(item.valorDistribuicao) || 0).toFixed(2),
        ((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toFixed(2)
      ];
    });

    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replaceAll('\"', '\"\"')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_cargofy.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const processarFotoComprovante = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
      img.onload = () => {
        const maxW = 1280;
        const maxH = 1280;
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Falha ao processar imagem.'));
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const gerarRelatorioPDF = () => {
    const janela = window.open('', '_blank');
    if (!janela) {
      alert('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-up está ativo.');
      return;
    }

    const logoUrl = `${window.location.origin}/logo-cargofy.svg`;

    const linhas = relatorioData.map(item => {
      const data = item.dataSaida || item.dataNF || item.dataEntrega;
      const dataFmt = data ? new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR') : '---';
      const frete = (parseFloat(item.valorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const dist = (parseFloat(item.valorDistribuicao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const lucro = ((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      return relatorioPorCarga
        ? `<tr><td>${item.numeroCarga || '---'}</td><td>${item.numeroNF || '---'}</td><td>${item.numeroCTe || '---'}</td><td>${item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td><td>${item.contratante || 'Sem empresa'}</td><td>${dataFmt}</td><td>R$ ${frete}</td></tr>`
        : `<tr><td>${item.numeroCarga || '---'}</td><td>${item.numeroNF || '---'}</td><td>${item.numeroCTe || '---'}</td><td>${item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td><td>${item.contratante || 'Sem empresa'}</td><td>${dataFmt}</td><td>R$ ${frete}</td><td>R$ ${dist}</td><td>R$ ${lucro}</td></tr>`;
    }).join('');

    janela.document.write(`
      <html>
        <head>
          <title>Relatório CargoFy</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
            .logo { width: 44px; height: 44px; object-fit: contain; }
            h1 { margin: 0; font-size: 20px; }
            p { margin: 4px 0 16px; font-size: 12px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f1f5f9; text-transform: uppercase; font-size: 11px; }
            .resumo { display: flex; gap: 16px; margin: 12px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header"><img src="${logoUrl}" alt="Logo CargoFy" class="logo" /><h1>Relatório CargoFy</h1></div>
          <p>Empresa: ${reportEmpresa} | Carga: ${reportNumeroCarga || 'Todas'} | Período: ${reportInicio || 'Início'} até ${reportFim || 'Hoje'} | Registros: ${relatorioData.length}</p>
          <div class="resumo">
            <span>Faturamento: R$ ${resumoRelatorio.faturou.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Distribuição: R$ ${resumoRelatorio.distribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Lucro: R$ ${resumoRelatorio.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <table>
            <thead>
              ${relatorioPorCarga ? '<tr><th>Carga</th><th>NF</th><th>CT-e</th><th>Data CT-e</th><th>Empresa</th><th>Data</th><th>Frete</th></tr>' : '<tr><th>Carga</th><th>NF</th><th>CT-e</th><th>Data CT-e</th><th>Empresa</th><th>Data</th><th>Frete</th><th>Distribuição</th><th>Lucro</th></tr>'}
            </thead>
            <tbody>${linhas || `<tr><td colspan="${relatorioPorCarga ? 7 : 9}">Sem registros para o filtro.</td></tr>`}</tbody>
          </table>
        </body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    janela.print();
  };

  const filteredData = useMemo(() => {
    let list = [];
    switch (activeTab) {
      case 'dashboard':
      case 'viagens':
        list = statusFilter === 'Todos' ? viagens : viagens.filter(v => getStatusViagem(v) === statusFilter);
        break;
      case 'financeiro': list = financeiro; break;
      case 'relatorios': list = viagens; break;
      case 'clientes': list = clientes; break;
      case 'motoristas': list = motoristas; break;
      case 'veiculos': list = veiculos; break;
      default: list = [];
    }

    if ((activeTab === 'dashboard' || activeTab === 'viagens' || activeTab === 'financeiro') && monthFilter) {
      list = list.filter(item => {
        const dataBase = activeTab === 'financeiro'
          ? (item.dataVencimentoBoleto || item.vencimento)
          : (item.dataSaida || item.dataNF || item.dataEntrega || item.dataCTe);
        return (dataBase || '').slice(0, 7) === monthFilter;
      });
    }

    if (!searchNF) return list;
    const term = searchNF.toLowerCase();
    return list.filter(item =>
      (item.numeroNF?.toLowerCase().includes(term)) ||
      (item.numeroCTe?.toLowerCase().includes(term)) ||
      (item.numeroCarga?.toLowerCase().includes(term)) ||
      (item.contratante?.toLowerCase().includes(term)) ||
      (item.nome?.toLowerCase().includes(term)) ||
      (item.placa?.toLowerCase().includes(term)) ||
      (item.cidade?.toLowerCase().includes(term)) ||
      (item.motorista?.toLowerCase().includes(term))
    );
  }, [activeTab, statusFilter, viagens, financeiro, clientes, motoristas, veiculos, searchNF, monthFilter]);

  const dashboardViagensFiltradas = useMemo(() => {
    if (!dashboardCargaFilter) return [];
    const termo = (searchNF || '').toLowerCase();
    return dashboardViagensBase
      .filter(item => getStatusViagem(item) === dashboardCargaFilter)
      .filter(item => {
        if (!termo) return true;
        return (
          (item.numeroNF?.toLowerCase().includes(termo)) ||
          (item.numeroCTe?.toLowerCase().includes(termo)) ||
          (item.numeroCarga?.toLowerCase().includes(termo)) ||
          (item.contratante?.toLowerCase().includes(termo)) ||
          (item.cidade?.toLowerCase().includes(termo)) ||
          (item.motorista?.toLowerCase().includes(termo))
        );
      });
  }, [dashboardViagensBase, dashboardCargaFilter, searchNF, getStatusViagem]);

  const dashboardBoletosFiltrados = useMemo(() => {
    if (!dashboardBoletoFilter) return [];
    const termo = (searchNF || '').toLowerCase();
    const base = dashboardBoletoFilter === 'Todos'
      ? dashboardFinanceiroBase
      : dashboardFinanceiroBase.filter(item => getStatusFinanceiro(item) === dashboardBoletoFilter);

    if (!termo) return base;
    return base.filter(item => (
      (item.numeroNF?.toLowerCase().includes(termo)) ||
      (item.numeroCarga?.toLowerCase().includes(termo)) ||
      (item.contratante?.toLowerCase().includes(termo)) ||
      (item.cidade?.toLowerCase().includes(termo)) ||
      (item.motorista?.toLowerCase().includes(termo))
    ));
  }, [dashboardFinanceiroBase, dashboardBoletoFilter, searchNF]);


  const proximosBoletos = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const itensComData = dashboardFinanceiroBase
      .map(item => {
        const dataVencimento = item.dataVencimentoBoleto || item.vencimento;
        const dataObj = dataVencimento ? new Date(`${dataVencimento}T12:00:00`) : null;
        const numeroCTeResolvido = getNumeroCTeResolvido(item);
        return { ...item, dataVencimento, dataObj, numeroCTeResolvido };
      })
      .filter(item => item.dataObj && !Number.isNaN(item.dataObj.getTime()));

    const futuros = itensComData.filter(item => item.dataObj >= hoje);
    const baseOrdenada = (futuros.length ? futuros : itensComData)
      .sort((a, b) => a.dataObj - b.dataObj)
      .slice(0, 10);

    return baseOrdenada;
  }, [dashboardFinanceiroBase, getNumeroCTeResolvido]);

  const financeiroAgrupadoPorCarga = useMemo(() => {
    if (activeTab !== 'financeiro') return [];
    const grupos = {};

    filteredData.forEach(item => {
      const chave = (item.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item);
    });

    return Object.entries(grupos)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
      .map(([numeroCarga, itens]) => ({
        numeroCarga,
        itens: itens.sort((a, b) => {
          const da = (a.dataVencimentoBoleto || a.vencimento || '9999-12-31');
          const db = (b.dataVencimentoBoleto || b.vencimento || '9999-12-31');
          return da.localeCompare(db);
        })
      }));
  }, [activeTab, filteredData]);

  const viagensAgrupadasPorCarga = useMemo(() => {
    if (activeTab !== 'viagens') return [];
    const grupos = {};
    filteredData.forEach(item => {
      const chave = (item.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item);
    });

    return Object.entries(grupos)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
      .map(([numeroCarga, itens]) => ({
        numeroCarga,
        itens: itens.sort((a, b) => (a.numeroNF || '').localeCompare(b.numeroNF || '', 'pt-BR', { numeric: true }))
      }));
  }, [activeTab, filteredData]);

  const handleOpenEdit = (item) => {
    setFormData({
      ...item,
      boleto: item.boleto || item.urlBoleto || item.urlComprovante || '',
      statusFinanceiro: item.statusFinanceiro || 'Pendente',
      dataVencimentoBoleto: item.dataVencimentoBoleto || item.diaVencimento || ''
    });
    setEditingId(item.id);
    setModalOpen(true);
  };

  const syncFinanceiroPorViagem = async (viagemData) => {
    const numeroNF = (viagemData.numeroNF || '').trim();
    const numeroCarga = (viagemData.numeroCarga || '').trim();
    if (!numeroNF && !numeroCarga) return;

    const registroExistente = financeiro.find(f =>
      (numeroNF && (f.numeroNF || '').trim() === numeroNF) ||
      (numeroCarga && (f.numeroCarga || '').trim() === numeroCarga && (f.contratante || '') === (viagemData.contratante || ''))
    );

    const statusInformado = (viagemData.statusFinanceiro || '').trim();
    const payloadFinanceiro = {
      numeroNF: viagemData.numeroNF || '',
      numeroCarga: viagemData.numeroCarga || '',
      numeroCTe: viagemData.numeroCTe || '',
      contratante: viagemData.contratante || '',
      destinatario: viagemData.destinatario || '',
      cidade: viagemData.cidade || '',
      motorista: viagemData.motorista || '',
      status: getStatusViagem(viagemData),
      valorFrete: viagemData.valorFrete || '',
      valorDistribuicao: viagemData.valorDistribuicao || '',
      lucro: ((parseFloat(viagemData.valorFrete) || 0) - (parseFloat(viagemData.valorDistribuicao) || 0)).toFixed(2),
      statusFinanceiro: registroExistente?.id
        ? (statusInformado && statusInformado.toLowerCase() !== 'pendente' ? statusInformado : (registroExistente.statusFinanceiro || 'Pendente'))
        : (statusInformado || 'Pendente'),
      metodoPagamento: viagemData.metodoPagamento || '',
      numeroBoleto: viagemData.numeroBoleto || '',
      dataVencimentoBoleto: viagemData.dataVencimentoBoleto || '',
      vencimento: viagemData.dataVencimentoBoleto || viagemData.vencimento || '',
      boleto: viagemData.boleto || viagemData.urlComprovante || '',
      urlBoleto: viagemData.boleto || viagemData.urlComprovante || '',
      urlComprovante: viagemData.boleto || viagemData.urlComprovante || ''
    };

    if (registroExistente?.id) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financeiro', registroExistente.id), payloadFinanceiro);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financeiro'), {
        ...payloadFinanceiro,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const colName = (activeTab === 'dashboard' || activeTab === 'viagens') ? 'viagens' : activeTab;

    if (colName === 'viagens' && (!formData.numeroCTe || !formData.dataCTe)) {
      alert('Informe o número e a data do CT-e para cadastrar a carga.');
      return;
    }

    if (colName === 'viagens' && formData.metodoPagamento === 'Boleto' && (!formData.numeroBoleto || !formData.dataVencimentoBoleto)) {
      alert('Para pagamento via boleto, informe o número e a data de vencimento.');
      return;
    }

    const payload = colName === 'financeiro'
      ? {
          ...formData,
          lucro: ((parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0)).toFixed(2),
          urlBoleto: formData.boleto || '',
          urlComprovante: formData.boleto || formData.urlComprovante || ''
        }
      : colName === 'viagens'
        ? {
            ...formData,
            numeroBoleto: formData.metodoPagamento === 'Boleto' ? formData.numeroBoleto : '',
            dataVencimentoBoleto: formData.metodoPagamento === 'Boleto' ? formData.dataVencimentoBoleto : '',
            lucro: ((parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0)).toFixed(2)
          }
        : formData;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), payload);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
          ...payload, userId: user.uid, createdAt: serverTimestamp()
        });
      }

      if (colName === 'viagens') {
        await syncFinanceiroPorViagem(payload);
      }

      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setFormData({ 
      numeroNF: '', numeroCarga: '', numeroCTe: '', dataCTe: '', dataNF: '', dataSaida: '', dataEntrega: '', 
      contratante: '', destinatario: '', cidade: '', 
      volume: '', peso: '', valorNF: '', chaveID: '', status: 'Pendente', 
      valorFrete: '', valorDistribuicao: '', lucro: '', metodoPagamento: '', numeroBoleto: '', dataVencimentoBoleto: '', motorista: '', veiculo: '', placa: '', urlComprovante: '', boleto: '', vencimento: '', 
      statusFinanceiro: 'Pendente', nome: '', email: '', telefone: '', 
      modelo: '', tipo: '', observacao: ''
    });
  };

  const lucroViagem = (parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0);

  const handleOpenSheetUrl = () => {
    const input = window.prompt('Cole o link da planilha para abrir no Sheets:');
    const url = (input || '').trim();
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const novoRegistroLabel = activeTab === 'clientes'
    ? 'Adicionar Cliente'
    : activeTab === 'motoristas'
      ? 'Adicionar Motorista'
      : activeTab === 'veiculos'
        ? 'Adicionar Veículo'
        : 'Novo Registro';

  if (!user) return <Login />;

  return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-900 font-sans">
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col p-6 shadow-2xl shrink-0">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => {setActiveTab('dashboard'); setStatusFilter('Todos'); setDashboardCargaFilter(''); setDashboardBoletoFilter('');}}>
          <Truck className="text-blue-500" size={28} />
          <h1 className="text-xl font-black tracking-tighter uppercase">CargoFy</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem icon={LayoutDashboard} label="Painel" active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setStatusFilter('Todos'); setDashboardCargaFilter(''); setDashboardBoletoFilter('');}} />
          <NavItem icon={Package} label="Viagens" active={activeTab === 'viagens'} onClick={() => {setActiveTab('viagens'); setStatusFilter('Todos');}} />
          <NavItem icon={DollarSign} label="Financeiro" active={activeTab === 'financeiro'} onClick={() => setActiveTab('financeiro')} />
          <NavItem icon={FileText} label="Relatórios" active={activeTab === 'relatorios'} onClick={() => setActiveTab('relatorios')} />
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
                placeholder="Pesquisar por NF, CT-e, Contratante ou Cidade..." 
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
            {(activeTab === 'dashboard' || activeTab === 'viagens' || activeTab === 'financeiro') && (
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase">
                <Calendar size={14} />
                <span>Mês</span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-transparent outline-none text-[11px] font-bold"
                />
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'dashboard' && (
              <button
                type="button"
                onClick={handleOpenSheetUrl}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Upload size={14} /> Upload Sheets
              </button>
            )}
            {(activeTab === 'dashboard' || activeTab === 'viagens' || activeTab === 'clientes' || activeTab === 'motoristas' || activeTab === 'veiculos') && (
              <button onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 transition-all">
                <Plus size={16} /> {novoRegistroLabel}
              </button>
            )}
          </div>
        </header>

        <div className="p-8 overflow-y-auto">

          {activeTab === 'viagens' && (
            <div className="space-y-4 mt-8">
              {viagensAgrupadasPorCarga.map(grupo => (
                <div key={`grupo-${grupo.numeroCarga}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga}</h3>
                    <span className="text-[10px] font-bold text-slate-400">{grupo.itens.length} NFs</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {grupo.itens.map(item => (
                      <div key={`item-${item.id}`} className="p-3 rounded-xl border border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-800">NF {item.numeroNF || '---'} · CT-e {getNumeroCTeResolvido(item) || '---'}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{item.contratante || 'Sem contratante'} · Destino: {item.destinatario || item.cidade || 'Sem destino'} · Motorista: {item.motorista || 'Sem motorista'}</p>
                        </div>
                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusViagem(item) === 'Em rota' ? 'bg-blue-100 text-blue-600' : getStatusViagem(item) === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {getStatusViagem(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card title="Cargas Pendentes" value={stats.pendentes} icon={Clock} color="bg-amber-500" active={dashboardCargaFilter === 'Pendente'} onClick={() => setDashboardCargaFilter(prev => prev === 'Pendente' ? '' : 'Pendente')} />
              <Card title="Cargas em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-600" active={dashboardCargaFilter === 'Em rota'} onClick={() => setDashboardCargaFilter(prev => prev === 'Em rota' ? '' : 'Em rota')} />
              <Card title="Concluídas" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" active={dashboardCargaFilter === 'Entregue'} onClick={() => setDashboardCargaFilter(prev => prev === 'Entregue' ? '' : 'Entregue')} />
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card title="Quanto Faturou" value={`R$ ${financeiroResumo.faturou.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-indigo-600" />
              <Card title="Gasto Distribuição" value={`R$ ${financeiroResumo.gastouDistribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Truck} color="bg-amber-500" />
              <Card title="Lucro" value={`R$ ${financeiroResumo.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={CheckCircle2} color="bg-emerald-600" />
            </div>
          )}

          {activeTab === 'relatorios' && (
            <div className="space-y-6 mb-8">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                <img src="/logo-cargofy.svg" alt="Logo CargoFy" className="h-14 w-14 rounded-xl object-contain border border-slate-200 p-1" />
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Relatórios CargoFy</h3>
                  <p className="text-xs font-semibold text-slate-500">Exportação em CSV/PDF com identidade visual da operação.</p>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Empresa</label>
                  <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-blue-400" value={reportEmpresa} onChange={e => setReportEmpresa(e.target.value)}>
                    {empresasRelatorio.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                  </select>
                </div>
                <Input label="Número da Carga" value={reportNumeroCarga} onChange={setReportNumeroCarga} placeholder="Ex: 1020" />
                <Input label="Data Inicial" type="date" value={reportInicio} onChange={setReportInicio} />
                <Input label="Data Final" type="date" value={reportFim} onChange={setReportFim} />
                <div className="flex items-end">
                  <button onClick={downloadRelatorioCSV} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all">
                    <Download size={16} /> Gerar Relatório CSV
                  </button>
                </div>
                <div className="flex items-end">
                  <button onClick={gerarRelatorioPDF} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase transition-all">
                    <FileText size={16} /> Gerar Relatório PDF
                  </button>
                </div>
              </div>

              <div className={`grid grid-cols-1 ${relatorioPorCarga ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
                <Card title="Faturamento" value={`R$ ${resumoRelatorio.faturou.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-indigo-600" />
                {!relatorioPorCarga && <Card title="Distribuição" value={`R$ ${resumoRelatorio.distribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Truck} color="bg-amber-500" />}
                {!relatorioPorCarga && <Card title="Lucro" value={`R$ ${resumoRelatorio.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={CheckCircle2} color="bg-emerald-600" />}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Relatório Detalhado</h3>
                  <span className="text-[10px] font-bold text-slate-400">{relatorioData.length} registros</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Carga / NF / Empresa</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">CT-e</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Frete</th>
                      {!relatorioPorCarga && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Distribuição</th>}
                      {!relatorioPorCarga && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Lucro</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {relatorioData.map(item => (
                      <tr key={`rel-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-[10px] font-black text-indigo-600 uppercase">Carga #{item.numeroCarga || '---'}</p>
                          <p className="font-bold text-slate-800">{item.numeroNF || '---'}</p>
                          <p className="text-[10px] font-black text-slate-500">CT-e: {item.numeroCTe || '---'}</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.contratante || 'Sem empresa'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.dataSaida || item.dataNF || item.dataEntrega ? new Date((item.dataSaida || item.dataNF || item.dataEntrega) + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {(parseFloat(item.valorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        {!relatorioPorCarga && <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {(parseFloat(item.valorDistribuicao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {!relatorioPorCarga && <td className="px-6 py-4 text-sm font-black text-emerald-700">R$ {((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab !== 'relatorios' && activeTab !== 'dashboard' && activeTab !== 'viagens' && activeTab !== 'financeiro' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{activeTab}</h3>
              <span className="text-[10px] font-bold text-slate-400">{filteredData.length} registros</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">NF / Contratante</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Destino / Motorista</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status / Financeiro</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{item.numeroNF || item.nome || item.modelo || "---"}</p>
                          {item.numeroCarga && <p className="text-[10px] font-black text-indigo-600 uppercase">Carga #{item.numeroCarga}</p>}
                          {(item.boleto || item.urlBoleto || item.urlComprovante) && (
                            <a href={item.boleto || item.urlBoleto || item.urlComprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" className="text-emerald-500 hover:scale-110 transition-transform">
                              <Paperclip size={14} />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Building2 size={10} className="text-slate-400" />
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">
                            {item.contratante || "Contratante não informado"}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">{item.chaveID || item.email || item.placa}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{item.destinatario || item.cidade || item.tipo || '---'}</p>
                      {(item.destinatario && item.cidade) && <p className="text-[10px] text-slate-500 font-bold">{item.cidade}</p>}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-slate-400 font-black uppercase">{item.motorista || item.telefone || 'Sem Motorista'}</p>
                        {item.status === 'Entregue' && item.dataEntrega && (
                          <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
                            <Clock size={10} /> Entregue em {new Date(item.dataEntrega + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          ((activeTab === 'dashboard' || activeTab === 'viagens') ? getStatusViagem(item) : (activeTab === 'financeiro' ? getStatusFinanceiro(item) : item.status)) === 'Em rota' ? 'bg-blue-100 text-blue-600' : 
                          ((activeTab === 'dashboard' || activeTab === 'viagens') ? getStatusViagem(item) : (activeTab === 'financeiro' ? getStatusFinanceiro(item) : item.status)) === 'Entregue' ? 'bg-emerald-100 text-emerald-600' :
                          ((activeTab === 'dashboard' || activeTab === 'viagens') ? getStatusViagem(item) : (activeTab === 'financeiro' ? getStatusFinanceiro(item) : item.status)) === 'Pendente' ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {(activeTab === 'dashboard' || activeTab === 'viagens') ? getStatusViagem(item) : (activeTab === 'financeiro' ? getStatusFinanceiro(item) : (item.status || 'Ativo'))}
                        </span>
                        {activeTab !== 'dashboard' && item.valorFrete && <p className="font-black text-slate-900 text-sm">Frete: R$ {parseFloat(item.valorFrete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                        {activeTab !== 'dashboard' && (item.valorDistribuicao || activeTab === 'financeiro') && <p className="text-[10px] font-black text-amber-700">Custo: R$ {(parseFloat(item.valorDistribuicao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                        {activeTab !== 'dashboard' && (item.valorDistribuicao || item.lucro || activeTab === 'financeiro') && <p className="text-[10px] font-black text-emerald-700">Lucro: R$ {((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(activeTab === 'dashboard' || activeTab === 'viagens' || activeTab === 'financeiro') && (
                          <button onClick={() => setDetailItem(item)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Ver detalhes"><Eye size={16}/></button>
                        )}
                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                        <button onClick={async () => { 
                          if(confirm('Deseja realmente excluir este registro?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', (activeTab === 'dashboard' || activeTab === 'viagens' ? 'viagens' : activeTab), item.id));
                        }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}



          {activeTab === 'financeiro' && (
            <div className="space-y-4 mt-8">
              {financeiroAgrupadoPorCarga.map(grupo => (
                <div key={`fin-grupo-${grupo.numeroCarga}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga}</h3>
                    <span className="text-[10px] font-bold text-slate-400">{grupo.itens.length} boletos</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {grupo.itens.map(item => (
                      <div key={`fin-item-${item.id}`} className="px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-800">NF {item.numeroNF || '---'} · CT-e {getNumeroCTeResolvido(item) || '---'}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{item.contratante || 'Sem contratante'} · Motorista: {item.motorista || 'Sem motorista'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">Venc: {(item.dataVencimentoBoleto || item.vencimento) ? new Date(((item.dataVencimentoBoleto || item.vencimento) + 'T12:00:00')).toLocaleDateString('pt-BR') : '---'}</p>
                          <span className={`w-fit ml-auto px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusFinanceiro(item) === 'Pago' ? 'bg-emerald-100 text-emerald-600' : getStatusFinanceiro(item) === 'Vencido' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{getStatusFinanceiro(item)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dashboard' && dashboardCargaFilter && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Dashboard Cargas - {dashboardCargaFilter}</h3>
                <span className="text-[10px] font-bold text-slate-400">{dashboardViagensFiltradas.length} registros</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Carga / NF / Empresa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">CT-e</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Destino / Motorista</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dashboardViagensFiltradas.map(item => (
                    <tr key={`dash-v-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">Carga {item.numeroCarga || '---'} · NF {item.numeroNF || '---'}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.contratante || 'Contratante não informado'}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.numeroCTe || '---'}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{item.cidade || 'Destino não informado'}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase">{item.motorista || 'Sem motorista'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusViagem(item) === 'Em rota' ? 'bg-blue-100 text-blue-600' : getStatusViagem(item) === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {getStatusViagem(item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card title="Boletos Gerados" value={boletoStats.boletosGerados} icon={FileText} color="bg-indigo-600" active={dashboardBoletoFilter === 'Todos'} onClick={() => setDashboardBoletoFilter(prev => prev === 'Todos' ? '' : 'Todos')} />
                <Card title="Boletos Pendentes" value={boletoStats.boletosPendentes} icon={Clock} color="bg-amber-500" active={dashboardBoletoFilter === 'Pendente'} onClick={() => setDashboardBoletoFilter(prev => prev === 'Pendente' ? '' : 'Pendente')} />
                <Card title="Boletos Atrasados" value={boletoStats.boletosAtrasados} icon={AlertCircle} color="bg-rose-600" active={dashboardBoletoFilter === 'Vencido'} onClick={() => setDashboardBoletoFilter(prev => prev === 'Vencido' ? '' : 'Vencido')} />
                <Card title="Boletos Pagos" value={boletoStats.boletosPagos} icon={CheckCircle2} color="bg-emerald-600" active={dashboardBoletoFilter === 'Pago'} onClick={() => setDashboardBoletoFilter(prev => prev === 'Pago' ? '' : 'Pago')} />
              </div>
              {dashboardBoletoFilter && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Dashboard Boletos - {dashboardBoletoFilter === 'Todos' ? 'Gerados' : dashboardBoletoFilter}</h3>
                  <span className="text-[10px] font-bold text-slate-400">{dashboardBoletosFiltrados.length} registros</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">NF / Contratante</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Vencimento</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Boleto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {dashboardBoletosFiltrados.map(item => (
                      <tr key={`dash-fin-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{item.numeroNF || '---'}</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.contratante || 'Contratante não informado'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.vencimento ? new Date(item.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-6 py-4">
                          <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusFinanceiro(item) === 'Pago' ? 'bg-emerald-100 text-emerald-600' : getStatusFinanceiro(item) === 'Vencido' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                            {getStatusFinanceiro(item)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {(item.boleto || item.urlBoleto || item.urlComprovante) ? (
                            <a href={item.boleto || item.urlBoleto || item.urlComprovante} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">Abrir <ExternalLink size={12} /></a>
                          ) : <span className="text-[10px] font-bold text-slate-400">Sem link</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}


              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Próximos boletos por vencimento</h3>
                  <span className="text-[10px] font-bold text-slate-400">{proximosBoletos.length} registros</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Carga</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">NF</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">CT-e</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Contratante</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {proximosBoletos.map(item => (
                      <tr key={`prox-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.numeroCarga || '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.numeroNF || '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.numeroCTeResolvido || '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.contratante || '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.dataVencimento ? new Date(`${item.dataVencimento}T12:00:00`).toLocaleDateString('pt-BR') : '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Registro" : "Novo Cadastro"}>
        <form onSubmit={handleSave} className="space-y-6">
          {(activeTab === 'dashboard' || activeTab === 'viagens') && (
            <div className="space-y-6">
              {/* Seção 1: Identificação */}
              <div className="space-y-4 p-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white">
                <div className="flex items-center gap-2 border-l-4 border-blue-500 pl-3">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Documentação e Contrato</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <Input label="Número Nota Fiscal" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                  <Input label="Número da Carga" value={formData.numeroCarga} onChange={v => setFormData({...formData, numeroCarga: v})} />
                  <Input label="Número do CT-e" value={formData.numeroCTe} onChange={v => setFormData({...formData, numeroCTe: v})} />
                  <Input label="Data do CT-e" type="date" value={formData.dataCTe} onChange={v => setFormData({...formData, dataCTe: v})} />
                  <Input label="Contratante" placeholder="Ex: LogiExpress S.A." value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
                  <Input label="Valor da NF (R$)" type="number" value={formData.valorNF} onChange={v => setFormData({...formData, valorNF: v})} />
                </div>
                <Input label="Chave de Acesso (NF-e)" placeholder="44 dígitos da nota fiscal" value={formData.chaveID} onChange={v => setFormData({...formData, chaveID: v})} />
              </div>

              {/* Seção 2: Logística */}
              <div className="space-y-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-l-4 border-slate-300 pl-3">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Detalhes da Carga e Destino</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Empresa Destinatária" value={formData.destinatario} onChange={v => setFormData({...formData, destinatario: v})} />
                  <Input label="Cidade de Destino" value={formData.cidade} onChange={v => setFormData({...formData, cidade: v})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <Input label="Volume (Qtd)" type="number" value={formData.volume} onChange={v => setFormData({...formData, volume: v})} />
                  <Input label="Peso (Kg)" type="number" value={formData.peso} onChange={v => setFormData({...formData, peso: v})} />
                  <Input label="Valor Frete (R$)" type="number" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
                  <Input label="Valor da Distribuição (R$)" type="number" value={formData.valorDistribuicao} onChange={v => setFormData({...formData, valorDistribuicao: v})} />
                  <Input label="Data Saída" type="date" value={formData.dataSaida} onChange={v => setFormData({...formData, dataSaida: v})} />
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Lucro estimado (Frete - Distribuição)</p>
                  <p className="text-lg font-black text-emerald-800">R$ {lucroViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Seção 3: Transporte e Status */}
              <div className="space-y-4 p-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white">
                <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Operação e Status</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Motorista Responsável</label>
                    <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-indigo-200" value={formData.motorista} onChange={e => setFormData({...formData, motorista: e.target.value})}>
                      <option value="">Selecionar Motorista...</option>
                      {motoristas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Veículo</label>
                    <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold outline-none border border-transparent focus:border-indigo-200" value={formData.veiculo || ''} onChange={e => {
                      const selecionado = veiculos.find(v => v.id === e.target.value);
                      setFormData({
                        ...formData,
                        veiculo: e.target.value,
                        placa: selecionado?.placa || formData.placa
                      });
                    }}>
                      <option value="">Selecionar Veículo...</option>
                      {veiculos.map(v => <option key={v.id} value={v.id}>{v.modelo || 'Veículo'} {v.placa ? `- ${v.placa}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status da Viagem</label>
                    <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none border border-transparent focus:border-blue-400" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="Pendente">Pendente (Aguardando)</option>
                      <option value="Em rota">Em rota (Transportando)</option>
                      <option value="Entregue">Entregue (Concluído)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Método de Pagamento</label>
                    <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none border border-transparent focus:border-blue-400" value={formData.metodoPagamento || ''} onChange={e => setFormData({...formData, metodoPagamento: e.target.value, numeroBoleto: e.target.value === 'Boleto' ? formData.numeroBoleto : '', dataVencimentoBoleto: e.target.value === 'Boleto' ? formData.dataVencimentoBoleto : ''})}>
                      <option value="">Selecionar...</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Pix">Pix</option>
                      <option value="Transferencia">Transferência</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                  {formData.metodoPagamento === 'Boleto' && (
                    <>
                      <Input label="Número do Boleto" value={formData.numeroBoleto || ''} onChange={v => setFormData({...formData, numeroBoleto: v})} />
                      <Input label="Data de Vencimento" type="date" value={formData.dataVencimentoBoleto || ''} onChange={v => setFormData({...formData, dataVencimentoBoleto: v})} />
                    </>
                  )}
                </div>
              </div>

              {/* Seção 4: Conclusão da Entrega */}
              {formData.status === 'Entregue' && (
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={18} />
                      <h4 className="text-xs font-black uppercase tracking-wider">Dados de Conclusão da Entrega</h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Data da Entrega Realizada" type="date" value={formData.dataEntrega} onChange={v => setFormData({...formData, dataEntrega: v})} />
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Foto do Comprovante</label>
                      <div className="flex gap-2 items-start">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const fotoProcessada = await processarFotoComprovante(file);
                              setFormData({...formData, urlComprovante: fotoProcessada});
                            } catch (error) {
                              alert('Não foi possível processar a foto do comprovante. Tente outra imagem.');
                            }
                          }}
                          className="flex-1 px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700"
                        />
                        {formData.urlComprovante && (
                          <a href={formData.urlComprovante} target="_blank" rel="noreferrer" className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>
                      {formData.urlComprovante && (
                        <a href={formData.urlComprovante} target="_blank" rel="noreferrer" title="Abrir comprovante em nova aba" className="inline-block mt-2">
                          <img src={formData.urlComprovante} alt="Pré-visualização do comprovante" className="h-20 w-20 object-cover rounded-lg border border-emerald-200 hover:opacity-90 transition-opacity cursor-pointer" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'financeiro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Número Nota Fiscal" value={formData.numeroNF} onChange={v => setFormData({...formData, numeroNF: v})} />
                <Input label="Número da Carga" value={formData.numeroCarga} onChange={v => setFormData({...formData, numeroCarga: v})} />
              </div>
              <Input label="Contratante" value={formData.contratante} onChange={v => setFormData({...formData, contratante: v})} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Destinatário" value={formData.destinatario || ''} onChange={v => setFormData({...formData, destinatario: v})} />
                <Input label="Cidade de Entrega" value={formData.cidade || ''} onChange={v => setFormData({...formData, cidade: v})} />
              </div>
              <Input label="Motorista" value={formData.motorista || ''} onChange={v => setFormData({...formData, motorista: v})} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Valor do Frete (R$)" type="number" value={formData.valorFrete} onChange={v => setFormData({...formData, valorFrete: v})} />
                <Input label="Valor do Custo (R$)" type="number" value={formData.valorDistribuicao || ''} onChange={v => setFormData({...formData, valorDistribuicao: v})} />
              </div>
              <p className="text-xs font-black text-emerald-700">Lucro: R$ {((parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Vencimento" type="date" value={formData.vencimento} onChange={v => setFormData({...formData, vencimento: v})} />
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Status Financeiro</label>
                  <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none border border-transparent focus:border-blue-400" value={formData.statusFinanceiro || 'Pendente'} onChange={e => setFormData({...formData, statusFinanceiro: e.target.value})}>
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                  </select>
                </div>
              </div>
              <Input label="Link do Boleto" placeholder="https://..." value={formData.boleto || ''} onChange={v => setFormData({...formData, boleto: v})} />
            </div>
          )}


          {activeTab === 'clientes' && (
            <div className="space-y-4">
              <Input label="Nome / Razão Social" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="E-mail Corporativo" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
              <Input label="Telefone de Contato" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
            </div>
          )}

          {activeTab === 'motoristas' && (
            <div className="space-y-4">
              <Input label="Nome Completo do Motorista" value={formData.nome} onChange={v => setFormData({...formData, nome: v})} />
              <Input label="WhatsApp / Telefone" value={formData.telefone} onChange={v => setFormData({...formData, telefone: v})} />
            </div>
          )}

          {activeTab === 'veiculos' && (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Modelo do Veículo" value={formData.modelo} onChange={v => setFormData({...formData, modelo: v})} />
              <Input label="Placa" placeholder="ABC-1234" value={formData.placa} onChange={v => setFormData({...formData, placa: v})} />
              <Input label="Tipo (Truck, Bitrem, etc)" value={formData.tipo} onChange={v => setFormData({...formData, tipo: v})} />
            </div>
          )}

          {(activeTab === 'dashboard' || activeTab === 'viagens' || activeTab === 'financeiro') && (
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Observação</label>
              <textarea
                value={formData.observacao || ''}
                onChange={e => setFormData({...formData, observacao: e.target.value})}
                placeholder="Digite uma observação adicional..."
                rows={3}
                className="w-full p-3 bg-slate-100 rounded-xl text-sm font-medium outline-none border border-transparent focus:border-blue-400"
              />
            </div>
          )}

          <div className="flex gap-3 pt-8 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Descartar</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
              {editingId ? "Atualizar Registro" : "Confirmar Cadastro"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Detalhes da Carga">
        {detailItem && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Número da Carga" value={detailItem.numeroCarga} />
            <Info label="NF" value={detailItem.numeroNF} />
            <Info label="Número do CT-e" value={getNumeroCTeResolvido(detailItem)} />
            <Info label="Data do CT-e" value={detailItem.dataCTe ? new Date(detailItem.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : ''} />
            <Info label="Contratante" value={detailItem.contratante} />
            <Info label="Destinatário" value={detailItem.destinatario} />
            <Info label="Cidade" value={detailItem.cidade} />
            <Info label="Motorista" value={detailItem.motorista} />
            <Info label="Veículo" value={detailItem.veiculo} />
            <Info label="Status" value={detailItem.status || (detailItem.statusFinanceiro || detailItem.vencimento || detailItem.dataVencimentoBoleto ? getStatusFinanceiro(detailItem) : getStatusViagem(detailItem))} />
            <Info label="Valor Frete" value={detailItem.valorFrete ? `R$ ${parseFloat(detailItem.valorFrete).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} />
            <Info label="Valor Distribuição" value={detailItem.valorDistribuicao ? `R$ ${parseFloat(detailItem.valorDistribuicao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} />
            <Info label="Lucro" value={`R$ ${((parseFloat(detailItem.valorFrete) || 0) - (parseFloat(detailItem.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            <Info label="Número do Boleto" value={detailItem.numeroBoleto || ''} />
            <Info label="Data de Vencimento" value={(detailItem.dataVencimentoBoleto || detailItem.vencimento) ? new Date(((detailItem.dataVencimentoBoleto || detailItem.vencimento) + 'T12:00:00')).toLocaleDateString('pt-BR') : ''} />
            <Info label="Observação" value={detailItem.observacao || ''} />
            <div className="md:col-span-2">
              <Info label="Comprovante" value={detailItem.urlComprovante ? 'Foto anexada' : 'Sem comprovante'} />
              {detailItem.urlComprovante && (
                <div className="mt-2">
                  <a href={detailItem.urlComprovante} target="_blank" rel="noreferrer" title="Abrir comprovante em nova aba" className="inline-block">
                    <img src={detailItem.urlComprovante} alt="Comprovante da carga" className="h-28 w-28 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
      <p className="text-[10px] font-black text-slate-400 uppercase">{label}</p>
      <p className="font-bold text-slate-800">{value || '---'}</p>
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

function Input({ label, type = "text", value, onChange, placeholder = "" }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder}
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        className="w-full px-4 py-2.5 bg-slate-100 rounded-xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-sm font-semibold transition-all" 
      />
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
    catch(err) { alert('Falha na autenticação. Verifique os dados.'); }
  };
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_15%_85%,_rgba(14,165,233,0.2),transparent_34%)]" />
      <div className="relative min-h-screen grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 p-6 lg:p-10 items-center">
        <section className="hidden xl:flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-10 min-h-[78vh]">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/15 border border-blue-300/20">
              <Truck size={18} className="text-blue-300" />
              <span className="text-xs font-black tracking-[0.2em] uppercase text-blue-100">CargoFy TMS</span>
            </div>
            <h1 className="mt-8 text-4xl font-black leading-tight tracking-tight max-w-xl">Plataforma profissional para gestão operacional de transporte e frete.</h1>
            <p className="mt-5 text-slate-300 max-w-xl">Controle cargas, documentos, financeiro e comprovantes em um único painel com visão de operação em tempo real.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Rastreamento de Cargas', 'Gestão de CT-e e NF', 'Conciliação Financeira', 'Relatórios Operacionais'].map((item) => (
              <div key={item} className="px-4 py-3 rounded-xl border border-white/10 bg-slate-900/50 text-sm font-semibold text-slate-200">{item}</div>
            ))}
          </div>
        </section>

        <section className="w-full max-w-lg mx-auto">
          <div className="rounded-3xl border border-slate-200/20 bg-white shadow-2xl p-8 md:p-10 text-slate-900">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-lg shadow-blue-600/30">
                <Truck size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">CargoFy TMS</h2>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Acesso seguro ao painel operacional</p>
              </div>
            </div>

            <form onSubmit={handle} className="space-y-4">
              <Input label="E-mail corporativo" value={email} onChange={setEmail} placeholder="seuemail@empresa.com" />
              <Input label="Senha" type="password" value={pass} onChange={setPass} placeholder="••••••••" />

              <button className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all">
                {isReg ? 'Criar Conta' : 'Entrar no TMS'}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <button type="button" onClick={() => setIsReg(!isReg)} className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors">
                  {isReg ? 'Já possui conta? Fazer login' : 'Primeiro acesso? Criar conta'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
