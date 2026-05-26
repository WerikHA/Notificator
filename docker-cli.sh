#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado. Visite https://docs.docker.com/get-docker/"
        exit 1
    fi
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose não está instalado."
        exit 1
    fi
}

# Print usage
usage() {
    echo -e "${BLUE}Docker CLI - Gerenciador de Containers${NC}"
    echo ""
    echo "Uso: ./docker-cli.sh <comando>"
    echo ""
    echo "Comandos disponíveis:"
    echo "  up          Inicia os containers em background"
    echo "  down        Para e remove os containers"
    echo "  down-v      Para, remove containers e volume de dados (reseta banco)"
    echo "  restart     Reinicia os containers"
    echo "  logs        Mostra logs em tempo real"
    echo "  logs-json   Mostra logs da última hora"
    echo "  build       Reconstrói a imagem Docker"
    echo "  build-pull  Reconstrói forçando pull das imagens base"
    echo "  exec <cmd>  Executa comando dentro do container"
    echo "  shell       Abre um shell dentro do container"
    echo "  db-reset    Remove volume do banco (reset db.json)"
    echo "  db-copy     Copia db.json do container para ./data/local-backup"
    echo "  status      Mostra status dos containers"
    echo "  ps          Lista containers com detalhes"
    echo "  prune       Limpa imagens e volumes não utilizados"
    echo "  help        Mostra esta mensagem de ajuda"
    echo ""
    echo "Exemplos:"
    echo "  ./docker-cli.sh up"
    echo "  ./docker-cli.sh logs"
    echo "  ./docker-cli.sh exec \"ls -la /app\""
    echo ""
}

# Commands
cmd_up() {
    log_info "Iniciando containers..."
    docker compose up -d
    log_success "Containers iniciados!"
    log_info "Aplicação disponível em: http://localhost:3000"
}

cmd_down() {
    log_info "Parando containers..."
    docker compose down
    log_success "Containers parados!"
}

cmd_down_v() {
    log_warn "Isso irá remover o volume de dados e resetar o banco!"
    read -p "Continuar? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        log_info "Parando containers e removendo volume..."
        docker compose down -v
        log_success "Containers e volume removidos!"
    else
        log_info "Operação cancelada."
    fi
}

cmd_restart() {
    log_info "Reiniciando containers..."
    docker compose restart
    log_success "Containers reiniciados!"
}

cmd_logs() {
    log_info "Mostrando logs (Ctrl+C para sair)..."
    docker compose logs -f --tail=100
}

cmd_logs_json() {
    log_info "Mostrando logs da última hora..."
    docker compose logs --since 1h
}

cmd_build() {
    log_info "Reconstruindo imagem Docker..."
    docker compose build
    log_success "Imagem reconstruída!"
}

cmd_build_pull() {
    log_info "Reconstruindo imagem com pull das bases..."
    docker compose build --pull
    log_success "Imagem reconstruída!"
}

cmd_exec() {
    if [ -z "$1" ]; then
        log_error "Você deve fornecer um comando. Exemplo: ./docker-cli.sh exec \"ls -la\""
        exit 1
    fi
    log_info "Executando: $1"
    docker compose exec web $1
}

cmd_shell() {
    log_info "Abrindo shell no container..."
    docker compose exec web sh
}

cmd_db_reset() {
    log_warn "Isso irá remover o volume do banco de dados!"
    read -p "Continuar? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        log_info "Parando container e removendo volume do banco..."
        docker compose down -v
        log_success "Banco de dados resetado! Execute './docker-cli.sh up' para iniciar."
    else
        log_info "Operação cancelada."
    fi
}

cmd_db_copy() {
    log_info "Copiando db.json do container..."
    mkdir -p ./data/local-backup
    docker compose cp web:/app/data/db.json ./data/local-backup/db-$(date +%Y%m%d-%H%M%S).json
    log_success "Backup criado em ./data/local-backup/"
}

cmd_status() {
    log_info "Status dos containers:"
    docker compose ps
}

cmd_ps() {
    docker compose ps -a
}

cmd_prune() {
    log_warn "Isso irá remover imagens e volumes não utilizados!"
    read -p "Continuar? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        log_info "Limpando recursos não utilizados..."
        docker system prune -f
        docker volume prune -f
        log_success "Limpeza concluída!"
    else
        log_info "Operação cancelada."
    fi
}

# Main
check_docker

case "$1" in
    up)
        cmd_up
        ;;
    down)
        cmd_down
        ;;
    down-v)
        cmd_down_v
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs
        ;;
    logs-json)
        cmd_logs_json
        ;;
    build)
        cmd_build
        ;;
    build-pull)
        cmd_build_pull
        ;;
    exec)
        shift
        cmd_exec "$@"
        ;;
    shell)
        cmd_shell
        ;;
    db-reset)
        cmd_db_reset
        ;;
    db-copy)
        cmd_db_copy
        ;;
    status)
        cmd_status
        ;;
    ps)
        cmd_ps
        ;;
    prune)
        cmd_prune
        ;;
    help|--help|-h|"")
        usage
        ;;
    *)
        log_error "Comando desconhecido: $1"
        echo ""
        usage
        exit 1
        ;;
esac