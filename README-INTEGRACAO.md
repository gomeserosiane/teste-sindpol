# Integração Assinafy — Sindpol

Este projeto usa o PDF oficial `docs/ficha-sindpol-template.pdf` como modelo. Os dados enviados pelo formulário são carimbados nos campos em branco desse PDF, mantendo o layout original da ficha do Clube de Benefícios Sindpol.

## Fluxo implementado

```txt
Frontend
↓
POST /api/enviar-formulario
↓
Gerar PDF preenchido a partir de docs/ficha-sindpol-template.pdf
↓
Enviar PDF para Assinafy
↓
Criar assinante contratante
↓
Criar assinante administrador/sindicalizado
↓
Solicitar assinatura virtual ou collect
↓
POST /api/webhook-assinafy para acompanhar status
```

## Rotas

```txt
POST /api/enviar-formulario
POST /api/webhook-assinafy
```

## Variáveis obrigatórias na Vercel

```env
ASSINAFY_API_KEY=
ASSINAFY_ACCOUNT_ID=
ASSINAFY_BASE_URL=https://api.assinafy.com.br/v1
ADMIN_EMAILS=gomeserosiane.dev@gmail.com
```

Para sandbox, use a URL sandbox confirmada no painel/documentação da sua conta:

```env
ASSINAFY_BASE_URL=https://sandbox.assinafy.com.br/v1
```

## Assinatura virtual

No modo virtual, contratante e admin/sindicalizado recebem o mesmo PDF para assinatura digital. A assinatura não é presa em coordenadas específicas do PDF.

```env
ASSINAFY_SIGNATURE_METHOD=virtual
ASSINAFY_NOTIFICATION_METHOD=Email
```

Para WhatsApp:

```env
ASSINAFY_NOTIFICATION_METHOD=Whatsapp
ADMIN_WHATSAPPS=5591984536649
```

## Assinatura collect

Use `collect` quando quiser posicionar o campo de assinatura embaixo das linhas do PDF:

- Contratante: embaixo de `ASSINATURA DO(A) CONTRATANTE`.
- Admin/Sindicalizado: embaixo de `ASSINATURA DO(A) SINDICALIZADO(A)`.

Você precisa criar/configurar os campos na Assinafy e preencher os IDs:

```env
ASSINAFY_SIGNATURE_METHOD=collect
ASSINAFY_COLLECT_CONTRATANTE_FIELD_ID=
ASSINAFY_COLLECT_SINDICALIZADO_FIELD_ID=
ASSINAFY_COLLECT_PAGE_NUMBER=1

ASSINAFY_COLLECT_CONTRATANTE_LEFT=45
ASSINAFY_COLLECT_CONTRATANTE_TOP=665
ASSINAFY_COLLECT_CONTRATANTE_WIDTH=210
ASSINAFY_COLLECT_CONTRATANTE_HEIGHT=45

ASSINAFY_COLLECT_SINDICALIZADO_LEFT=355
ASSINAFY_COLLECT_SINDICALIZADO_TOP=665
ASSINAFY_COLLECT_SINDICALIZADO_WIDTH=210
ASSINAFY_COLLECT_SINDICALIZADO_HEIGHT=45
```

O backend aguarda o documento chegar ao status `metadata_ready` antes de criar assinatura `collect`.

```env
ASSINAFY_METADATA_MAX_ATTEMPTS=12
ASSINAFY_METADATA_DELAY_MS=1500
```

## Administradores

O primeiro contato em `ADMIN_EMAILS` ou `ADMIN_WHATSAPPS` vira o assinante admin/sindicalizado. Os demais entram como cópia, quando a Assinafy aceitar `copy_receivers`.

```env
ADMIN_SIGNER_NAME=SINDPOL/PA
ADMIN_EMAILS=gomeserosiane.dev@gmail.com,outro@email.com
ADMIN_WHATSAPPS=5591984536649
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

## Deploy Vercel

O projeto está configurado para Node 24:

```json
"engines": {
  "node": "24.x"
}
```

Instale e teste localmente:

```bash
npm install
vercel dev
```

Depois faça o deploy:

```bash
vercel --prod
```
