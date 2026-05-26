# 📢 Central de Notificações

Uma interface simples e elegante para receber alertas e notificações via Webhook. Ideal para monitorar servidores, receber avisos de automações ou integrar com qualquer sistema que envie requisições HTTP.

![Screenshot do App](https://via.placeholder.com/800x400.png?text=Central+de+Notificações)

## ✨ Funcionalidades

- 📱 **Interface estilo Chat**: Todas as notificações organizadas em tempo real.
- 🔔 **Alerta Sonoro**: Toca um som de alerta alto quando uma nova notificação chega (ótimo para quando você não está olhando a tela).
- 🌐 **Compatível com tudo**: Receba notificações de qualquer lugar via Webhook (curl, n8n, Python, scripts de backup, etc).
- 🏠 **Pronto para CasaOS**: Instalação fácil com Docker Compose e interface amigável.

---

## 🚀 Como Instalar

### Opção 1: CasaOS (Recomendado)

Se você usa o CasaOS no seu servidor:

1. Abra o terminal ou acesse a área de "App Store" > "Personalizada".
2. Cole o código abaixo ou faça o upload do arquivo `docker-compose.yml`.

```yaml
version: '3.8'

services:
  notification:
    image: werikoliveira/notification:latest
    container_name: notification-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - API_SECRET_KEY=sua_chave_secreta_aqui
```

3. Clique em **Instalar**. O app estará disponível em `http://seu-ip:3000`.

### Opção 2: Docker Compose (Manual)

1. Crie um arquivo `docker-compose.yml` com o conteúdo acima.
2. Execute:
   ```bash
   docker compose up -d
   ```

---

## ⚙️ Configuração

Você pode ajustar o comportamento do app alterando as variáveis de ambiente no seu `docker-compose.yml`:

| Variável | O que faz | Exemplo |
| :--- | :--- | :--- |
| `API_SECRET_KEY` | **Obrigatório**. A senha para quem quiser enviar notificações para você. | `minha-senha-123` |
| `DATABASE_DIR` | Onde os dados são salvos (não precisa mudar). | `/app/data` |

---

## 📡 Como enviar notificações

O aplicativo funciona recebendo requisições **POST**. Você pode testar usando o `curl` no seu terminal ou integrando com seus scripts.

### Exemplo com cURL:

```bash
curl -X POST http://localhost:3000/api/webhook/notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua_chave_secreta_aqui" \
  -d '{
    "message": "O backup foi concluído com sucesso!",
    "title": "Backup Diário"
  }'
```

### Exemplo com Python:

```python
import requests

url = "http://localhost:3000/api/webhook/notification"
headers = {
    "Authorization": "Bearer sua_chave_secreta_aqui",
    "Content-Type": "application/json"
}
data = {
    "message": "CPU com temperatura alta!",
    "title": "Alerta do Servidor"
}

requests.post(url, headers=headers, json=data)
```

---

## 🛟 Suporte

Se tiver alguma dúvida ou problema, abra uma issue no repositório.