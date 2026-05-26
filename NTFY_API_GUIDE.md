# 📘 Guia Completo da API do Ntfy.sh

O ntfy é um sistema de notificações baseado em **HTTP simples**. Qualquer aplicativo que possa fazer uma requisição HTTP (como `curl`, `wget`, scripts em Python/Bash/Node, etc.) pode enviar notificações.

---

## 🔗 1. Estrutura da URL
A lógica é baseada em **Tópicos** (como canais ou pastas). Você inventa o nome na hora de enviar.

Formato:
`[METHOD] http://SEU_IP:PORTA/NOME_DO_TOPICO`

---

## 🚀 2. Comandos Essenciais (CURL)

### A. Mensagem Simples
Envia um texto rápido para o tópico `monitoramento`.
```bash
curl -d "O servidor foi reiniciado." \
  http://localhost:8080/monitoramento
```

### B. Notificação Completa (Título + Ícone)
Usa o cabeçalho `Title` para o título e `Tags` para emojis automáticos.
```bash
curl \
  -H "Title: Backup Concluído" \
  -H "Tags: white_check_mark,server" \
  -d "O backup diário do banco de dados terminou com sucesso." \
  http://localhost:8080/monitoramento
```

### C. 🚨 Alerta Crítico (Para iPhone/Android)
A **prioridade 5** é essencial para sons altos e notificações que furam o "Não Perturbe" (especialmente no iOS).
```bash
curl \
  -H "Title: 🔴 ALERTA CRÍTICO" \
  -H "Priority: 5" \
  -H "Tags: rotating_light,warning" \
  -d "Temperatura do CPU acima de 95°C!" \
  http://localhost:8080/monitoramento
```

---

## ⚙️ 3. Funcionalidades Avançadas

### D. Envio com JSON
Você pode enviar tudo num corpo JSON em vez de headers separados.
```bash
curl \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "monitoramento",
    "title": "Erro no Docker",
    "message": "O container do HomeAssistant caiu.",
    "priority": 4,
    "tags": ["x", "warning"]
  }' \
  http://localhost:8080
```

### E. Anexos (Arquivos e Imagens)
Envia o conteúdo de um arquivo como corpo da requisição.
```bash
curl -T screenshot_erro.png \
  http://localhost:8080/monitoramento
```

### F. Agendamento (Delay)
Pede para o servidor entregar a mensagem no futuro.
```bash
# Daqui a 1 hora
curl -H "Delay: 1h" -d "Lembrete: Verificar logs" http://localhost:8080/monitoramento
```

---

## 🔘 4. Ações (Botões na Notificação)
Você pode adicionar botões interativos que aparecem na notificação do celular.

**Sintaxe:** `view, Label, URL` ou `http, Label, METHOD, URL`

```bash
curl \
  -H "Actions: view, Abrir Grafana, https://grafana.seusite.com; http, Reiniciar Serviço, POST, https://api.seusite.com/restart" \
  -d "Serviço indisponível. Clique abaixo para agir." \
  http://localhost:8080/monitoramento
```

---

## 🔒 5. Segurança e Autenticação
Para impedir que其他人 enviem spam no seu tópico, você deve configurar o servidor com autenticação.

**Variáveis de Ambiente no Docker:**
```yaml
environment:
  - NTFY_AUTH_DEFAULT_ACCESS=deny-all
  - NTFY_AUTH_FILE=/etc/ntfy/user.db
```

**Como enviar com autenticação:**
Adicione a flag `-u` (user) no curl:
```bash
curl -u "admin:SUA_SENHA" \
  -H "Priority: 5" \
  -d "Alerta Seguro" \
  http://localhost:8080/monitoramento
```

---

## 📊 6. Níveis de Prioridade
Use o header `Priority` para definir a urgência.

| Valor | Nível | Comportamento (App Mobile) |
| :--- | :--- | :--- |
| **1** | Mínimo | Silencioso, sem notificação push (apenas no histórico). |
| **3** | Baixo | Notificação push, mas sem som/vibração. |
| **4** | Padrão | Notificação push com som/vibração padrão. |
| **5** | **Urgente** | Som alto, vibração forte, tela acende, fura modo "Não Perturbe". |

---

## 🐍 7. Exemplo em Python
Para quem prefere scripts Python em vez de Bash.

```python
import requests

url = "http://localhost:8080/monitoramento"
headers = {
    "Title": "Alerta via Python",
    "Priority": "5",
    "Tags": "snake,code"
}
data = "Script de automação finalizado com sucesso!"

requests.post(url, headers=headers, data=data)