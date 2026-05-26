# Template Docker Next.js Dyad

Este template fornece um boilerplate robusto para construir e implantar aplicações Next.js totalmente containerizadas com Docker, utilizando o GitHub Container Registry (GHCR) para hospedagem de imagens e um **banco de dados JSON puro em JavaScript (`lowdb`)** como backend. Também inclui configuração para proxy de API do Next.js para lidar com integrações externas e problemas de CORS sem complicações.

## ✨ Funcionalidades

- **Next.js**: Um framework React poderoso para construir aplicações web full-stack.
  
- **Docker & Docker Compose**: Containerize sua aplicação para garantir ambientes consistentes entre desenvolvimento, teste e produção. Execute toda a stack localmente com um único comando.
  
- **GitHub Container Registry (GHCR)**: Automatize a construção de suas imagens Docker e envie-as para o GHCR usando GitHub Actions, fornecendo um registro de pacotes seguro e integrado.
  
- **Banco de Dados JSON (`lowdb`)**: Um banco de dados leve baseado em arquivo JSON que roda inteiramente em JavaScript. Isso simplifica a configuração do banco, eliminando problemas com dependências nativas e comandos manuais de migração.
  
- **Proxy de API Next.js (Rewrites)**: Configuração integrada para proxy de requisições para APIs externas a partir do backend Next.js, ajudando a contornar restrições de CORS no lado do cliente.
  
- **Pronto para Dyad**: Otimizado para implantação na plataforma Dyad, aproveitando sua imagem Docker hospedada no GHCR.
  

## 🚀 Começando

Para usar este template, siga estes passos:

### Pré-requisitos

Antes de começar, certifique-se de ter os seguintes itens instalados:

- **Git**: Para controle de versão.
  
- **Node.js**: (v18 ou superior recomendado) e npm ou Yarn.
  
- **Docker & Docker Compose**: Para construir e executar containers.
  
- **Conta GitHub**: Para usar o GHCR e o GitHub Actions.
  

### 1. Crie Seu Projeto a Partir Deste Template

1. **Use Este Template**: No GitHub, navegue até o repositório do template e clique no botão verde "Use this template" (ou "Use this template" -> "Create a new repository").
  
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

- `DATABASE_DIR`: Opcional. Se definido, especifica o diretório onde o arquivo `db.json` será armazenado (o padrão é `./data`).
  
- `EXTERNAL_API_URL_SERVICE1`, `EXTERNAL_API_URL_SERVICE2`, `WEATHER_API_URL`: Essas variáveis são usadas para proxy genérico de APIs externas. **Defina-as para as URLs base reais das APIs externas que você pretende usar como proxy.** Se uma variável for deixada em branco ou omitida, a regra de proxy correspondente não será ativada.
  
  - **Nota para AI/Usuários**: Para quaisquer *novas* APIs externas que você desejar integrar além destes exemplos, você precisará **adicionar uma nova variável de ambiente** (por exemplo, `MY_NEW_API_URL`) ao seu arquivo `.env` e configurar uma regra de reescrita correspondente em `next.config.ts`.

## 💾 Configuração do Banco de Dados (JSON com `lowdb`)

Este template usa um **arquivo JSON (`db.json`)** para seu banco de dados, gerenciado pela biblioteca **`lowdb`**. O arquivo `db.json` e sua estrutura inicial são criados automaticamente com dados vazios padrão (`{ examples: [] }`) quando a aplicação é iniciada pela primeira vez.

1. **Instale as Dependências**:
  
  ```bash
  npm install # ou yarn install
  ```
  
2. **Definição do Schema e Persistência**:
  A estrutura do banco de dados (por exemplo, o array `examples`) é definida e inicializada em `src/lib/database.ts`. Todas as alterações no banco de dados (adicionar, atualizar, excluir dados) são automaticamente persistidas no arquivo `db.json` pelo adaptador do `lowdb` sempre que você chamar `db.write()` após modificar `db.data`.
  
  - **Nota para AI/Usuários**: Se você precisar armazenar novos tipos de dados, deve **atualizar a interface `DbSchema`** em `src/lib/database.ts` e garantir que os dados padrão no construtor `Low` sejam inicializados com arrays/objetos vazios para novas coleções.

## 🐳 Desenvolvimento Local com Docker Compose

Este template inclui um arquivo `docker-compose.yml` para iniciar rapidamente sua aplicação em um ambiente Dockerizado localmente.

1. **Construa Sua Imagem Docker Localmente (Opcional, mas bom para testar)**:
  Embora o GitHub Actions construa sua imagem para o GHCR, você pode construí-la localmente para garantir que seu `Dockerfile` funciona como esperado:
  
  ```bash
  docker build -t nome-do-app:local .
  ```
  
2. **Execute com Docker Compose**:
  Navegue até a raiz do seu projeto e execute:
  
  ```bash
  docker compose up -d
  ```
  
  Este comando:
  
  - Constrói sua imagem Docker se ela ainda não foi construída ou atualizada.
    
  - Inicia sua aplicação Next.js em um container Docker.
    
  - Mapeia a porta `3000` do container para `3000` na sua máquina host. Você pode alterar `3000:3000` no `docker-compose.yml` para, por exemplo, `8080:3000` para acessar na porta 8080.
    
  - Cria um volume Docker (`dyad_db_data`) para persistir seu arquivo de banco de dados JSON (`db.json`), garantindo que seus dados não sejam perdidos quando o container for parado ou removido.
    
