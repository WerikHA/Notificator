# Template Docker Next.js Dyad

Este template fornece um boilerplate robusto para construir e implantar aplicações Next.js totalmente containerizadas com Docker, utilizando o **Docker Hub** para hospedagem de imagens e um **banco de dados JSON puro em JavaScript (`lowdb`)** como backend. Também inclui configuração para proxy de API do Next.js para lidar com integrações externas e problemas de CORS sem complicações.

## ✨ Funcionalidades

- **Next.js**: Um framework React poderoso para construir aplicações web full-stack.
  
- **Docker & Docker Compose**: Containerize sua aplicação para garantir ambientes consistentes entre desenvolvimento, teste e produção. Execute toda a stack localmente com um único comando.
  
- **Docker Hub**: Automatize a construção de suas imagens Docker e envie-as para o Docker Hub usando GitHub Actions.
  
- **Banco de Dados JSON (`lowdb`)**: Um banco de dados leve baseado em arquivo JSON que roda inteiramente em JavaScript. Isso simplifica a configuração do banco, eliminando problemas com dependências nativas e comandos manuais de migração.
  
- **Proxy de API Next.js (Rewrites)**: Configuração integrada para proxy de requisições para APIs externas a partir do backend Next.js, ajudando a contornar restrições de CORS no lado do cliente.
  
- **Pronto para Dyad**: Otimizado para implantação na plataforma Dyad.
  

## 🚀 Começando

Para usar este template, siga estes passos:

### Pré-requisitos

Antes de começar, certifique-se de ter os seguintes itens instalados:

- **Git**: Para controle de versão.
  
- **Node.js**: (v18 ou superior recomendado) e npm ou Yarn.
  
- **Docker & Docker Compose**: Para construir e executar containers.
  
- **Conta GitHub**: Para usar o GitHub Actions.
  
- **Conta Docker Hub**: Para hospedar suas imagens Docker.
  

### 1. Crie Seu Projeto a Partir Deste Template

1. **Use Este Template**: No GitHub, navegue até o repositório do template e clique no botão verde "Use this template" -> "Create a new repository".
  
2. **Clone Seu Novo Repositório**:
  
  ```bash
  git clone https://github.com/seu-usuario/nome-do-novo-repositorio.git
  cd nome-do-novo-repositorio
  ```
  

### 2. Configuração do Ambiente

Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

Agora, abra o arquivo `.env` recém-criado e configure suas definições:

- `DOCKERHUB_USERNAME`: Seu nome de usuário no Docker Hub.
- `REPO_NAME`: Nome do repositório (geralmente o mesmo do GitHub).
- `API_SECRET_KEY`: Chave secreta para proteger o endpoint de webhook.
- `DATABASE_DIR`: Opcional. Diretório onde o arquivo `db.json` será armazenado (padrão: `./data`).
- `EXTERNAL_API_URL_*`: URLs para proxy de APIs externas (opcionais).

## 🐳 Desenvolvimento Local com Docker Compose

1. **Execute com Docker Compose**:
  
  ```bash
  docker compose up -d
  ```
  
  Este comando:
  
  - Inicia sua aplicação Next.js em um container Docker.
    
  - Mapeia a porta `3000` do container para `3000` na sua máquina host.
    
  - Cria um volume Docker (`dyad_db_data`) para persistir seu banco de dados JSON.
    
2. **Acesse Sua Aplicação**: `http://localhost:3000`

3. **Pare a Aplicação**:
  
  ```bash
  docker compose down
  ```
  
  Para resetar o banco de dados: `docker compose down -v`

## ☁️ CI/CD com GitHub Actions e Docker Hub

Este template está configurado para construir e enviar automaticamente sua imagem Docker para o Docker Hub.

### Configuração dos Secrets no GitHub

Você precisa adicionar os seguintes **secrets** nas configurações do seu repositório GitHub (`Settings > Secrets and variables > Actions`):

| Secret | Descrição |
|--------|-----------|
| `DOCKERHUB_USERNAME` | Seu nome de usuário no Docker Hub |
| `DOCKERHUB_TOKEN` | Token de acesso do Docker Hub (crie em Account Settings > Security) |

### Como Criar o Token no Docker Hub

1. Acesse https://hub.docker.com
2. Vá em **Account Settings > Security**
3. Clique em **New Access Token**
4. Dê um nome e copie o token gerado
5. Adicione como `DOCKERHUB_TOKEN` nos secrets do GitHub

### Acionamento do Deploy

O workflow é acionado automaticamente em:
- Pushes na branch `main`
- Criação de novas tags (ex: `v1.0.0`)

Sua imagem estará disponível em: `hub.docker.com/seu-usuario/nome-do-repo`

## ↔️ Proxy de API Next.js (Rewrites)

O arquivo `next.config.ts` está configurado para permitir o proxy de requisições para APIs externas.

- **Configuração Condicional**: Uma regra de proxy só é criada se a variável de ambiente correspondente estiver definida e não vazia.
  
- **Exemplo**: Se `EXTERNAL_API_URL_SERVICE1=https://api.exemplo.com`, uma requisição para `/api/service1/data` será proxyada para `https://api.exemplo.com/data`.

## 🚀 Implantação no Dyad

Este template foi projetado para fácil implantação no Dyad. Consulte a documentação oficial do Dyad sobre como usar o CLI para implantar sua aplicação.

## 🛠️ Personalização

- **Schema do Banco de Dados**: Modifique `src/lib/database.ts` e a interface `DbSchema`.
- **Rotas de API**: Crie novas rotas em `src/app/api/`.
- **Frontend**: Construa seus componentes em `src/components/`.
- **Docker**: Ajuste o `Dockerfile` e `docker-compose.yml` conforme necessário.

## ❓ Perguntas ou Problemas

Se você tiver dúvidas ou encontrar problemas, consulte a documentação oficial do Next.js, Docker, lowdb e Dyad.