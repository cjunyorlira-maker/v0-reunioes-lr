# Proxy TotalPhone

Proxy para baixar áudios do TotalPhone sem bloqueio de IP.

## Deploy no Railway (10 minutos)

### Passo 1: Criar conta no Railway
1. Acesse https://railway.app
2. Clique em "Start a New Project"
3. Faça login com GitHub

### Passo 2: Fazer deploy
1. Clique em "Deploy from GitHub repo"
2. Selecione seu repositório (ou crie um novo com estes arquivos)
3. Railway detecta automaticamente que é Node.js

### Passo 3: Configurar variáveis de ambiente
No painel do Railway, vá em "Variables" e adicione:
```
PROXY_SECRET=sua-chave-secreta-muito-forte-123
```

### Passo 4: Obter a URL
Após o deploy, Railway gera uma URL tipo:
```
https://proxy-totalphone-production.up.railway.app
```

### Passo 5: Configurar no Vercel
Adicione estas variáveis no Vercel:
```
PROXY_TOTALPHONE_URL=https://sua-url.up.railway.app
PROXY_TOTALPHONE_SECRET=sua-chave-secreta-muito-forte-123
```

## Como usar

```bash
curl -H "Authorization: Bearer sua-chave-secreta" \
  "https://sua-url.up.railway.app/download?url=http://45.170.138.80/suite/download_audio.php?t=..."
```

## Health check

```bash
curl https://sua-url.up.railway.app/health
```