3. **Acesse Sua Aplicação**:
  Assim que os containers estiverem em execução, abra seu navegador e navegue para: `http://localhost:3000`
  
4. **Teste Endpoints de API**:
  O template inclui um endpoint de exemplo em `/api/examples` que interage com o banco de dados JSON. Você pode enviar requisições GET e POST para este endpoint para testar a funcionalidade do banco de dados. Se você configurou `EXTERNAL_API_URL_SERVICE1`, também pode testar endpoints com proxy como `/api/service1/posts` (assumindo que o serviço configurado tenha esses endpoints).
  
5. **Pare a Aplicação**:
  Para parar e remover os containers e o volume associado (se quiser resetar o banco de dados), execute:
  
  ```bash
  docker compose down -v
  ```
  
  Para parar apenas os containers sem remover o volume, use `docker compose down`.
  

## ☁️ Integração com GitHub Container Registry (GHCR)

Este template está configurado para construir e enviar automaticamente sua imagem Docker para o GHCR.

- **Workflow**: O arquivo `.github/workflows/main.yml` define um workflow do GitHub Actions que é acionado em:
  
  - Pushes na branch `main`.
    
  - Criação de novas tags (por exemplo, `v1.0.0`).
    
- **Localização da Imagem**: Sua imagem Docker será enviada para `ghcr.io/seu-usuario-github/nome-do-repo:latest` (ou `ghcr.io/seu-usuario-github/nome-do-repo:v1.0.0` para tags). Você pode encontrar suas imagens na seção "Packages" do seu repositório GitHub.
  
- **Autenticação**: O workflow usa o `GITHUB_TOKEN` para autenticar e enviar imagens com segurança para o GHCR.
  

## ↔️ Proxy de API Next.js (Rewrites)

O arquivo `next.config.ts` está configurado para permitir o proxy de requisições da sua aplicação Next.js para APIs externas. Isso é particularmente útil para contornar problemas de CORS (Cross-Origin Resource Sharing) ao fazer chamadas de API do navegador.

- **Configuração Condicional**: A função `async rewrites()` em `next.config.ts` **criará uma regra de proxy apenas se a variável de ambiente correspondente (por exemplo, `EXTERNAL_API_URL_SERVICE1`) estiver explicitamente definida e não estiver vazia.** Isso significa que sua aplicação iniciará sem erros mesmo se você não precisar de todas as regras de proxy imediatamente.
  
- **Exemplo de Uso**: Se você definir `EXTERNAL_API_URL_SERVICE1=https://api.example.com`, uma requisição do seu frontend para `/api/service1/data` será feita pelo backend Next.js como proxy para `https://api.example.com/data`. Se `EXTERNAL_API_URL_SERVICE1` estiver em branco, essa regra simplesmente não estará ativa.
  
- **Personalização**: Para integrar suas APIs externas específicas, **defina as variáveis de ambiente correspondentes no seu arquivo `.env`**. Você também pode adicionar mais regras de reescrita ao `next.config.ts` para APIs adicionais.
  
  - **Nota para AI/Usuários**: Ao integrar com uma *nova* API externa, a IA deve **adicionar uma nova regra de reescrita** ao `next.config.ts` para essa API específica e orientar o usuário a definir a variável de ambiente correspondente.

## 🚀 Implantação no Dyad

Este template foi projetado para fácil implantação no Dyad. O arquivo `dyad.yaml` especifica como o Dyad deve implantar sua aplicação.

- **Fonte da Imagem**: `dyad.yaml` aponta para sua imagem Docker no GHCR (por exemplo, `image: ghcr.io/seu-usuario-github/nome-do-repo:latest`).
  
- **Portas**: Expõe a porta `3000`, correspondendo à porta interna da sua aplicação Next.js.
  
- **CLI Dyad**: Consulte a documentação oficial do Dyad sobre como usar o CLI para implantar sua aplicação usando este template e sua imagem GHCR.
  

## 🛠️ Personalização

Sinta-se à vontade para personalizar este template para atender às suas necessidades específicas:

- **Schema do Banco de Dados**: Modifique `src/lib/database.ts` e a interface `DbSchema` para definir a estrutura dos seus dados JSON. Lembre-se de chamar `db.write()` após qualquer modificação de dados.
  
- **Rotas de API Next.js**: Estenda `pages/api/examples.ts` ou crie novas rotas de API para interagir com seu banco de dados `lowdb` e serviços externos.
  
- **Frontend**: Construa os componentes de UI do seu Next.js.
  
- **Configuração Docker**: Ajuste o `Dockerfile` para dependências ou otimizações específicas.
  
- **Docker Compose**: Adicione mais serviços ou configure volumes/redes conforme necessário no `docker-compose.yml`.
  
- **GitHub Actions**: Personalize o workflow de CI/CD (`.github/workflows/main.yml`) para diferentes estratégias de branching ou testes.
  

## ❓ Perguntas ou Problemas

Se você tiver dúvidas ou encontrar problemas, consulte a documentação para Next.js, Docker, `lowdb`, GitHub Actions e Dyad. Se acredita haver um problema com o template em si, considere abrir uma issue no repositório do template.