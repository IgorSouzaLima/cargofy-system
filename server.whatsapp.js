import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import admin from 'firebase-admin';

const {
  PORT = 4000,
  WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN,
  FIREBASE_SERVICE_ACCOUNT_JSON
} = process.env;

if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.warn('[bot] FIREBASE_SERVICE_ACCOUNT_JSON não definido. O bot não conseguirá consultar as cargas.');
}

if (!admin.apps.length && FIREBASE_SERVICE_ACCOUNT_JSON) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
  });
}

const db = admin.apps.length ? admin.firestore() : null;
const app = express();
app.use(express.json());

const APP_ID = 'cargofy-b4435-prod';

const normalize = (value = '') => String(value).trim().toLowerCase();

const getEtapa = (viagem) => {
  if (viagem.status === 'Entregue') return 'Entregue';
  if (viagem.status === 'Em rota') return 'Em rota';
  return 'Pendente';
};

const formatDate = (date) => {
  if (!date) return '---';
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '---' : d.toLocaleDateString('pt-BR');
};

async function buscarCargaPorDocumento(inputDoc) {
  if (!db) return null;

  const doc = normalize(inputDoc).replace(/\s+/g, '');
  if (!doc) return null;

  const col = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('viagens');
  const snap = await col.get();

  const viagens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const match = viagens.find((v) => {
    const nf = normalize(v.numeroNF).replace(/\s+/g, '');
    const cte = normalize(v.numeroCTe).replace(/\s+/g, '');
    const chave = normalize(v.chaveID).replace(/\s+/g, '');
    return nf === doc || cte === doc || chave === doc;
  });

  return match || null;
}

async function sendWhatsAppMessage(to, body) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.warn('[bot] WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN ausentes. Mensagem não enviada.');
    return;
  }

  await axios.post(
    `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body }
    },
    {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
    }
  );
}

function montarResposta(viagem) {
  const etapa = getEtapa(viagem);
  const cliente = viagem.contratante || viagem.destinatario || 'Cliente';
  const origemData = viagem.dataSaida || viagem.dataNF;

  return [
    `Olá! Localizamos sua carga ✅`,
    `Cliente: ${cliente}`,
    `NF: ${viagem.numeroNF || '---'}`,
    `CT-e: ${viagem.numeroCTe || '---'}`,
    `Etapa atual: ${etapa}`,
    `Saída: ${formatDate(origemData)}`,
    `Previsão/Entrega: ${formatDate(viagem.dataEntrega)}`,
    `Destino: ${viagem.cidade || '---'}`
  ].join('\n');
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  try {
    const changes = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = changes?.messages?.[0];
    if (!message || message.type !== 'text') return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body?.trim() || '';

    const viagem = await buscarCargaPorDocumento(text);

    if (!viagem) {
      await sendWhatsAppMessage(
        from,
        'Não localizamos esse documento. Envie a chave da NF-e (44 dígitos) ou número do CT-e para consultar a etapa da sua carga.'
      );
      return res.sendStatus(200);
    }

    await sendWhatsAppMessage(from, montarResposta(viagem));
    return res.sendStatus(200);
  } catch (error) {
    console.error('[bot] erro no webhook:', error.message);
    return res.sendStatus(500);
  }
});

app.get('/health', (_, res) => {
  res.status(200).json({ ok: true, service: 'cargofy-whatsapp-bot' });
});

app.listen(PORT, () => {
  console.log(`[bot] WhatsApp bot ativo na porta ${PORT}`);
});
