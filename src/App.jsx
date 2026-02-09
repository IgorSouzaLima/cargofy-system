import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, query } from 'firebase/firestore';
import { 
  LayoutDashboard, Truck, Users, DollarSign, Plus, Package, MapPin, X, Trash2, 
  Briefcase, LogOut, Clock, FileText, Search, Calendar, Layers, 
  CheckCircle2, AlertCircle, Edit3, Download, Camera, Paperclip, ExternalLink, Building2, Eye
} from 'lucide-react';
import Card from './components/Card';
import Modal from './components/Modal';
import NavItem from './components/NavItem';
import Input from './components/Input';
import Info from './components/Info';
import Login from './components/Login';

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

// --- APP PRINCIPAL ---

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [boletoFilter, setBoletoFilter] = useState('');
  const [dashboardMes, setDashboardMes] = useState('');
  const [viagens, setViagens] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchNF, setSearchNF] = useState('');
  const [reportEmpresa, setReportEmpresa] = useState('Todas');
  const [reportInicio, setReportInicio] = useState('');
  const [reportFim, setReportFim] = useState('');
  const [reportNumeroCarga, setReportNumeroCarga] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [comprovantePreview, setComprovantePreview] = useState('');

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
    tipo: ''
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

  const getStatusViagem = (viagem) => {
    const chave = (viagem.numeroCarga || '').trim();
    if (chave && cargaStatusMap[chave]) {
      return cargaStatusMap[chave].allEntregues ? 'Entregue' : 'Em rota';
    }
    return viagem.status || 'Pendente';
  };

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

  const viagensDashboardMes = useMemo(() => {
    if (!dashboardMes) return viagens;
    return viagens.filter((v) => {
      const dataBase = v.dataSaida || v.dataNF || v.dataEntrega || v.dataCTe || '';
      return dataBase.startsWith(dashboardMes);
    });
  }, [viagens, dashboardMes]);

  const financeiroDashboardMes = useMemo(() => {
    if (!dashboardMes) return financeiro;
    return financeiro.filter((f) => {
      const dataBase = f.dataVencimentoBoleto || f.vencimento || '';
      return dataBase.startsWith(dashboardMes);
    });
  }, [financeiro, dashboardMes]);

  const stats = useMemo(() => {
    const pendentes = viagensDashboardMes.filter(v => getStatusViagem(v) === 'Pendente').length;
    const emRota = viagensDashboardMes.filter(v => getStatusViagem(v) === 'Em rota').length;
    const entregues = viagensDashboardMes.filter(v => getStatusViagem(v) === 'Entregue').length;
    return { pendentes, emRota, entregues, total: viagensDashboardMes.length };
  }, [viagensDashboardMes]);

  const boletoStats = useMemo(() => {
    const boletosGerados = financeiroDashboardMes.length;
    const boletosPagos = financeiroDashboardMes.filter(f => getStatusFinanceiro(f) === 'Pago').length;
    const boletosAtrasados = financeiroDashboardMes.filter(f => getStatusFinanceiro(f) === 'Vencido').length;
    const boletosPendentes = financeiroDashboardMes.filter(f => getStatusFinanceiro(f) === 'Pendente').length;

    return { boletosGerados, boletosPendentes, boletosAtrasados, boletosPagos };
  }, [financeiroDashboardMes]);

  const boletosDashboardFiltrados = useMemo(() => {
    if (!boletoFilter) return [];
    let lista = boletoFilter === 'Gerados'
      ? financeiroDashboardMes
      : financeiroDashboardMes.filter((f) => getStatusFinanceiro(f) === boletoFilter);

    if (!searchNF) return lista;
    const term = searchNF.toLowerCase();
    return lista.filter((item) =>
      (item.numeroNF || '').toLowerCase().includes(term) ||
      (item.numeroCarga || '').toLowerCase().includes(term) ||
      (item.contratante || '').toLowerCase().includes(term)
    );
  }, [financeiroDashboardMes, boletoFilter, searchNF]);

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

  const enviarRelatorioPorEmail = async () => {
    const emailDestino = window.prompt('Informe o e-mail de destino para envio do relatório:');
    if (!emailDestino) return;

    const assunto = `Relatório CargoFy${reportNumeroCarga ? ` - Carga ${reportNumeroCarga}` : ''}`;

    const colunas = relatorioPorCarga
      ? ['Carga', 'NF', 'CT-e', 'Data', 'Empresa', 'Número Boleto', 'Frete']
      : ['Carga', 'NF', 'CT-e', 'Data', 'Empresa', 'Frete', 'Distribuição', 'Lucro'];

    const linhas = relatorioData.map((item) => {
      const data = item.dataSaida || item.dataNF || item.dataEntrega;
      const dataFmt = data ? new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR') : '---';
      const frete = `R$ ${(parseFloat(item.valorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

      if (relatorioPorCarga) {
        return [
          item.numeroCarga || '---',
          item.numeroNF || '---',
          item.numeroCTe || '---',
          dataFmt,
          item.contratante || 'Sem empresa',
          item.numeroBoleto || '---',
          frete
        ];
      }

      return [
        item.numeroCarga || '---',
        item.numeroNF || '---',
        item.numeroCTe || '---',
        dataFmt,
        item.contratante || 'Sem empresa',
        frete,
        `R$ ${(parseFloat(item.valorDistribuicao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ];
    });

    const largura = 1600;
    const alturaLinha = 38;
    const alturaCabecalho = 180;
    const alturaRodape = 36;
    const altura = Math.max(420, alturaCabecalho + (linhas.length + 1) * alturaLinha + alturaRodape);

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Não foi possível gerar a imagem do relatório.');
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);

    const logo = new Image();
    logo.src = `${window.location.origin}/logo-cargofy.svg`;
    await new Promise((resolve) => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });

    if (logo.complete && logo.naturalWidth) {
      ctx.drawImage(logo, 40, 28, 72, 72);
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '900 34px Arial';
    ctx.fillText('Relatório CargoFy', 130, 66);
    ctx.font = '600 18px Arial';
    ctx.fillStyle = '#475569';
    ctx.fillText(`Empresa: ${reportEmpresa} | Carga: ${reportNumeroCarga || 'Todas'} | Registros: ${relatorioData.length}`, 130, 98);

    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(30, 128, largura - 60, alturaLinha);

    const colWidth = (largura - 60) / colunas.length;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    ctx.fillStyle = '#334155';
    ctx.font = '700 14px Arial';
    colunas.forEach((col, i) => {
      const x = 35 + i * colWidth;
      ctx.fillText(col, x, 152);
      ctx.beginPath();
      ctx.moveTo(30 + (i + 1) * colWidth, 128);
      ctx.lineTo(30 + (i + 1) * colWidth, altura - alturaRodape);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.moveTo(30, 128);
    ctx.lineTo(30, altura - alturaRodape);
    ctx.lineTo(largura - 30, altura - alturaRodape);
    ctx.lineTo(largura - 30, 128);
    ctx.closePath();
    ctx.stroke();

    ctx.font = '600 13px Arial';
    linhas.forEach((linha, idx) => {
      const yTop = 128 + alturaLinha * (idx + 1);
      if (idx % 2 === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(30, yTop, largura - 60, alturaLinha);
      }

      ctx.fillStyle = '#0f172a';
      linha.forEach((valor, i) => {
        const x = 35 + i * colWidth;
        const texto = String(valor);
        ctx.fillText(texto.length > 28 ? `${texto.slice(0, 28)}...` : texto, x, yTop + 24);
      });

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(30, yTop + alturaLinha);
      ctx.lineTo(largura - 30, yTop + alturaLinha);
      ctx.stroke();
    });

    const dataURL = canvas.toDataURL('image/png');
    const download = document.createElement('a');
    download.href = dataURL;
    download.download = `relatorio_cargofy_${reportNumeroCarga || 'geral'}.png`;
    download.click();

    const corpo = [
      'Olá,',
      '',
      'Segue o relatório CargoFy.',
      'A imagem do relatório foi gerada e baixada automaticamente para anexar neste e-mail.',
      '',
      `Empresa: ${reportEmpresa}`,
      `Carga: ${reportNumeroCarga || 'Todas'}`,
      `Período: ${reportInicio || 'Início'} até ${reportFim || 'Hoje'}`,
      `Registros: ${relatorioData.length}`
    ].join('\n');

    const mailto = `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = mailto;
  };


  const normalizarChaveColuna = (valor) => (valor || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const mapearLinhaPlanilha = (headers, valores) => {
    const row = {};
    headers.forEach((h, i) => { row[normalizarChaveColuna(h)] = (valores[i] || '').trim(); });

    const get = (...keys) => {
      for (const key of keys) {
        const val = row[normalizarChaveColuna(key)];
        if (val) return val;
      }
      return '';
    };

    const metodoPagamento = get('metodo pagamento', 'metodopagamento', 'pagamento');
    const numeroBoleto = get('numero boleto', 'numeroboleto', 'boleto numero', 'boleto');

    return {
      numeroNF: get('numero nf', 'nf', 'nota fiscal', 'numeronf'),
      numeroCarga: get('numero carga', 'carga', 'numerocarga'),
      numeroCTe: get('numero cte', 'cte', 'numerocte'),
      dataCTe: get('data cte', 'datacte'),
      dataNF: get('data nf', 'datanf'),
      dataSaida: get('data saida', 'datasaida'),
      dataEntrega: get('data entrega', 'dataentrega'),
      contratante: get('contratante', 'empresa'),
      destinatario: get('destinatario', 'empresa destinataria'),
      cidade: get('cidade', 'cidade destino'),
      valorFrete: get('valor frete', 'frete', 'valorfrete'),
      valorDistribuicao: get('valor distribuicao', 'distribuicao', 'valordistribuicao'),
      motorista: get('motorista'),
      metodoPagamento: metodoPagamento,
      numeroBoleto: numeroBoleto,
      dataVencimentoBoleto: get('data vencimento boleto', 'vencimento boleto', 'datavencimentoboleto'),
      status: get('status') || 'Pendente',
      statusFinanceiro: get('status financeiro', 'statusfinanceiro') || 'Pendente',
      boleto: get('link boleto', 'url boleto', 'boleto link', 'link comprovante', 'url comprovante'),
      urlComprovante: get('url comprovante', 'link comprovante', 'comprovante'),
      lucro: ((parseFloat(get('valor frete', 'frete', 'valorfrete')) || 0) - (parseFloat(get('valor distribuicao', 'distribuicao', 'valordistribuicao')) || 0)).toFixed(2)
    };
  };

  const importarConteudoPlanilha = async (conteudo) => {
    const linhasBrutas = conteudo.split(/\r?\n/).filter(Boolean);
    if (linhasBrutas.length < 2) {
      alert('Planilha vazia ou inválida. Use CSV com cabeçalho.');
      return;
    }

    const separador = linhasBrutas[0].includes(';') ? ';' : ',';
    const parseLinha = (linha) => linha.split(separador).map((v) => v.replace(/^\"|\"$/g, '').trim());

    const headers = parseLinha(linhasBrutas[0]);
    const linhas = linhasBrutas.slice(1).map(parseLinha);

    let inseridos = 0;
    let ignorados = 0;
    for (const valores of linhas) {
      const payload = mapearLinhaPlanilha(headers, valores);
      if (!payload.numeroCTe || !payload.dataCTe) {
        ignorados += 1;
        continue;
      }

      if (payload.metodoPagamento.toLowerCase() === 'boleto' && (!payload.numeroBoleto || !payload.dataVencimentoBoleto)) {
        ignorados += 1;
        continue;
      }

      const novoRegistro = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'viagens'), {
        ...payload,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      await syncFinanceiroPorViagem(payload, novoRegistro.id);
      inseridos += 1;
    }

    alert(`Importação concluída. Inseridos: ${inseridos}. Ignorados: ${ignorados}.`);
  };

  const construirUrlCsvGoogleSheets = (urlInformada) => {
    const url = new URL(urlInformada);
    if (!url.hostname.includes('docs.google.com')) return '';

    if (url.searchParams.get('output') === 'csv' || url.pathname.includes('/export')) {
      return url.toString();
    }

    const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
    if (!match) return '';

    const spreadsheetId = match[1];
    let gid = url.searchParams.get('gid') || '';
    if (!gid && url.hash.includes('gid=')) {
      gid = url.hash.split('gid=')[1] || '';
    }

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
  };

  const importarGoogleSheets = async () => {
    const urlInformada = window.prompt('Cole a URL do Google Sheets (aba que deseja importar):');
    if (!urlInformada) return;

    const urlCsv = construirUrlCsvGoogleSheets(urlInformada.trim());
    if (!urlCsv) {
      alert('URL inválida. Use um link do Google Sheets.');
      return;
    }

    try {
      const resp = await fetch(urlCsv);
      if (!resp.ok) throw new Error('Falha ao baixar CSV do Google Sheets.');
      const conteudo = await resp.text();
      await importarConteudoPlanilha(conteudo);
    } catch (err) {
      console.error(err);
      alert('Não foi possível importar do Google Sheets. Verifique se a planilha está publicada/compartilhada e tente novamente.');
    }
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
        ? `<tr><td>${item.numeroCarga || '---'}</td><td>${item.numeroNF || '---'}</td><td>${item.numeroCTe || '---'}</td><td>${item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td><td>${item.contratante || 'Sem empresa'}</td><td>${item.numeroBoleto || '---'}</td><td>${dataFmt}</td><td>R$ ${frete}</td></tr>`
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
            ${relatorioPorCarga ? '' : `<span>Distribuição: R$ ${resumoRelatorio.distribuicao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`}
            ${relatorioPorCarga ? '' : `<span>Lucro: R$ ${resumoRelatorio.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`}
          </div>
          <table>
            <thead>
              ${relatorioPorCarga ? '<tr><th>Carga</th><th>NF</th><th>CT-e</th><th>Data CT-e</th><th>Empresa</th><th>Número Boleto</th><th>Data</th><th>Frete</th></tr>' : '<tr><th>Carga</th><th>NF</th><th>CT-e</th><th>Data CT-e</th><th>Empresa</th><th>Data</th><th>Frete</th><th>Distribuição</th><th>Lucro</th></tr>'}
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
        list = statusFilter === 'Todos' ? [] : viagensDashboardMes.filter(v => getStatusViagem(v) === statusFilter);
        break;
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

    if (!searchNF) return list;
    const term = searchNF.toLowerCase();
    return list.filter(item => 
      (item.numeroNF?.toLowerCase().includes(term)) ||
      (item.numeroCarga?.toLowerCase().includes(term)) ||
      (item.contratante?.toLowerCase().includes(term)) ||
      (item.nome?.toLowerCase().includes(term)) ||
      (item.placa?.toLowerCase().includes(term)) ||
      (item.cidade?.toLowerCase().includes(term)) ||
      (item.motorista?.toLowerCase().includes(term))
    );
  }, [activeTab, statusFilter, viagensDashboardMes, viagens, financeiro, clientes, motoristas, veiculos, searchNF]);

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

  const syncFinanceiroPorViagem = async (viagemData, viagemId) => {
    const numeroNF = (viagemData.numeroNF || '').trim();
    const numeroCarga = (viagemData.numeroCarga || '').trim();
    const numeroBoleto = (viagemData.numeroBoleto || '').trim();
    const contratante = (viagemData.contratante || '').trim();
    const viagemOrigemId = (viagemId || viagemData.id || '').trim();
    if (!numeroNF && !numeroCarga && !numeroBoleto && !viagemOrigemId) return;

    const registroExistente = financeiro.find((f) => {
      const nfAtual = (f.numeroNF || '').trim();
      const cargaAtual = (f.numeroCarga || '').trim();
      const boletoAtual = (f.numeroBoleto || '').trim();
      const contratanteAtual = (f.contratante || '').trim();
      const origemAtual = (f.viagemOrigemId || '').trim();

      if (viagemOrigemId && origemAtual === viagemOrigemId) return true;
      if (numeroNF && numeroBoleto) {
        return nfAtual === numeroNF && boletoAtual === numeroBoleto && cargaAtual === numeroCarga && contratanteAtual === contratante;
      }
      if (numeroNF) return nfAtual === numeroNF && cargaAtual === numeroCarga && contratanteAtual === contratante;
      if (numeroBoleto) return boletoAtual === numeroBoleto && cargaAtual === numeroCarga && contratanteAtual === contratante;

      return false;
    });

    const statusInformado = (viagemData.statusFinanceiro || '').trim();
    const payloadFinanceiro = {
      viagemOrigemId: viagemOrigemId || '',
      numeroNF: numeroNF,
      numeroCarga: viagemData.numeroCarga || '',
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
      numeroBoleto: numeroBoleto,
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
      let viagemId = editingId;
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), payload);
      } else {
        const novoRegistro = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
          ...payload, userId: user.uid, createdAt: serverTimestamp()
        });
        viagemId = novoRegistro.id;
      }

      if (colName === 'viagens') {
        await syncFinanceiroPorViagem(payload, viagemId);
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
      modelo: '', tipo: ''
    });
  };

  const lucroViagem = (parseFloat(formData.valorFrete) || 0) - (parseFloat(formData.valorDistribuicao) || 0);

  if (!user) return <Login auth={auth} />;

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
                placeholder="Pesquisar por Nº Carga, NF, Contratante ou Cidade..." 
                value={searchNF}
                onChange={(e) => setSearchNF(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500/20 text-sm font-medium transition-all"
              />
            </div>
            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <input type="month" value={dashboardMes} onChange={(e) => setDashboardMes(e.target.value)} className="px-3 py-2 bg-slate-100 rounded-xl outline-none text-xs font-bold text-slate-700" />
                {dashboardMes && (
                  <button onClick={() => setDashboardMes('')} className="bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase">Limpar</button>
                )}
              </div>
            )}
            {statusFilter !== 'Todos' && (
              <button onClick={() => setStatusFilter('Todos')} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
                Filtro: {statusFilter} <X size={12}/>
              </button>
            )}
          </div>
          {activeTab !== 'relatorios' && (
            <div className="flex items-center gap-2">
              {(activeTab === 'dashboard' || activeTab === 'viagens') && (
                <>
                  <button type="button" onClick={importarGoogleSheets} className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-teal-500/20 transition-all">
                    <ExternalLink size={16} /> Google Sheets
                  </button>
                </>
              )}
              <button onClick={() => { resetForm(); setEditingId(null); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 transition-all">
                <Plus size={16} /> Novo Registro
              </button>
            </div>
          )}
        </header>

        <div className="p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card title="Cargas Pendentes" value={stats.pendentes} icon={Clock} color="bg-amber-500" active={statusFilter === 'Pendente'} onClick={() => setStatusFilter('Pendente')} />
              <Card title="Cargas em Rota" value={stats.emRota} icon={MapPin} color="bg-blue-600" active={statusFilter === 'Em rota'} onClick={() => setStatusFilter('Em rota')} />
              <Card title="Concluídas" value={stats.entregues} icon={CheckCircle2} color="bg-emerald-500" active={statusFilter === 'Entregue'} onClick={() => setStatusFilter('Entregue')} />
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
                  <button onClick={enviarRelatorioPorEmail} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all">
                    <Download size={16} /> Enviar Relatório por E-mail
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
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Carga / NF</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">CT-e</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Frete</th>
                      {relatorioPorCarga && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Empresa</th>}
                      {relatorioPorCarga && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Número Boleto</th>}
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
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{!relatorioPorCarga ? (item.contratante || 'Sem empresa') : ''}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.dataCTe ? new Date(item.dataCTe + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.dataSaida || item.dataNF || item.dataEntrega ? new Date((item.dataSaida || item.dataNF || item.dataEntrega) + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {(parseFloat(item.valorFrete) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        {relatorioPorCarga && <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.contratante || 'Sem empresa'}</td>}
                        {relatorioPorCarga && <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.numeroBoleto || '---'}</td>}
                        {!relatorioPorCarga && <td className="px-6 py-4 text-sm font-bold text-slate-700">R$ {(parseFloat(item.valorDistribuicao) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {!relatorioPorCarga && <td className="px-6 py-4 text-sm font-black text-emerald-700">R$ {((parseFloat(item.valorFrete) || 0) - (parseFloat(item.valorDistribuicao) || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab !== 'relatorios' && (
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
                {filteredData.length === 0 && activeTab === 'dashboard' && statusFilter === 'Todos' && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">Selecione um card de cargas para visualizar os dados</td></tr>
                )}
                {filteredData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">{item.numeroNF || item.nome || item.modelo || "---"}</p>
                          {item.numeroCarga && <p className="text-[10px] font-black text-indigo-600 uppercase">Carga #{item.numeroCarga}</p>}
                          {(item.boleto || item.urlBoleto || item.urlComprovante) && (
                            <button type="button" onClick={() => setComprovantePreview(item.boleto || item.urlBoleto || item.urlComprovante)} title="Ver Comprovante" className="text-emerald-500 hover:scale-110 transition-transform">
                              <Paperclip size={14} />
                            </button>
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

          {activeTab === 'dashboard' && (
            <div className="space-y-6 mt-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card title="Boletos Gerados" value={boletoStats.boletosGerados} icon={FileText} color="bg-indigo-600" active={boletoFilter === 'Gerados'} onClick={() => setBoletoFilter('Gerados')} />
                <Card title="Boletos Pendentes" value={boletoStats.boletosPendentes} icon={Clock} color="bg-amber-500" active={boletoFilter === 'Pendente'} onClick={() => setBoletoFilter('Pendente')} />
                <Card title="Boletos Atrasados" value={boletoStats.boletosAtrasados} icon={AlertCircle} color="bg-rose-600" active={boletoFilter === 'Vencido'} onClick={() => setBoletoFilter('Vencido')} />
                <Card title="Boletos Pagos" value={boletoStats.boletosPagos} icon={CheckCircle2} color="bg-emerald-600" active={boletoFilter === 'Pago'} onClick={() => setBoletoFilter('Pago')} />
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Dashboard Boletos</h3>
                  <span className="text-[10px] font-bold text-slate-400">{boletosDashboardFiltrados.length} registros</span>
                </div>
                {!boletoFilter && (
                  <div className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">Selecione um card de boletos para visualizar os dados</div>
                )}
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
                    {boletosDashboardFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-xs font-bold text-slate-400 uppercase">Sem boletos para o filtro selecionado</td>
                      </tr>
                    )}
                    {boletosDashboardFiltrados.map(item => (
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
                            <button type="button" onClick={() => setComprovantePreview(item.boleto || item.urlBoleto || item.urlComprovante)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">Abrir <ExternalLink size={12} /></button>
                          ) : <span className="text-[10px] font-bold text-slate-400">Sem link</span>}
                        </td>
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

          <div className="flex gap-3 pt-8 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Descartar</button>
            <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
              {editingId ? "Atualizar Registro" : "Confirmar Cadastro"}
            </button>
          </div>
        </form>
      </Modal>


      <Modal isOpen={!!comprovantePreview} onClose={() => setComprovantePreview('')} title="Comprovante">
        <div className="space-y-4">
          <img src={comprovantePreview} alt="Comprovante" className="max-h-[70vh] w-auto max-w-full mx-auto rounded-xl border border-slate-200 object-contain" />
          <div className="flex justify-end">
            <a href={comprovantePreview} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-black uppercase">
              Abrir em nova aba <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </Modal>
      <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Detalhes da Carga">
        {detailItem && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Info label="Número da Carga" value={detailItem.numeroCarga} />
            <Info label="NF" value={detailItem.numeroNF} />
            <Info label="Número do CT-e" value={detailItem.numeroCTe} />
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
            <div className="md:col-span-2">
              <Info label="Comprovante" value={detailItem.urlComprovante ? 'Foto anexada' : 'Sem comprovante'} />
              {detailItem.urlComprovante && (
                <div className="mt-2">
                  <button type="button" onClick={() => setComprovantePreview(detailItem.urlComprovante)} title="Abrir comprovante" className="inline-block">
                    <img src={detailItem.urlComprovante} alt="Comprovante da carga" className="h-28 w-28 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


export default App;
