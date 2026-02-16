import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query, setDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, Lock, Mail, Clock, FileText, Search, Calendar, Layers, 
  CheckCircle2, AlertCircle, Edit3, Download, ArrowRight, Camera, Paperclip, ExternalLink, Building2, Eye, Upload
} from 'lucide-react';
import { appId, auth, db } from './config/firebase';
import { DATA_COLLECTIONS } from './constants/collections';
import { INITIAL_FORM_DATA } from './data/formDefaults';

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
  const [cotacoes, setCotacoes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchNF, setSearchNF] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [viagensPainelFiltro, setViagensPainelFiltro] = useState('');
  const [reportEmpresa, setReportEmpresa] = useState('Todas');
  const [reportInicio, setReportInicio] = useState('');
  const [reportFim, setReportFim] = useState('');
  const [reportNumeroCarga, setReportNumeroCarga] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [cotacaoData, setCotacaoData] = useState({
    cliente: '',
    origem: '',
    tipoCarga: 'fracionado',
    peso: '',
    volume: '',
    prazo: '',
    valorFrete: '',
    validade: '3',
    observacoes: '',
    numeroNotasFiscais: '1',
    cidadesEntrega: ['']
  });
  const [cotacaoDistanciaKm, setCotacaoDistanciaKm] = useState(0);
  const [cotacaoCalculandoKm, setCotacaoCalculandoKm] = useState(false);
  const [cotacaoAtualId, setCotacaoAtualId] = useState('');

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribes = DATA_COLLECTIONS.map(colName => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', colName));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (colName === 'viagens') setViagens(data);
        if (colName === 'financeiro') setFinanceiro(data);
        if (colName === 'clientes') setClientes(data);
        if (colName === 'motoristas') setMotoristas(data);
        if (colName === 'veiculos') setVeiculos(data);
        if (colName === 'cotacoes') setCotacoes(data);
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
      const pendentes = itens.filter(i => (i.status || 'Pendente') === 'Pendente').length;
      const emRota = itens.filter(i => (i.status || 'Pendente') === 'Em rota').length;
      const entregues = itens.filter(i => (i.status || 'Pendente') === 'Entregue').length;

      mapa[chave] = {
        total: itens.length,
        pendentes,
        emRota,
        entregues,
        allEntregues: entregues === itens.length,
        allPendentes: pendentes === itens.length,
        hasEmRota: emRota > 0
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

  const getViagemRelacionada = (item) => {
    const nf = (item?.numeroNF || '').trim();
    if (nf) {
      const porNf = viagens.find(v => (v.numeroNF || '').trim() === nf);
      if (porNf) return porNf;
    }

    const carga = (item?.numeroCarga || '').trim();
    if (carga) {
      const porCarga = viagens.find(v => (v.numeroCarga || '').trim() === carga);
      if (porCarga) return porCarga;
    }

    return null;
  };

  const getNumeroCTeResolvido = (item) => {
    const cteAtual = (item?.numeroCTe || '').trim();
    if (cteAtual) return cteAtual;

    const nf = (item?.numeroNF || '').trim();
    if (nf && mapaCTePorReferencia[`nf:${nf}`]) return mapaCTePorReferencia[`nf:${nf}`];

    const carga = (item?.numeroCarga || '').trim();
    if (carga && mapaCTePorReferencia[`carga:${carga}`]) return mapaCTePorReferencia[`carga:${carga}`];

    return '';
  };

  const getDataCTeResolvida = (item) => item?.dataCTe || getViagemRelacionada(item)?.dataCTe || '';

  const getDataEntregaResolvida = (item) => item?.dataEntrega || getViagemRelacionada(item)?.dataEntrega || '';

  const getChaveIDResolvida = (item) => item?.chaveID || getViagemRelacionada(item)?.chaveID || '';

  const getVeiculoResolvido = (item) => {
    const viagemRelacionada = getViagemRelacionada(item);
    const ref = (item?.veiculo || viagemRelacionada?.veiculo || '').trim();
    const placaItem = (item?.placa || viagemRelacionada?.placa || '').trim();

    if (!ref && placaItem) return placaItem;
    if (!ref) return '';

    const encontrado = veiculos.find(v => v.id === ref || v.placa === ref || v.modelo === ref || v.placa === placaItem);
    if (encontrado) {
      const modelo = encontrado.modelo || 'Veículo';
      const placa = encontrado.placa ? ` - ${encontrado.placa}` : '';
      return `${modelo}${placa}`;
    }

    return placaItem || ref;
  };

  const getStatusViagem = (viagem) => {
    const chave = (viagem.numeroCarga || '').trim();
    if (chave && cargaStatusMap[chave]) {
      const resumo = cargaStatusMap[chave];
      if (resumo.allEntregues) return 'Entregue';
      if (resumo.hasEmRota) return 'Em rota';
      if (resumo.allPendentes) return 'Pendente';
      return 'Em rota';
    }
    return viagem.status || 'Pendente';
  };

  const getCargaLabel = (item) => {
    const numero = (item?.numeroCarga || '').trim();
    const tipo = (item?.tipoCarga || '').trim();
    if (!numero) return '---';
    if (!tipo) return numero;
    return `${tipo} - ${numero}`;
  };

  const getFinanceiroDocId = (viagemData) => {
    const origemViagemId = (viagemData?.id || '').trim();
    if (origemViagemId) return `viagem_${origemViagemId}`;

    const numeroNF = (viagemData?.numeroNF || '').trim();
    if (numeroNF) return `nf_${numeroNF.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    return '';
  };

  const exigeCTe = (item) => (item?.tipoCarga || '').trim().toLowerCase() !== 'dedicada';

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
      const dataBase = getDataCTeResolvida(item) || item.dataCTe;
      return (dataBase || '').slice(0, 7) === monthFilter;
    });
  }, [financeiro, monthFilter, getDataCTeResolvida]);

  const boletoStats = useMemo(() => {
    const boletosGerados = dashboardFinanceiroBase.length;
    const boletosPagos = dashboardFinanceiroBase.filter(f => getStatusFinanceiro(f) === 'Pago').length;
    const boletosAtrasados = dashboardFinanceiroBase.filter(f => getStatusFinanceiro(f) === 'Vencido').length;
    const boletosPendentes = dashboardFinanceiroBase.filter(f => getStatusFinanceiro(f) === 'Pendente').length;

    return { boletosGerados, boletosPendentes, boletosAtrasados, boletosPagos };
  }, [dashboardFinanceiroBase]);

  const financeiroResumo = useMemo(() => {
    const faturou = dashboardFinanceiroBase.reduce((acc, curr) => acc + (parseFloat(curr.valorFrete) || 0), 0);
    const gastouDistribuicao = dashboardFinanceiroBase.reduce((acc, curr) => acc + (parseFloat(curr.valorDistribuicao) || 0), 0);
    const lucroTotal = faturou - gastouDistribuicao;
    return { faturou, gastouDistribuicao, lucroTotal };
  }, [dashboardFinanceiroBase]);

  const empresasRelatorio = useMemo(() => {
    const empresas = [...new Set(viagens.map(v => v.contratante).filter(Boolean))];
    return ['Todas', ...empresas];
  }, [viagens]);

  const relatorioData = useMemo(() => {
    return viagens
      .filter(v => {
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
      })
      .map(v => {
        const nf = (v.numeroNF || '').trim();
        const carga = (v.numeroCarga || '').trim();
        return {
          ...v,
          numeroCTe: (v.numeroCTe || '').trim() || mapaCTePorReferencia[`nf:${nf}`] || mapaCTePorReferencia[`carga:${carga}`] || ''
        };
      });
  }, [viagens, reportEmpresa, reportNumeroCarga, reportInicio, reportFim, mapaCTePorReferencia]);

  const resumoRelatorio = useMemo(() => {
    const faturou = relatorioData.reduce((acc, curr) => acc + (parseFloat(curr.valorFrete) || 0), 0);
    const distribuicao = relatorioData.reduce((acc, curr) => acc + (parseFloat(curr.valorDistribuicao) || 0), 0);
    return { faturou, distribuicao, lucro: faturou - distribuicao };
  }, [relatorioData]);

  const relatorioPorCarga = !!reportNumeroCarga.trim();

  const valorFreteCotacao = parseFloat(cotacaoData.valorFrete) || 0;

  const formatarCidadesEntrega = useMemo(() => (
    cotacaoData.cidadesEntrega
      .map(cidade => cidade.trim())
      .filter(Boolean)
  ), [cotacaoData.cidadesEntrega]);

  const rotaCotacao = useMemo(() => {
    const origem = cotacaoData.origem.trim();
    if (!origem) return '';
    if (!formatarCidadesEntrega.length) return origem;
    return [origem, ...formatarCidadesEntrega, origem].join(' ➜ ');
  }, [cotacaoData.origem, formatarCidadesEntrega]);

  const mensagemCotacao = useMemo(() => {
    const valorFormatado = valorFreteCotacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const rota = rotaCotacao;
    const tipoCargaLabel = cotacaoData.tipoCarga === 'dedicado' ? 'Dedicado' : 'Fracionado';

    return [
      `COTAÇÃO DE FRETE - CARGOFY`,
      `Cliente: ${cotacaoData.cliente || '---'}`,
      `Tipo de carga: ${tipoCargaLabel}`,
      `Rota: ${rota || '---'}`,
      `Qtd. de entregas: ${formatarCidadesEntrega.length}`,
      `Qtd. de notas fiscais: ${cotacaoData.numeroNotasFiscais || '1'}`,
      `Quilometragem estimada: ${cotacaoDistanciaKm ? `${cotacaoDistanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : 'Não calculada'}`,
      `Peso: ${cotacaoData.peso || '---'}`,
      `Volume: ${cotacaoData.volume || '---'}`,
      `Prazo estimado: ${cotacaoData.prazo || '---'}`,
      `Valor do frete: R$ ${valorFormatado}`,
      `Validade da proposta: ${cotacaoData.validade || '0'} dia(s)`,
      `Observações: ${cotacaoData.observacoes || '---'}`
    ].join('\n');
  }, [cotacaoData, valorFreteCotacao, formatarCidadesEntrega, cotacaoDistanciaKm, rotaCotacao]);

  const handleCotacaoChange = (field, value) => {
    setCotacaoData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCidadeEntregaChange = (index, value) => {
    setCotacaoData((prev) => ({
      ...prev,
      cidadesEntrega: prev.cidadesEntrega.map((cidade, i) => (i === index ? value : cidade))
    }));
  };

  const adicionarCidadeEntrega = () => {
    setCotacaoData((prev) => ({
      ...prev,
      cidadesEntrega: [...prev.cidadesEntrega, '']
    }));
  };

  const removerCidadeEntrega = (index) => {
    setCotacaoData((prev) => {
      if (prev.cidadesEntrega.length === 1) {
        return { ...prev, cidadesEntrega: [''] };
      }
      return {
        ...prev,
        cidadesEntrega: prev.cidadesEntrega.filter((_, i) => i !== index)
      };
    });
  };

  const geocodificarCidade = async (cidade) => {
    const queryCidade = encodeURIComponent(cidade);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryCidade}&limit=1`);
    if (!response.ok) throw new Error('Falha ao geocodificar cidade');
    const data = await response.json();
    if (!data.length) throw new Error(`Cidade não encontrada: ${cidade}`);
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  };

  const calcularDistanciaAproximada = (origemCoord, destinoCoord) => {
    const [lon1, lat1] = origemCoord;
    const [lon2, lat2] = destinoCoord;
    const toRad = (graus) => (graus * Math.PI) / 180;
    const raioTerraKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return raioTerraKm * c;
  };

  const ordenarEntregasPorDistancia = async (origem, entregas) => {
    const origemCoord = await geocodificarCidade(origem);
    const entregasComCoord = await Promise.all(
      entregas.map(async (cidade) => {
        const coord = await geocodificarCidade(cidade);
        const distancia = calcularDistanciaAproximada(origemCoord, coord);
        return { cidade, coord, distancia };
      })
    );

    return entregasComCoord
      .sort((a, b) => a.distancia - b.distancia)
      .map((item) => item.cidade);
  };

  const calcularDistanciaKm = async () => {
    const origem = cotacaoData.origem.trim();
    const entregas = formatarCidadesEntrega;

    if (!origem || !entregas.length) {
      alert('Informe a origem e pelo menos uma cidade de entrega para calcular o KM.');
      return;
    }

    try {
      setCotacaoCalculandoKm(true);
      const entregasOrdenadas = await ordenarEntregasPorDistancia(origem, entregas);
      setCotacaoData((prev) => ({ ...prev, cidadesEntrega: entregasOrdenadas }));

      const pontos = [origem, ...entregasOrdenadas, origem];
      const coordenadas = await Promise.all(pontos.map(geocodificarCidade));
      const coordinatesParam = coordenadas.map(([lon, lat]) => `${lon},${lat}`).join(';');
      const rotaResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinatesParam}?overview=false`);
      if (!rotaResponse.ok) throw new Error('Falha ao calcular rota');
      const rotaData = await rotaResponse.json();
      const distanceMeters = rotaData?.routes?.[0]?.distance || 0;
      const km = distanceMeters / 1000;
      setCotacaoDistanciaKm(km);
    } catch (error) {
      console.error(error);
      alert('Não foi possível calcular/ordenar rota automaticamente. Verifique os nomes das cidades e tente novamente.');
    } finally {
      setCotacaoCalculandoKm(false);
    }
  };

  const handleCopyCotacao = async () => {
    try {
      await navigator.clipboard.writeText(mensagemCotacao);
      alert('Cotação copiada para a área de transferência!');
    } catch (error) {
      alert('Não foi possível copiar automaticamente. Copie manualmente o texto da cotação.');
    }
  };

  const gerarNumeroCotacao = () => {
    const agora = new Date();
    const data = `${agora.getFullYear()}${String(agora.getMonth() + 1).padStart(2, '0')}${String(agora.getDate()).padStart(2, '0')}`;
    const hora = `${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}${String(agora.getSeconds()).padStart(2, '0')}`;
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `COT-${data}-${hora}-${random}`;
  };

  const montarPayloadCotacao = (numeroCotacaoExistente = '') => {
    const numeroCotacao = numeroCotacaoExistente || gerarNumeroCotacao();
    return {
      numeroCotacao,
      cliente: cotacaoData.cliente.trim(),
      origem: cotacaoData.origem.trim(),
      tipoCarga: cotacaoData.tipoCarga,
      peso: cotacaoData.peso,
      volume: cotacaoData.volume,
      prazo: cotacaoData.prazo,
      valorFrete: cotacaoData.valorFrete,
      validade: cotacaoData.validade,
      observacoes: cotacaoData.observacoes,
      numeroNotasFiscais: Math.max(parseInt(cotacaoData.numeroNotasFiscais || '1', 10) || 1, 1),
      cidadesEntrega: formatarCidadesEntrega,
      rota: rotaCotacao,
      rotasPorNota: Array.from({ length: Math.max(parseInt(cotacaoData.numeroNotasFiscais || '1', 10) || 1, 1) }, (_, idx) => ({
        notaIndex: idx + 1,
        rota: rotaCotacao
      })),
      distanciaKm: cotacaoDistanciaKm,
      statusCotacao: 'Em análise',
      mensagemCotacao,
      userId: user?.uid || ''
    };
  };

  const salvarCotacao = async () => {
    if (!cotacaoData.cliente.trim()) {
      alert('Informe o cliente da cotação.');
      return;
    }

    if (!cotacaoData.origem.trim() || !formatarCidadesEntrega.length) {
      alert('Informe origem e ao menos uma cidade de entrega.');
      return;
    }

    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'cotacoes');

      if (cotacaoAtualId) {
        const existente = cotacoes.find(c => c.id === cotacaoAtualId);
        const payloadAtualizado = {
          ...montarPayloadCotacao(existente?.numeroCotacao || ''),
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cotacoes', cotacaoAtualId), payloadAtualizado);
        alert('Cotação atualizada com sucesso!');
        return;
      }

      const payload = {
        ...montarPayloadCotacao(),
        createdAt: serverTimestamp()
      };
      const novoDoc = await addDoc(colRef, payload);
      setCotacaoAtualId(novoDoc.id);
      alert(`Cotação salva com sucesso! Número: ${payload.numeroCotacao}`);
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar a cotação.');
    }
  };

  const carregarCotacao = (cotacao) => {
    if (!cotacao) return;

    const cidades = Array.isArray(cotacao.cidadesEntrega)
      ? cotacao.cidadesEntrega.filter((cidade) => (cidade || '').trim())
      : [];

    setCotacaoAtualId(cotacao.id || '');
    setCotacaoDistanciaKm(parseFloat(cotacao.distanciaKm) || 0);
    setCotacaoData({
      cliente: cotacao.cliente || '',
      origem: cotacao.origem || '',
      tipoCarga: cotacao.tipoCarga || 'fracionado',
      peso: cotacao.peso || '',
      volume: cotacao.volume || '',
      prazo: cotacao.prazo || '',
      valorFrete: cotacao.valorFrete || '',
      validade: cotacao.validade || '3',
      observacoes: cotacao.observacoes || '',
      numeroNotasFiscais: String(cotacao.numeroNotasFiscais || '1'),
      cidadesEntrega: cidades.length ? cidades : ['']
    });

    alert(`Cotação ${cotacao.numeroCotacao || ''} carregada com sucesso.`);
  };

  const getProximoNumeroCarga = () => {
    const numeros = viagens
      .map((viagem) => {
        const numero = String(viagem?.numeroCarga || '').trim();
        if (!numero) return NaN;
        const partesNumericas = numero.match(/\d+/g);
        if (!partesNumericas?.length) return NaN;
        return parseInt(partesNumericas.join(''), 10);
      })
      .filter((num) => Number.isFinite(num));

    const maiorNumero = numeros.length ? Math.max(...numeros) : 0;
    return String(maiorNumero + 1);
  };

  const excluirCotacao = async (cotacao) => {
    if (!cotacao?.id) return;
    if (!window.confirm(`Deseja excluir a cotação ${cotacao.numeroCotacao || ''}?`)) return;

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cotacoes', cotacao.id));
      if (cotacaoAtualId === cotacao.id) {
        limparCotacao();
      }
      alert('Cotação excluída com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Não foi possível excluir a cotação.');
    }
  };

  const aprovarCotacao = async (cotacao) => {
    if (!cotacao?.id) return;
    if ((cotacao.statusCotacao || '').toLowerCase() === 'aprovada') {
      alert('Esta cotação já foi aprovada.');
      return;
    }

    try {
      const totalNotas = Math.max(parseInt(cotacao.numeroNotasFiscais || '1', 10) || 1, 1);
      const primeiroNumeroCarga = parseInt(getProximoNumeroCarga(), 10) || 1;
      const viagensCriadas = [];

      for (let i = 0; i < totalNotas; i += 1) {
        const numeroCarga = String(primeiroNumeroCarga + i);
        const cargaPayload = {
          numeroNF: totalNotas > 1 ? `${cotacao.numeroCotacao || ''}-NF${i + 1}` : (cotacao.numeroCotacao || ''),
          numeroCarga,
          tipoCarga: cotacao.tipoCarga === 'dedicado' ? 'Dedicada' : 'Fracionada',
          contratante: cotacao.cliente || '',
          destinatario: cotacao.cidadesEntrega?.[0] || '',
          cidade: cotacao.cidadesEntrega?.join(' | ') || '',
          status: 'Pendente',
          valorFrete: cotacao.valorFrete || '',
          valorDistribuicao: '',
          observacao: `Origem: ${cotacao.origem || '---'} | Entregas: ${(cotacao.cidadesEntrega || []).join(', ')} | Cotação ${cotacao.numeroCotacao || ''} | Nota ${i + 1}/${totalNotas} | Rota: ${cotacao.rota || '---'}`,
          motorista: '',
          veiculo: '',
          userId: user?.uid || '',
          createdAt: serverTimestamp()
        };

        const viagemDoc = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'viagens'), cargaPayload);
        viagensCriadas.push(viagemDoc.id);
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'cotacoes', cotacao.id), {
        statusCotacao: 'Aprovada',
        origemViagemId: viagensCriadas[0] || '',
        origemViagemIds: viagensCriadas,
        approvedAt: serverTimestamp()
      });

      alert(`Cotação ${cotacao.numeroCotacao} aprovada e convertida em ${totalNotas} carga(s)!`);
      setActiveTab('viagens');
    } catch (error) {
      console.error(error);
      alert('Falha ao aprovar cotação e gerar carga.');
    }
  };

  const buildCotacaoHtml = () => {
    const logoUrl = `${window.location.origin}/logo-cargofy.svg`;
    const tipoCargaLabel = cotacaoData.tipoCarga === 'dedicado' ? 'Dedicado' : 'Fracionado';
    const dataGeracao = new Date().toLocaleDateString('pt-BR');
    const entregasHtml = formatarCidadesEntrega.length
      ? formatarCidadesEntrega.map((cidade, idx) => `<li>${idx + 1}. ${cidade}</li>`).join('')
      : '<li>---</li>';

    return `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Cotação CargoFy</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
            .sheet { max-width: 860px; margin: 24px auto; background: #fff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { padding: 24px; background: linear-gradient(90deg, #0f172a, #1e293b); color: #fff; display: flex; justify-content: space-between; align-items: center; }
            .header img { width: 56px; height: 56px; background: #fff; border-radius: 12px; padding: 4px; }
            .title h1 { margin: 0; font-size: 24px; }
            .title p { margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }
            .content { padding: 24px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 700; color: #0f172a; }
            .deliveries { margin-top: 12px; }
            .deliveries ul { margin: 8px 0 0; padding-left: 18px; }
            .footer { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #475569; }
            .price { margin-top: 16px; background: #ecfeff; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px; font-size: 22px; font-weight: 800; color: #0f766e; text-align: right; }
            @media print { body { background: #fff; } .sheet { margin: 0; border: 0; border-radius: 0; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="title">
                <h1>Cotação de Frete</h1>
                <p>CargoFy Transportes · Emissão: ${dataGeracao}</p>
              </div>
              <img src="${logoUrl}" alt="Logo CargoFy" />
            </div>
            <div class="content">
              <div class="grid">
                <div class="card"><div class="label">Cliente</div><div class="value">${cotacaoData.cliente || '---'}</div></div>
                <div class="card"><div class="label">Tipo de Carga</div><div class="value">${tipoCargaLabel}</div></div>
                <div class="card"><div class="label">Origem</div><div class="value">${cotacaoData.origem || '---'}</div></div>
                <div class="card"><div class="label">Rota (ida e volta)</div><div class="value">${rotaCotacao || '---'}</div></div>
                <div class="card"><div class="label">Prazo</div><div class="value">${cotacaoData.prazo || '---'}</div></div>
                <div class="card"><div class="label">Peso</div><div class="value">${cotacaoData.peso || '---'}</div></div>
                <div class="card"><div class="label">Volume</div><div class="value">${cotacaoData.volume || '---'}</div></div>
                <div class="card"><div class="label">KM Estimado</div><div class="value">${cotacaoDistanciaKm ? `${cotacaoDistanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : 'Não calculado'}</div></div>
                <div class="card"><div class="label">Validade</div><div class="value">${cotacaoData.validade || '0'} dia(s)</div></div>
                <div class="card"><div class="label">Notas Fiscais</div><div class="value">${Math.max(parseInt(cotacaoData.numeroNotasFiscais || '1', 10) || 1, 1)}</div></div>
              </div>
              <div class="card deliveries">
                <div class="label">Cidades de entrega (ordenadas da mais próxima para a mais distante)</div>
                <ul>${entregasHtml}</ul>
              </div>
              <div class="card" style="margin-top: 12px;"><div class="label">Observações</div><div class="value">${cotacaoData.observacoes || '---'}</div></div>
              <div class="price">Valor do Frete: R$ ${valorFreteCotacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div class="footer">Esta cotação pode sofrer alterações conforme janela de coleta, restrições de acesso, pedágio e alterações de rota.</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const gerarCotacaoPDF = () => {
    const janela = window.open('', '_blank');
    if (!janela) {
      alert('Não foi possível abrir a pré-visualização para PDF.');
      return;
    }
    janela.document.write(buildCotacaoHtml());
    janela.document.close();
    janela.focus();
    setTimeout(() => janela.print(), 350);
  };

  const gerarCotacaoImagem = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(60, 60, 1280, 140);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('Cotação de Frete - CargoFy', 100, 145);

    ctx.fillStyle = '#ffffff';
    ctx.font = '26px Arial';
    ctx.fillText(new Date().toLocaleDateString('pt-BR'), 1100, 145);

    const linhas = [
      `Cliente: ${cotacaoData.cliente || '---'}`,
      `Tipo de carga: ${cotacaoData.tipoCarga === 'dedicado' ? 'Dedicado' : 'Fracionado'}`,
      `Origem: ${cotacaoData.origem || '---'}`,
      `Rota (ida e volta): ${rotaCotacao || '---'}`,
      `KM estimado: ${cotacaoDistanciaKm ? `${cotacaoDistanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : 'Não calculado'}`,
      `Prazo: ${cotacaoData.prazo || '---'}`,
      `Peso/Volume: ${cotacaoData.peso || '---'} / ${cotacaoData.volume || '---'}`,
      `Validade: ${cotacaoData.validade || '0'} dia(s)`,
      `Notas fiscais: ${Math.max(parseInt(cotacaoData.numeroNotasFiscais || '1', 10) || 1, 1)}`
    ];

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px Arial';
    let y = 280;
    linhas.forEach((linha) => {
      ctx.fillText(linha, 90, y);
      y += 68;
    });

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 56px Arial';
    ctx.fillText(`Valor: R$ ${valorFreteCotacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 90, 820);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `cotacao-cargofy-${Date.now()}.png`;
    link.click();
  };

  const limparCotacao = () => {
    setCotacaoData({
      cliente: '',
      origem: '',
      tipoCarga: 'fracionado',
      peso: '',
      volume: '',
      prazo: '',
      valorFrete: '',
      validade: '3',
      observacoes: '',
      numeroNotasFiscais: '1',
      cidadesEntrega: ['']
    });
    setCotacaoDistanciaKm(0);
    setCotacaoAtualId('');
  };


  const downloadRelatorioCSV = () => {
    const header = relatorioPorCarga
      ? ['Carga', 'NF', 'CT-e', 'Data CT-e', 'Empresa', 'Boleto', 'Vencimento Boleto', 'Frete']
      : ['Carga', 'NF', 'CT-e', 'Data CT-e', 'Empresa', 'Data', 'Frete', 'Distribuicao', 'Lucro'];

    const rows = relatorioData.map(item => {
      const vencBoleto = item.dataVencimentoBoleto || item.vencimento || '';
      const base = [
        item.numeroCarga || '',
        item.numeroNF || '',
        item.numeroCTe || '',
        item.dataCTe || '',
        item.contratante || '',
        item.numeroBoleto || '',
        vencBoleto,
        (parseFloat(item.valorFrete) || 0).toFixed(2)
      ];

      if (relatorioPorCarga) return base;

      return [
        item.numeroCarga || '',
        item.numeroNF || '',
        item.numeroCTe || '',
        item.dataCTe || '',
        item.contratante || '',
        item.dataSaida || item.dataNF || item.dataEntrega || '',
        (parseFloat(item.valorFrete) || 0).toFixed(2),
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

    const gruposPorCarga = relatorioData.reduce((acc, item) => {
      const chave = (item.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      if (!acc[chave]) acc[chave] = [];
      acc[chave].push(item);
      return acc;
    }, {});

    const linhas = Object.entries(gruposPorCarga)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
      .map(([carga, itens]) => {
        const linhaTitulo = `<tr class="grupo"><td colspan="${relatorioPorCarga ? 8 : 9}">Carga ${carga} · ${itens.length} registro(s)</td></tr>`;

        const linhasItens = itens.map(item => {
          const data = item.dataSaida || item.dataNF || item.dataEntrega;
          const dataFmt = data ? new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR') : '---';
          const vencBoleto = item.dataVencimentoBoleto || item.vencimento;
          const vencFmt = vencBoleto ? new Date(`${vencBoleto}T12:00:00`).toLocaleDateString('pt-BR') : '---';
          const frete = (parseFloat(item.valorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const dist = (parseFloat(item.valorDistribuicao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const lucro = ((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

          return relatorioPorCarga
            ? `<tr><td>${item.numeroCarga || '---'}</td><td>${item.numeroNF || '---'}</td><td>${item.numeroCTe || '---'}</td><td>${item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td><td>${item.contratante || 'Sem empresa'}</td><td>${item.numeroBoleto || '---'}</td><td>${vencFmt}</td><td>R$ ${frete}</td></tr>`
            : `<tr><td>${item.numeroCarga || '---'}</td><td>${item.numeroNF || '---'}</td><td>${item.numeroCTe || '---'}</td><td>${item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td><td>${item.contratante || 'Sem empresa'}</td><td>${dataFmt}</td><td>R$ ${frete}</td><td>R$ ${dist}</td><td>R$ ${lucro}</td></tr>`;
        }).join('');

        return `${linhaTitulo}${linhasItens}`;
      })
      .join('');

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
            .grupo td { background: #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header"><img src="${logoUrl}" alt="Logo CargoFy" class="logo" /><h1>Relatório CargoFy</h1></div>
          <p>Empresa: ${reportEmpresa} | Carga: ${reportNumeroCarga || 'Todas'} | Período: ${reportInicio || 'Início'} até ${reportFim || 'Hoje'} | Registros: ${relatorioData.length}</p>
          <div class="resumo">
            <span>Faturamento: R$ ${resumoRelatorio.faturou.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            ${relatorioPorCarga ? '' : `<span>Distribuição: R$ ${resumoRelatorio.distribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><span>Lucro: R$ ${resumoRelatorio.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`}
          </div>
          <table>
            <thead>
              ${relatorioPorCarga ? '<tr><th>Carga</th><th>NF</th><th>CT-e</th><th>Data CT-e</th><th>Empresa</th><th>Boleto</th><th>Vencimento do Boleto</th><th>Frete</th></tr>' : '<tr><th>Carga</th><th>NF</th><th>CT-e</th><th>Data CT-e</th><th>Empresa</th><th>Data</th><th>Frete</th><th>Distribuição</th><th>Lucro</th></tr>'}
            </thead>
            <tbody>${linhas || `<tr><td colspan="${relatorioPorCarga ? 8 : 9}">Sem registros para o filtro.</td></tr>`}</tbody>
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
      case 'cotacao': list = []; break;
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

  const dashboardViagensFiltradasPorCarga = useMemo(() => {
    const grupos = {};
    dashboardViagensFiltradas.forEach(item => {
      const chave = (item.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item);
    });

    return Object.entries(grupos)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
      .map(([numeroCarga, itens]) => ({
        numeroCarga,
        itens: itens.sort((a, b) => (a.numeroNF || '').localeCompare((b.numeroNF || ''), 'pt-BR', { numeric: true }))
      }));
  }, [dashboardViagensFiltradas]);

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

  const dashboardBoletosFiltradosPorCarga = useMemo(() => {
    const grupos = {};
    dashboardBoletosFiltrados.forEach(item => {
      const chave = (item.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item);
    });

    return Object.entries(grupos)
      .map(([numeroCarga, itens]) => ({
        numeroCarga,
        itens: itens.sort((a, b) => {
          const da = (a.dataVencimentoBoleto || a.vencimento || '9999-12-31');
          const db = (b.dataVencimentoBoleto || b.vencimento || '9999-12-31');
          return da.localeCompare(db);
        })
      }))
      .sort((a, b) => {
        if (dashboardBoletoFilter === 'Pendente') {
          const da = (a.itens[0]?.dataVencimentoBoleto || a.itens[0]?.vencimento || '9999-12-31');
          const db = (b.itens[0]?.dataVencimentoBoleto || b.itens[0]?.vencimento || '9999-12-31');
          return da.localeCompare(db);
        }

        return a.numeroCarga.localeCompare(b.numeroCarga, 'pt-BR', { numeric: true });
      });
  }, [dashboardBoletosFiltrados, dashboardBoletoFilter]);

  const viagensPainelResumo = useMemo(() => {
    const base = activeTab === 'viagens' ? filteredData : dashboardViagensBase;
    const totalViagens = base.length;
    const semComprovante = base.filter(item => !(item.urlComprovante || '').trim()).length;
    const semMotorista = base.filter(item => !(item.motorista || '').trim()).length;
    const ctePendente = base.filter(item => exigeCTe(item) && (!((item.numeroCTe || '').trim()) || !((item.dataCTe || '').trim()))).length;

    const contagemPorMotorista = {};
    base.forEach(item => {
      const nome = (item.motorista || '').trim();
      if (!nome) return;
      contagemPorMotorista[nome] = (contagemPorMotorista[nome] || 0) + 1;
    });

    const [motoristaMaiorVolume, totalMaiorVolume] = Object.entries(contagemPorMotorista)
      .sort((a, b) => b[1] - a[1])[0] || ['Sem motorista definido', 0];

    return { totalViagens, semComprovante, semMotorista, ctePendente, motoristaMaiorVolume, totalMaiorVolume };
  }, [activeTab, filteredData, dashboardViagensBase]);

  const viagensPendenciasFiltradas = useMemo(() => {
    if (activeTab !== 'viagens' || !viagensPainelFiltro) return [];

    const lista = filteredData.filter(item => {
      if (viagensPainelFiltro === 'semComprovante') return !(item.urlComprovante || '').trim();
      if (viagensPainelFiltro === 'semMotorista') return !(item.motorista || '').trim();
      if (viagensPainelFiltro === 'ctePendente') return exigeCTe(item) && (!((item.numeroCTe || '').trim()) || !((item.dataCTe || '').trim()));
      return false;
    });

    return lista.sort((a, b) => {
      const cargaA = (a.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      const cargaB = (b.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      const porCarga = cargaA.localeCompare(cargaB, 'pt-BR', { numeric: true });
      if (porCarga !== 0) return porCarga;
      return (a.numeroNF || '').localeCompare((b.numeroNF || ''), 'pt-BR', { numeric: true });
    });
  }, [activeTab, filteredData, viagensPainelFiltro]);


  const viagensPendenciasSemComprovantePorCarga = useMemo(() => {
    if (activeTab !== 'viagens' || viagensPainelFiltro !== 'semComprovante') return [];

    const grupos = {};
    viagensPendenciasFiltradas.forEach(item => {
      const chave = (item.numeroCarga || 'Sem carga').trim() || 'Sem carga';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(item);
    });

    return Object.entries(grupos)
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))
      .map(([numeroCarga, itens]) => ({
        numeroCarga,
        itens: itens.sort((a, b) => (a.numeroNF || '').localeCompare((b.numeroNF || ''), 'pt-BR', { numeric: true }))
      }));
  }, [activeTab, viagensPainelFiltro, viagensPendenciasFiltradas]);


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
      ...INITIAL_FORM_DATA,
      ...item,
      boleto: item.boleto || item.urlBoleto || item.urlComprovante || '',
      statusFinanceiro: item.statusFinanceiro || 'Pendente',
      dataVencimentoBoleto: item.dataVencimentoBoleto || item.vencimento || '',
      vencimento: item.vencimento || item.dataVencimentoBoleto || ''
    });
    setEditingId(item.id);
    setModalOpen(true);
  };

  const syncFinanceiroPorViagem = async (viagemData) => {
    const numeroNF = (viagemData.numeroNF || '').trim();
    const origemViagemId = (viagemData.id || '').trim();
    if (!numeroNF && !origemViagemId) return;

    const registroExistente = financeiro.find(f =>
      (origemViagemId && (f.origemViagemId || '').trim() === origemViagemId) ||
      (numeroNF && (f.numeroNF || '').trim() === numeroNF)
    );

    const statusInformado = (viagemData.statusFinanceiro || '').trim();
    const payloadFinanceiro = {
      numeroNF: viagemData.numeroNF || '',
      numeroCarga: viagemData.numeroCarga || '',
      tipoCarga: viagemData.tipoCarga || '',
      origemViagemId: origemViagemId,
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

    const financeiroDocId = registroExistente?.id || getFinanceiroDocId(viagemData);

    if (financeiroDocId) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financeiro', financeiroDocId), {
        ...payloadFinanceiro,
        userId: user.uid,
        createdAt: registroExistente?.createdAt || serverTimestamp()
      }, { merge: true });
      return;
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'financeiro'), {
      ...payloadFinanceiro,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
  };

  useEffect(() => {
    if (!user || !viagens.length) return;

    const sincronizarPendentes = async () => {
      try {
        const pendentes = viagens.filter(v => {
          const viagemId = (v.id || '').trim();
          const numeroNF = (v.numeroNF || '').trim();

          if (!viagemId && !numeroNF) return false;

          const jaExiste = financeiro.some(f =>
            (viagemId && (f.origemViagemId || '').trim() === viagemId) ||
            (numeroNF && (f.numeroNF || '').trim() === numeroNF)
          );

          return !jaExiste;
        });

        for (const viagem of pendentes) {
          await syncFinanceiroPorViagem(viagem);
        }
      } catch (error) {
        console.error('Erro ao sincronizar viagens pendentes no financeiro:', error);
      }
    };

    sincronizarPendentes();
  }, [user, viagens, financeiro]);

  const sanitizeFirestorePayload = (payload) => {
    const entries = Object.entries(payload || {}).filter(([, value]) => value !== undefined);
    return Object.fromEntries(entries);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const colName = (activeTab === 'dashboard' || activeTab === 'viagens') ? 'viagens' : activeTab;

    if (colName === 'viagens' && !formData.tipoCarga) {
      alert('Selecione se a carga é Dedicada ou Fracionada.');
      return;
    }

    if (colName === 'viagens' && formData.tipoCarga === 'Fracionada' && (!formData.numeroCTe || !formData.dataCTe)) {
      alert('Para carga fracionada, informe o número e a data do CT-e.');
      return;
    }

    if (colName === 'viagens' && formData.metodoPagamento === 'Boleto' && (!formData.numeroBoleto || !formData.dataVencimentoBoleto)) {
      alert('Para pagamento via boleto, informe o número e a data de vencimento.');
      return;
    }

    const payloadBruto = colName === 'financeiro'
      ? {
          ...formData,
          dataVencimentoBoleto: formData.vencimento || formData.dataVencimentoBoleto || '',
          vencimento: formData.vencimento || formData.dataVencimentoBoleto || '',
          lucro: ((parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0)).toFixed(2),
          urlBoleto: formData.boleto || '',
          urlComprovante: formData.boleto || formData.urlComprovante || ''
        }
      : colName === 'viagens'
        ? {
            ...formData,
            numeroCTe: formData.tipoCarga === 'Fracionada' ? formData.numeroCTe : '',
            dataCTe: formData.tipoCarga === 'Fracionada' ? formData.dataCTe : '',
            numeroBoleto: formData.metodoPagamento === 'Boleto' ? formData.numeroBoleto : '',
            dataVencimentoBoleto: formData.metodoPagamento === 'Boleto' ? formData.dataVencimentoBoleto : '',
            lucro: ((parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0)).toFixed(2)
          }
        : formData;

    const payload = sanitizeFirestorePayload(payloadBruto);

    try {
      let savedViagemId = editingId || '';
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), payload);
      } else {
        const novoDoc = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
          ...payload, userId: user.uid, createdAt: serverTimestamp()
        });
        savedViagemId = novoDoc.id;
      }

      if (colName === 'viagens') {
        await syncFinanceiroPorViagem({ ...payload, id: savedViagemId });
      }

      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar as alterações da viagem. Verifique os campos obrigatórios e tente novamente.');
    }
  };

  const resetForm = () => {
    setFormData({ ...INITIAL_FORM_DATA });
  };

  const lucroViagem = (parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0);

  const handleOpenSheetUrl = () => {
    const input = window.prompt('Cole o link da planilha para abrir no Sheets:');
    const url = (input || '').trim();
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openInNewWindow = (url) => {
    const link = (url || '').trim();
    if (!link) return;

    const isImagemInline = link.startsWith('data:image/');
    if (isImagemInline) {
      const novaJanela = window.open('', '_blank');
      if (!novaJanela) return;
      novaJanela.document.write(`
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>Comprovante</title>
            <style>
              html, body { margin: 0; padding: 0; background: #0f172a; height: 100%; }
              body { display: flex; align-items: center; justify-content: center; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${link}" alt="Comprovante" />
          </body>
        </html>
      `);
      novaJanela.document.close();
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
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
          <NavItem icon={FileText} label="Cotação" active={activeTab === 'cotacao'} onClick={() => setActiveTab('cotacao')} />
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
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Controle de viagens</h3>
                    <p className="text-xs font-semibold text-slate-500">Qualidade operacional e pendências de documentação</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 text-white"><Package size={20} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Card title="Total de viagens" value={viagensPainelResumo.totalViagens} icon={Package} color="bg-slate-700" />
                  <Card title="Sem comprovante" value={viagensPainelResumo.semComprovante} icon={Paperclip} color="bg-amber-500" active={viagensPainelFiltro === 'semComprovante'} onClick={() => setViagensPainelFiltro(prev => prev === 'semComprovante' ? '' : 'semComprovante')} />
                  <Card title="Sem motorista" value={viagensPainelResumo.semMotorista} icon={Users} color="bg-rose-500" active={viagensPainelFiltro === 'semMotorista'} onClick={() => setViagensPainelFiltro(prev => prev === 'semMotorista' ? '' : 'semMotorista')} />
                  <Card title="CT-e pendente" value={viagensPainelResumo.ctePendente} icon={FileText} color="bg-indigo-600" active={viagensPainelFiltro === 'ctePendente'} onClick={() => setViagensPainelFiltro(prev => prev === 'ctePendente' ? '' : 'ctePendente')} />
                </div>

                {viagensPainelFiltro && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                        {viagensPainelFiltro === 'semComprovante' ? 'Sem comprovante' : viagensPainelFiltro === 'semMotorista' ? 'Sem motorista' : 'CT-e pendente'}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400">{viagensPendenciasFiltradas.length} registro(s)</span>
                    </div>
                    {viagensPainelFiltro === 'semComprovante' ? (
                      <div className="p-3 space-y-3">
                        {viagensPendenciasSemComprovantePorCarga.map(grupo => (
                          <div key={`pend-grupo-${grupo.numeroCarga}`} className="rounded-xl border border-slate-100 overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                              <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga === 'Sem carga' ? 'Sem carga' : getCargaLabel({ numeroCarga: grupo.numeroCarga, tipoCarga: (grupo.itens?.[0]?.tipoCarga || '') })}</h5>
                              <span className="text-[10px] font-bold text-slate-400">{grupo.itens.length} NF(s)</span>
                            </div>
                            <div className="divide-y divide-slate-50">
                              {grupo.itens.map(item => (
                                <div key={`pend-${item.id}`} className="px-4 py-3 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-black text-slate-800">NF {item.numeroNF || '---'}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{item.contratante || 'Sem contratante'}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => handleOpenEdit(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase hover:bg-blue-100">
                                      <Edit3 size={12}/> Editar
                                    </button>
                                    <button onClick={() => setDetailItem(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase hover:bg-indigo-100">
                                      <Eye size={12}/> Ver dados
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {viagensPendenciasFiltradas.map(item => (
                          <div key={`pend-${item.id}`} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-800">Carga {getCargaLabel(item)} · NF {item.numeroNF || '---'}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">{item.contratante || 'Sem contratante'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleOpenEdit(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase hover:bg-blue-100">
                                <Edit3 size={12}/> Editar
                              </button>
                              <button onClick={() => setDetailItem(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase hover:bg-indigo-100">
                                <Eye size={12}/> Ver dados
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {viagensAgrupadasPorCarga.map(grupo => (
                <div key={`grupo-${grupo.numeroCarga}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga === 'Sem carga' ? 'Sem carga' : getCargaLabel({ numeroCarga: grupo.numeroCarga, tipoCarga: (grupo.itens?.[0]?.tipoCarga || '') })}</h3>
                    <span className="text-[10px] font-bold text-slate-400">{grupo.itens.length} NFs</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {grupo.itens.map(item => (
                      <div key={`item-${item.id}`} className="p-3 rounded-xl border border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-800">NF {item.numeroNF || '---'} · CT-e {getNumeroCTeResolvido(item) || '---'}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{item.contratante || 'Sem contratante'} · Destino: {item.destinatario || item.cidade || 'Sem destino'} · Motorista: {item.motorista || 'Sem motorista'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusViagem(item) === 'Em rota' ? 'bg-blue-100 text-blue-600' : getStatusViagem(item) === 'Entregue' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            {getStatusViagem(item)}
                          </span>
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><Edit3 size={16}/></button>
                          <button onClick={() => setDetailItem(item)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Ver dados"><Eye size={16}/></button>
                          <button onClick={async () => { if (confirm('Deseja realmente excluir este registro?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'viagens', item.id)); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 size={16}/></button>
                        </div>
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
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card title="Quanto Faturou" value={`R$ ${financeiroResumo.faturou.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} color="bg-indigo-600" />
                <Card title="Gasto Distribuição" value={`R$ ${financeiroResumo.gastouDistribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Truck} color="bg-amber-500" />
                <Card title="Lucro" value={`R$ ${financeiroResumo.lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={CheckCircle2} color="bg-emerald-600" />
              </div>

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
                          <p className="text-[10px] font-black text-indigo-600 uppercase">Carga #{getCargaLabel(item)}</p>
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

          {activeTab === 'cotacao' && (
            <div className="space-y-6 mb-8">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4">
                    <img src="/logo-cargofy.svg" alt="Logo CargoFy" className="h-14 w-14 rounded-xl object-contain border border-slate-200 p-1" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cotação Profissional</h3>
                      <p className="text-xs font-semibold text-slate-500">Gere PDF ou imagem para envio ao cliente com identidade CargoFy.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={gerarCotacaoPDF} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all">
                      <FileText size={14} /> Gerar PDF
                    </button>
                    <button onClick={gerarCotacaoImagem} className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase transition-all">
                      <Download size={14} /> Gerar Imagem
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <Input label="Cliente" value={cotacaoData.cliente} onChange={(value) => handleCotacaoChange('cliente', value)} placeholder="Nome da empresa / contato" />
                  <Input label="Origem" value={cotacaoData.origem} onChange={(value) => handleCotacaoChange('origem', value)} placeholder="Cidade/UF de coleta" />
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipo de Carga</label>
                    <select
                      value={cotacaoData.tipoCarga}
                      onChange={(e) => handleCotacaoChange('tipoCarga', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-100 rounded-xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-sm font-semibold transition-all"
                    >
                      <option value="fracionado">Fracionado</option>
                      <option value="dedicado">Dedicado</option>
                    </select>
                  </div>
                  <Input label="Prazo" value={cotacaoData.prazo} onChange={(value) => handleCotacaoChange('prazo', value)} placeholder="Ex.: 24h úteis" />
                  <Input label="Peso" value={cotacaoData.peso} onChange={(value) => handleCotacaoChange('peso', value)} placeholder="Ex.: 850 kg" />
                  <Input label="Volume" value={cotacaoData.volume} onChange={(value) => handleCotacaoChange('volume', value)} placeholder="Ex.: 4 m³" />
                  <Input label="Valor do frete (R$)" type="number" value={cotacaoData.valorFrete} onChange={(value) => handleCotacaoChange('valorFrete', value)} placeholder="0,00" />
                  <Input label="Validade (dias)" type="number" value={cotacaoData.validade} onChange={(value) => handleCotacaoChange('validade', value)} placeholder="3" />
                  <Input label="Quantidade de Notas Fiscais" type="number" value={cotacaoData.numeroNotasFiscais || '1'} onChange={(value) => handleCotacaoChange('numeroNotasFiscais', value)} placeholder="1" />
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Cidades de entrega (ordenadas da mais próxima para a mais distante)</h4>
                    <button onClick={adicionarCidadeEntrega} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase hover:bg-blue-700">
                      <Plus size={12} /> Adicionar cidade
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {cotacaoData.cidadesEntrega.map((cidade, index) => (
                      <div key={`cidade-${index}`} className="flex gap-2">
                        <div className="flex-1">
                          <Input label={`Entrega ${index + 1}`} value={cidade} onChange={(value) => handleCidadeEntregaChange(index, value)} placeholder="Cidade/UF de entrega" />
                        </div>
                        <button
                          onClick={() => removerCidadeEntrega(index)}
                          className="mt-6 p-2 h-fit rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Remover cidade"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
                  <Input label="Observações" value={cotacaoData.observacoes} onChange={(value) => handleCotacaoChange('observacoes', value)} placeholder="Informações comerciais adicionais" />
                  <button onClick={calcularDistanciaKm} className="h-11 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase transition-all">
                    {cotacaoCalculandoKm ? 'Calculando...' : 'Calcular KM + Ordenar Rota'}
                  </button>
                  <div className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black uppercase text-center">
                    KM: {cotacaoDistanciaKm ? cotacaoDistanciaKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 items-center">
                  <button onClick={salvarCotacao} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase transition-all">
                    <CheckCircle2 size={14} /> {cotacaoAtualId ? 'Atualizar Cotação' : 'Salvar Cotação'}
                  </button>
                  <button onClick={handleCopyCotacao} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase transition-all">
                    <Paperclip size={14} /> Copiar Texto
                  </button>
                  <button onClick={limparCotacao} className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase transition-all">
                    <X size={14} /> Limpar dados
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase">
                      Nº: {cotacoes.find(c => c.id === cotacaoAtualId)?.numeroCotacao || 'Não salvo'}
                    </div>
                    <div className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black uppercase">
                      Valor: R$ {valorFreteCotacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Prévia da mensagem para WhatsApp/E-mail</h4>
                <textarea
                  value={mensagemCotacao}
                  readOnly
                  className="w-full min-h-[240px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none"
                />
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Cotações salvas</h4>
                  <span className="text-[10px] font-bold text-slate-400">{cotacoes.length} registro(s)</span>
                </div>
                <div className="space-y-3">
                  {cotacoes
                    .slice()
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                    .map((cotacao) => (
                      <div key={cotacao.id} className="border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-indigo-600 uppercase">{cotacao.numeroCotacao || 'Sem número'}</p>
                          <p className="text-sm font-bold text-slate-800">{cotacao.cliente || 'Cliente não informado'}</p>
                          <p className="text-[11px] text-slate-500 font-semibold">Rota: {cotacao.rota || '---'}</p>
                          <p className="text-[10px] font-bold text-slate-500">Notas: {cotacao.numeroNotasFiscais || 1} rota(s)</p>
                          <p className={`text-[10px] font-black uppercase mt-1 ${(cotacao.statusCotacao || 'Em análise') === 'Aprovada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {cotacao.statusCotacao || 'Em análise'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => carregarCotacao(cotacao)} className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-black uppercase hover:bg-blue-100">
                            Carregar
                          </button>
                          <button
                            onClick={() => aprovarCotacao(cotacao)}
                            disabled={(cotacao.statusCotacao || '').toLowerCase() === 'aprovada'}
                            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Aprovar e virar carga
                          </button>
                          <button
                            onClick={() => excluirCotacao(cotacao)}
                            className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-[10px] font-black uppercase hover:bg-rose-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  {!cotacoes.length && <p className="text-sm font-semibold text-slate-500">Nenhuma cotação salva ainda.</p>}
                </div>
              </div>
            </div>
          )}


          {activeTab !== 'relatorios' && activeTab !== 'dashboard' && activeTab !== 'viagens' && activeTab !== 'financeiro' && activeTab !== 'cotacao' && (
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
                          {item.numeroCarga && <p className="text-[10px] font-black text-indigo-600 uppercase">Carga #{getCargaLabel(item)}</p>}
                          {(item.boleto || item.urlBoleto || item.urlComprovante) && (
                            <a href={item.boleto || item.urlBoleto || item.urlComprovante} target="_blank" rel="noreferrer" title="Ver Comprovante" onClick={(e) => { e.preventDefault(); openInNewWindow(item.boleto || item.urlBoleto || item.urlComprovante); }} className="text-emerald-500 hover:scale-110 transition-transform">
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
              {financeiroAgrupadoPorCarga.map(grupo => {
                const resumoFrete = grupo.itens.reduce((acc, curr) => acc + (parseFloat(curr.valorFrete) || 0), 0);
                const resumoCusto = grupo.itens.reduce((acc, curr) => acc + (parseFloat(curr.valorDistribuicao) || 0), 0);
                const resumoLucro = resumoFrete - resumoCusto;

                return (
                <div key={`fin-grupo-${grupo.numeroCarga}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga === 'Sem carga' ? 'Sem carga' : getCargaLabel({ numeroCarga: grupo.numeroCarga, tipoCarga: (grupo.itens?.[0]?.tipoCarga || '') })}</h3>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 block">{grupo.itens.length} boletos</span>
                      <span className="text-[10px] font-semibold text-slate-500 block">Fechado: R$ {resumoFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Gasto: R$ {resumoCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Lucro: R$ {resumoLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {grupo.itens.map(item => (
                      <div key={`fin-item-${item.id}`} className="px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-slate-800">NF {item.numeroNF || '---'} · (Boleto {item.numeroBoleto || '---'}) CT-e {getNumeroCTeResolvido(item) || '---'}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{item.contratante || 'Sem contratante'} · Motorista: {item.motorista || 'Sem motorista'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-700">Venc: {(item.dataVencimentoBoleto || item.vencimento) ? new Date(((item.dataVencimentoBoleto || item.vencimento) + 'T12:00:00')).toLocaleDateString('pt-BR') : '---'}</p>
                            <span className={`w-fit ml-auto px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusFinanceiro(item) === 'Pago' ? 'bg-emerald-100 text-emerald-600' : getStatusFinanceiro(item) === 'Vencido' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{getStatusFinanceiro(item)}</span>
                          </div>
                          <button onClick={() => handleOpenEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar"><Edit3 size={16}/></button>
                          <button onClick={() => setDetailItem(item)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Ver dados"><Eye size={16}/></button>
                          <button onClick={async () => { if (confirm('Deseja realmente excluir este registro?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'financeiro', item.id)); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Excluir"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
              })}
            </div>
          )}

          {activeTab === 'dashboard' && dashboardCargaFilter && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Dashboard Cargas - {dashboardCargaFilter}</h3>
                <span className="text-[10px] font-bold text-slate-400">{dashboardViagensFiltradas.length} registros</span>
              </div>
              {['Entregue', 'Em rota'].includes(dashboardCargaFilter) ? (
                <div className="p-4 space-y-3">
                  {dashboardViagensFiltradasPorCarga.map(grupo => (
                    <div key={`dash-carga-${dashboardCargaFilter}-${grupo.numeroCarga}`} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga === 'Sem carga' ? 'Sem carga' : getCargaLabel({ numeroCarga: grupo.numeroCarga, tipoCarga: (grupo.itens?.[0]?.tipoCarga || '') })}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{grupo.itens.length} NF(s)</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {grupo.itens.map(item => (
                          <div key={`dash-v-${item.id}`} className="px-4 py-3 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-800">NF {item.numeroNF || '---'} · CT-e {getNumeroCTeResolvido(item) || '---'}</p>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.contratante || 'Contratante não informado'}</p>
                              <p className="text-[10px] font-black text-slate-500 uppercase">{item.cidade || 'Destino não informado'} · {item.motorista || 'Sem motorista'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${dashboardCargaFilter === 'Em rota' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{dashboardCargaFilter}</span>
                              <button onClick={() => setDetailItem(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase hover:bg-indigo-100">
                                <Eye size={12}/> Ver dados
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Carga / NF / Empresa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">CT-e</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Destino / Motorista</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Dados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dashboardViagensFiltradas.map(item => (
                    <tr key={`dash-v-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">Carga {getCargaLabel(item)} · NF {item.numeroNF || '---'}</p>
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
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setDetailItem(item)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase hover:bg-indigo-100">
                          <Eye size={12}/> Ver dados
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
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
                <div className="p-4 space-y-3">
                  {dashboardBoletosFiltradosPorCarga.map(grupo => (
                    <div key={`dash-boleto-carga-${grupo.numeroCarga}`} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Carga {grupo.numeroCarga === 'Sem carga' ? 'Sem carga' : getCargaLabel({ numeroCarga: grupo.numeroCarga, tipoCarga: (grupo.itens?.[0]?.tipoCarga || '') })}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{grupo.itens.length} boletos</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {grupo.itens.map(item => (
                          <div key={`dash-fin-${item.id}`} className="px-4 py-3 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <p className="font-bold text-slate-800">NF {item.numeroNF || '---'} · {item.contratante || 'Contratante não informado'}</p>
                              <p className="text-[10px] font-black text-slate-500 uppercase">Vencimento: {(item.dataVencimentoBoleto || item.vencimento) ? new Date(((item.dataVencimentoBoleto || item.vencimento) + 'T12:00:00')).toLocaleDateString('pt-BR') : '---'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusFinanceiro(item) === 'Pago' ? 'bg-emerald-100 text-emerald-600' : getStatusFinanceiro(item) === 'Vencido' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                {getStatusFinanceiro(item)}
                              </span>
                              <button onClick={() => setDetailItem(item)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Ver dados"><Eye size={16}/></button>
                              {(item.boleto || item.urlBoleto || item.urlComprovante) ? (
                                <a href={item.boleto || item.urlBoleto || item.urlComprovante} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); openInNewWindow(item.boleto || item.urlBoleto || item.urlComprovante); }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">Abrir <ExternalLink size={12} /></a>
                              ) : <span className="text-[10px] font-bold text-slate-400">Sem link</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              )}
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
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipo da Carga</label>
                    <select className="w-full p-3 bg-slate-100 rounded-xl text-sm font-bold uppercase outline-none border border-transparent focus:border-blue-400" value={formData.tipoCarga || ''} onChange={e => setFormData({...formData, tipoCarga: e.target.value})}>
                      <option value="">Selecionar...</option>
                      <option value="Dedicada">Dedicada</option>
                      <option value="Fracionada">Fracionada</option>
                    </select>
                  </div>
                  <Input label="Número do CT-e" value={formData.numeroCTe} onChange={v => setFormData({...formData, numeroCTe: v})} disabled={formData.tipoCarga === 'Dedicada'} />
                  <Input label="Data do CT-e" type="date" value={formData.dataCTe} onChange={v => setFormData({...formData, dataCTe: v})} disabled={formData.tipoCarga === 'Dedicada'} />
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

              {/* Seção 4: Comprovante e conclusão */}
              {formData.status === 'Entregue' ? (
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={18} />
                      <h4 className="text-xs font-black uppercase tracking-wider">Comprovante de Entrega</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Data da Entrega Realizada" type="date" value={formData.dataEntrega} onChange={v => setFormData({...formData, dataEntrega: v})} />
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Foto do Comprovante</label>
                      <p className="text-[10px] text-emerald-700 font-semibold">Anexe o comprovante após marcar a carga como entregue e clique em salvar.</p>
                      <div className="flex gap-2 items-start">
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const fotoProcessada = await processarFotoComprovante(file);
                              setFormData((prev) => ({ ...prev, urlComprovante: fotoProcessada }));
                            } catch (error) {
                              alert('Não foi possível processar a foto do comprovante. Tente JPG ou PNG.');
                            } finally {
                              e.target.value = '';
                            }
                          }}
                          className="flex-1 px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700"
                        />
                        {formData.urlComprovante && (
                          <a href={formData.urlComprovante} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); openInNewWindow(formData.urlComprovante); }} className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>
                      {formData.urlComprovante && (
                        <a href={formData.urlComprovante} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); openInNewWindow(formData.urlComprovante); }} title="Abrir comprovante em nova aba" className="inline-block mt-2">
                          <img src={formData.urlComprovante} alt="Pré-visualização do comprovante" className="h-20 w-20 object-cover rounded-lg border border-emerald-200 hover:opacity-90 transition-opacity cursor-pointer" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50">
                  <p className="text-[11px] font-black text-amber-700 uppercase">Comprovante disponível quando status for Entregue.</p>
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
            <Info label="Número da Carga" value={getCargaLabel(detailItem)} />
            <Info label="NF" value={detailItem.numeroNF} />
            <Info label="Chave de Acesso (NF-e)" value={getChaveIDResolvida(detailItem)} />
            <Info label="Número do CT-e" value={getNumeroCTeResolvido(detailItem)} />
            <Info label="Data do CT-e" value={getDataCTeResolvida(detailItem) ? new Date(getDataCTeResolvida(detailItem) + 'T12:00:00').toLocaleDateString('pt-BR') : ''} />
            <Info label="Data da Entrega" value={getDataEntregaResolvida(detailItem) ? new Date(`${getDataEntregaResolvida(detailItem)}T12:00:00`).toLocaleDateString('pt-BR') : ''} />
            <Info label="Contratante" value={detailItem.contratante} />
            <Info label="Destinatário" value={detailItem.destinatario} />
            <Info label="Cidade" value={detailItem.cidade} />
            <Info label="Motorista" value={detailItem.motorista} />
            <Info label="Veículo" value={getVeiculoResolvido(detailItem)} />
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
                  <a href={detailItem.urlComprovante} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); openInNewWindow(detailItem.urlComprovante); }} title="Abrir comprovante em nova aba" className="inline-block">
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
      <p className="font-bold text-slate-800 break-all">{value || '---'}</p>
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

function Input({ label, type = "text", value, onChange, placeholder = "", disabled = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder}
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-slate-100 rounded-xl outline-none border border-transparent focus:border-blue-400 focus:bg-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed" 
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
