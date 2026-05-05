# Integração Assinafy — Sindpol

Fluxo implementado:

1. Frontend envia o formulário para `/api/enviar-formulario`.
2. A rota Node.js/Vercel valida e normaliza os dados.
3. O backend gera um PDF preenchido.
4. O PDF é enviado para a Assinafy.
5. O backend cria o assinante principal.
6. O backend solicita assinatura no modo `virtual` ou `collect`.
7. A rota `/api/webhook-assinafy` recebe status/eventos da assinatura.

## Rotas

```txt
POST /api/enviar-formulario
POST /api/webhook-assinafy
```

## Variáveis de ambiente obrigatórias

```env
ASSINAFY_API_KEY=
ASSINAFY_ACCOUNT_ID=
ASSINAFY_BASE_URL=https://api.assinafy.com.br/v1
```

Use sandbox durante desenvolvimento:

```env
ASSINAFY_BASE_URL=https://sandbox.assinafy.com.br/v1
```

## Assinatura virtual

Modo padrão:

```env
ASSINAFY_SIGNATURE_METHOD=virtual
ASSINAFY_NOTIFICATION_METHOD=Email
```

Também pode usar WhatsApp:

```env
ASSINAFY_NOTIFICATION_METHOD=Whatsapp
```

## Assinatura collect

Use quando quiser campo/posição específica no PDF.

```env
ASSINAFY_SIGNATURE_METHOD=collect
ASSINAFY_COLLECT_FIELD_ID=
ASSINAFY_COLLECT_PAGE_NUMBER=1
ASSINAFY_COLLECT_LEFT=69
ASSINAFY_COLLECT_TOP=720
ASSINAFY_COLLECT_WIDTH=420
ASSINAFY_COLLECT_HEIGHT=60
ASSINAFY_COLLECT_FONT_SIZE=18
```

Atenção: no modo `collect`, o documento precisa estar em `metadata_ready`. O backend já faz tentativas automáticas:

```env
ASSINAFY_METADATA_MAX_ATTEMPTS=12
ASSINAFY_METADATA_DELAY_MS=1500
```

## Administradores / cópias

```env
ADMIN_EMAILS=gomeserosiane.dev@gmail.com,outro@email.com
ADMIN_WHATSAPPS=5591984536649,5591999999999
```

Esses contatos são criados como signers/copy receivers na Assinafy. Para disparos externos adicionais, configure:

```env
NOTIFICATION_WEBHOOK_URL=
NOTIFICATION_WEBHOOK_TOKEN=
```

## Webhook

Depois do deploy, cadastre na Assinafy:

```txt
https://SEU-DOMINIO.vercel.app/api/webhook-assinafy
```

Opcionalmente, proteja com segredo:

```env
ASSINAFY_WEBHOOK_SECRET=
```

O webhook aceita o segredo em um destes formatos:

```txt
x-webhook-secret: SEU_SEGREDO
x-assinafy-webhook-secret: SEU_SEGREDO
Authorization: Bearer SEU_SEGREDO
```

## Arquitetura

```txt
/api
  enviar-formulario.js
  webhook-assinafy.js
/lib
  assinafyClient.js
  formulario.js
  notificacoes.js
  pdf.js
  utils.js
/js
  script.js
```
