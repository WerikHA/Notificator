# 🚀 AM Dashboard Traffic

Dashboard de tráfego para campanhas Meta Ads. Acompanhe investimento, mensagens, cliques, alcance e muito mais em tempo real.

## ✨ Funcionalidades

- 📊 **Métricas em Tempo Real**: Acompanhe gastos, impressões, cliques e mensagens diretamente da API Meta Ads.
- 📈 **Gráficos Interativos**: Visualize o desempenho diário com gráficos de área e funil de tráfego.
- 📱 **Interface Responsiva**: Funciona perfeitamente em desktop e dispositivos móveis.
- 📑 **Exportação em PDF**: Gere relatórios completos com um clique.
- 🔗 **Multi-cliente**: Gerencie múltiplas contas de anúncios de diferentes clientes.

---

## 🚀 Como Instalar

### Opção 1: Docker Compose (Recomendado)

1. Crie um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  dashboard:
    image: ghcr.io/werikoliveira/notification-server:main
    container_name: am-dashboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=sua_senha_aqui
```

2. Execute:
   ```bash
   docker compose up -d
   ```

3. Acesse `http://seu-ip:3000` e faça login.

### Opção 2: Desenvolvimento Local

```bash
npm install
npm run dev
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
| :--- | :--- | :---: |
| `ADMIN_USERNAME` | Usuário do painel administrativo | Sim |
| `ADMIN_PASSWORD` | Senha do painel administrativo | Sim |
| `DATABASE_DIR` | Diretório para persistência dos dados | Não |

### Como adicionar um cliente Meta Ads

1. Faça login no painel administrativo.
2. Clique em **"Novo Cliente"**.
3. Preencha:
   - **Nome do Cliente**
   - **ID da Conta de Anúncios** (formato: número ou `act_` seguido do número)
   - **Token de Acesso** (Access Token permanente ou de longa duração da Meta)
4. Copie o link gerado e compartilhe com o cliente.

O dashboard estará disponível em `http://seu-app.com/dashboard/[slug-do-cliente]`.

---

## 🛟 Suporte

Se tiver alguma dúvida ou problema, abra uma issue no repositório.