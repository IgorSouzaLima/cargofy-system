# WhatsApp Bot (consulta de etapa por NF / CT-e)

Este serviço recebe mensagens do WhatsApp Cloud API e responde o status da carga consultando a coleção `viagens` no Firestore.

## Como funciona
1. Cliente envia no WhatsApp a chave NF-e, número da NF, número do CT-e ou chave cadastrada.
2. O webhook recebe a mensagem em `POST /webhook`.
3. O bot busca o documento na coleção:
   - `artifacts/{APP_ID}/public/data/viagens`
4. Retorna etapa (`Pendente`, `Em rota`, `Entregue`) + dados resumidos da carga.

## Variáveis de ambiente
```bash
PORT=4000
WHATSAPP_VERIFY_TOKEN=seu_token_de_verificacao
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_access_token
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

## Execução
```bash
npm run bot:whatsapp
```

## Endpoints
- `GET /webhook` valida verificação da Meta
- `POST /webhook` recebe mensagens e responde
- `GET /health` healthcheck

## Observações
- Para produção, coloque este serviço atrás de HTTPS público (ex.: Cloud Run, Render, Railway).
- Configure o callback URL no WhatsApp Cloud API para apontar para `/webhook`.
