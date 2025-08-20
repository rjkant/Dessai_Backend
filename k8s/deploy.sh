#!/bin/bash

# Dessai Backend - Kubernetes Deployment Scripts (Bash)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${CYAN}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_warning() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}"
}

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
}

# Deploy all Kubernetes resources
deploy_dessai() {
    local environment=${1:-production}
    local dry_run=${2:-false}
    
    log_success "🚀 Deploying Dessai Platform to Kubernetes ($environment)"
    
    local kubectl_args=""
    if [ "$dry_run" = "true" ]; then
        kubectl_args="--dry-run=client"
        log_warning "⚠️  DRY RUN MODE - No actual deployment will occur"
    fi
    
    check_kubectl
    
    # Create namespace first
    log_info "📁 Creating namespace..."
    kubectl apply -f k8s/namespace.yaml $kubectl_args
    
    # Apply ConfigMaps and Secrets
    log_info "🔧 Applying configuration..."
    kubectl apply -f k8s/configmaps-secrets.yaml $kubectl_args
    
    # Deploy monitoring configurations
    log_info "📊 Applying monitoring configurations..."
    kubectl apply -f k8s/monitoring-configs.yaml $kubectl_args
    
    # Deploy databases
    log_info "🗄️  Deploying databases..."
    kubectl apply -f k8s/database-deployments.yaml $kubectl_args
    
    if [ "$dry_run" != "true" ]; then
        # Wait for databases to be ready
        log_warning "⏳ Waiting for databases to be ready..."
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n dessai --timeout=300s
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n dessai --timeout=300s
    fi
    
    # Deploy monitoring stack
    log_info "📈 Deploying monitoring stack..."
    kubectl apply -f k8s/monitoring-deployments.yaml $kubectl_args
    
    # Deploy main API
    log_info "🌐 Deploying API service..."
    kubectl apply -f k8s/api-deployment.yaml $kubectl_args
    
    # Deploy additional services
    log_info "⚙️  Deploying additional services..."
    kubectl apply -f k8s/additional-services.yaml $kubectl_args
    
    # Deploy ingress controller and load balancer
    log_info "🌍 Deploying ingress controller..."
    kubectl apply -f k8s/ingress-loadbalancer.yaml $kubectl_args
    
    if [ "$dry_run" != "true" ]; then
        # Wait for deployments to be ready
        log_warning "⏳ Waiting for deployments to be ready..."
        kubectl wait --for=condition=available deployment --all -n dessai --timeout=600s
        
        # Show deployment status
        log_success "✅ Deployment completed! Status:"
        kubectl get pods -n dessai -o wide
        echo ""
        kubectl get services -n dessai
        echo ""
        kubectl get ingress -n dessai
    else
        log_success "✅ Dry run completed successfully!"
    fi
}

# Scale deployment
scale_dessai() {
    local service=$1
    local replicas=$2
    
    if [ -z "$service" ] || [ -z "$replicas" ]; then
        log_error "Usage: scale_dessai <service> <replicas>"
        return 1
    fi
    
    log_info "📏 Scaling $service to $replicas replicas..."
    kubectl scale deployment $service --replicas=$replicas -n dessai
    
    if [ $? -eq 0 ]; then
        log_success "✅ Successfully scaled $service"
    else
        log_error "Failed to scale $service"
    fi
}

# Get deployment status
get_dessai_status() {
    log_success "📊 Dessai Platform Status:"
    echo ""
    
    log_info "Pods:"
    kubectl get pods -n dessai -o wide
    echo ""
    
    log_info "Services:"
    kubectl get services -n dessai
    echo ""
    
    log_info "Ingress:"
    kubectl get ingress -n dessai
    echo ""
    
    log_info "HPA Status:"
    kubectl get hpa -n dessai
    echo ""
    
    log_info "PVC Status:"
    kubectl get pvc -n dessai
}

# Clean up deployment
remove_dessai() {
    local force=${1:-false}
    
    if [ "$force" != "true" ]; then
        echo -n "This will delete the entire Dessai deployment. Are you sure? (y/N): "
        read confirmation
        if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
            log_warning "Operation cancelled."
            return
        fi
    fi
    
    log_error "🗑️  Removing Dessai deployment..."
    
    # Remove in reverse order
    kubectl delete -f k8s/ingress-loadbalancer.yaml --ignore-not-found=true
    kubectl delete -f k8s/additional-services.yaml --ignore-not-found=true
    kubectl delete -f k8s/api-deployment.yaml --ignore-not-found=true
    kubectl delete -f k8s/monitoring-deployments.yaml --ignore-not-found=true
    kubectl delete -f k8s/database-deployments.yaml --ignore-not-found=true
    kubectl delete -f k8s/monitoring-configs.yaml --ignore-not-found=true
    kubectl delete -f k8s/configmaps-secrets.yaml --ignore-not-found=true
    kubectl delete -f k8s/namespace.yaml --ignore-not-found=true
    
    log_success "✅ Dessai deployment removed"
}

# View logs
get_dessai_logs() {
    local service=${1:-dessai-api}
    local lines=${2:-100}
    local follow=${3:-false}
    
    local kubectl_args="logs -n dessai -l app.kubernetes.io/name=$service --tail=$lines"
    
    if [ "$follow" = "true" ]; then
        kubectl_args="$kubectl_args -f"
        log_info "📜 Following logs for $service (Ctrl+C to stop)..."
    else
        log_info "📜 Showing last $lines lines for $service..."
    fi
    
    kubectl $kubectl_args
}

# Port forward for local access
start_dessai_port_forward() {
    local service=${1:-dessai-api}
    local local_port=${2:-3000}
    local remote_port=${3:-3000}
    
    log_info "🔌 Starting port forward for $service ($local_port -> $remote_port)..."
    log_success "Access the service at http://localhost:$local_port"
    log_warning "Press Ctrl+C to stop port forwarding"
    
    kubectl port-forward service/$service-service $local_port:$remote_port -n dessai
}

# Database operations
invoke_dessai_db_migration() {
    log_info "🗄️  Running database migrations..."
    
    local pod_name=$(kubectl get pods -n dessai -l app.kubernetes.io/name=dessai-api -o jsonpath="{.items[0].metadata.name}")
    if [ -z "$pod_name" ]; then
        log_error "No API pods found"
        return 1
    fi
    
    kubectl exec -n dessai $pod_name -- npm run db:migrate
    
    if [ $? -eq 0 ]; then
        log_success "✅ Database migrations completed"
    else
        log_error "Database migrations failed"
    fi
}

invoke_dessai_db_seed() {
    log_info "🌱 Seeding database..."
    
    local pod_name=$(kubectl get pods -n dessai -l app.kubernetes.io/name=dessai-api -o jsonpath="{.items[0].metadata.name}")
    if [ -z "$pod_name" ]; then
        log_error "No API pods found"
        return 1
    fi
    
    kubectl exec -n dessai $pod_name -- npm run db:seed
    
    if [ $? -eq 0 ]; then
        log_success "✅ Database seeding completed"
    else
        log_error "Database seeding failed"
    fi
}

# Monitoring shortcuts
open_dessai_monitoring() {
    local tool=${1:-grafana}
    local local_port
    local remote_port
    local service
    
    case $tool in
        "grafana")
            service="grafana-service"
            remote_port=3000
            local_port=8080
            ;;
        "prometheus")
            service="prometheus-service"
            remote_port=9090
            local_port=8090
            ;;
        "kibana")
            service="kibana-service"
            remote_port=5601
            local_port=8601
            ;;
        "jaeger")
            service="jaeger-service"
            remote_port=16686
            local_port=8686
            ;;
        *)
            log_error "Unknown monitoring tool: $tool. Available: grafana, prometheus, kibana, jaeger"
            return 1
            ;;
    esac
    
    log_info "🖥️  Opening $tool monitoring..."
    log_success "Local URL: http://localhost:$local_port"
    
    # Start port forwarding in background
    kubectl port-forward service/$service $local_port:$remote_port -n dessai &
    local pf_pid=$!
    
    sleep 2
    
    # Try to open browser (works on most Linux desktops)
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:$local_port"
    elif command -v open &> /dev/null; then  # macOS
        open "http://localhost:$local_port"
    else
        log_warning "Unable to open browser automatically. Please visit http://localhost:$local_port"
    fi
    
    log_warning "Port forwarding PID: $pf_pid (kill $pf_pid to stop)"
}

# Help function
show_help() {
    log_success "🚀 Dessai Kubernetes Deployment Commands:"
    echo ""
    log_info "Deployment:"
    echo "  deploy [environment] [dry_run]      - Deploy the entire platform"
    echo "  remove [force]                      - Remove the deployment"
    echo "  scale <service> <replicas>          - Scale a service"
    echo ""
    log_info "Monitoring:"
    echo "  status                              - Show deployment status"
    echo "  logs [service] [lines] [follow]     - View logs"
    echo "  monitoring [tool]                   - Open monitoring tools"
    echo ""
    log_info "Utilities:"
    echo "  port-forward [service] [local] [remote] - Port forward to service"
    echo "  db-migrate                          - Run database migrations"
    echo "  db-seed                             - Seed database with test data"
    echo ""
    log_warning "Example usage:"
    echo "  ./k8s/deploy.sh deploy production true    # Test deployment"
    echo "  ./k8s/deploy.sh deploy                     # Deploy to production"
    echo "  ./k8s/deploy.sh status                     # Check status"
    echo "  ./k8s/deploy.sh logs dessai-api 100 true  # Follow API logs"
    echo "  ./k8s/deploy.sh scale dessai-api 5        # Scale API to 5 replicas"
    echo "  ./k8s/deploy.sh monitoring grafana        # Open Grafana dashboard"
}

# Main script logic
main() {
    case ${1:-help} in
        "deploy")
            deploy_dessai $2 $3
            ;;
        "remove")
            remove_dessai $2
            ;;
        "scale")
            scale_dessai $2 $3
            ;;
        "status")
            get_dessai_status
            ;;
        "logs")
            get_dessai_logs $2 $3 $4
            ;;
        "port-forward")
            start_dessai_port_forward $2 $3 $4
            ;;
        "db-migrate")
            invoke_dessai_db_migration
            ;;
        "db-seed")
            invoke_dessai_db_seed
            ;;
        "monitoring")
            open_dessai_monitoring $2
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"
