# Dessai Backend - Kubernetes Deployment Scripts

# Deploy all Kubernetes resources
function Deploy-Dessai {
    param(
        [string]$Environment = "production",
        [switch]$DryRun = $false
    )
    
    Write-Host "🚀 Deploying Dessai Platform to Kubernetes ($Environment)" -ForegroundColor Green
    
    $kubectlArgs = @()
    if ($DryRun) {
        $kubectlArgs += "--dry-run=client"
        Write-Host "⚠️  DRY RUN MODE - No actual deployment will occur" -ForegroundColor Yellow
    }
    
    # Check if kubectl is available
    try {
        kubectl version --client | Out-Null
    }
    catch {
        Write-Error "kubectl is not installed or not in PATH"
        return
    }
    
    # Create namespace first
    Write-Host "📁 Creating namespace..." -ForegroundColor Cyan
    kubectl apply -f k8s/namespace.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create namespace"
        return
    }
    
    # Apply ConfigMaps and Secrets
    Write-Host "🔧 Applying configuration..." -ForegroundColor Cyan
    kubectl apply -f k8s/configmaps-secrets.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to apply configuration"
        return
    }
    
    # Deploy monitoring configurations
    Write-Host "📊 Applying monitoring configurations..." -ForegroundColor Cyan
    kubectl apply -f k8s/monitoring-configs.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to apply monitoring configurations"
        return
    }
    
    # Deploy databases
    Write-Host "🗄️  Deploying databases..." -ForegroundColor Cyan
    kubectl apply -f k8s/database-deployments.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy databases"
        return
    }
    
    # Wait for databases to be ready
    if (-not $DryRun) {
        Write-Host "⏳ Waiting for databases to be ready..." -ForegroundColor Yellow
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n dessai --timeout=300s
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n dessai --timeout=300s
    }
    
    # Deploy monitoring stack
    Write-Host "📈 Deploying monitoring stack..." -ForegroundColor Cyan
    kubectl apply -f k8s/monitoring-deployments.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy monitoring stack"
        return
    }
    
    # Deploy main API
    Write-Host "🌐 Deploying API service..." -ForegroundColor Cyan
    kubectl apply -f k8s/api-deployment.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy API service"
        return
    }
    
    # Deploy additional services
    Write-Host "⚙️  Deploying additional services..." -ForegroundColor Cyan
    kubectl apply -f k8s/additional-services.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy additional services"
        return
    }
    
    # Deploy ingress controller and load balancer
    Write-Host "🌍 Deploying ingress controller..." -ForegroundColor Cyan
    kubectl apply -f k8s/ingress-loadbalancer.yaml @kubectlArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy ingress controller"
        return
    }
    
    if (-not $DryRun) {
        # Wait for deployments to be ready
        Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
        kubectl wait --for=condition=available deployment --all -n dessai --timeout=600s
        
        # Show deployment status
        Write-Host "✅ Deployment completed! Status:" -ForegroundColor Green
        kubectl get pods -n dessai -o wide
        Write-Host ""
        kubectl get services -n dessai
        Write-Host ""
        kubectl get ingress -n dessai
    }
    else {
        Write-Host "✅ Dry run completed successfully!" -ForegroundColor Green
    }
}

# Scale deployment
function Scale-Dessai {
    param(
        [string]$Service,
        [int]$Replicas
    )
    
    Write-Host "📏 Scaling $Service to $Replicas replicas..." -ForegroundColor Cyan
    kubectl scale deployment $Service --replicas=$Replicas -n dessai
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully scaled $Service" -ForegroundColor Green
    } else {
        Write-Error "Failed to scale $Service"
    }
}

# Get deployment status
function Get-DessaiStatus {
    Write-Host "📊 Dessai Platform Status:" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Pods:" -ForegroundColor Cyan
    kubectl get pods -n dessai -o wide
    Write-Host ""
    
    Write-Host "Services:" -ForegroundColor Cyan
    kubectl get services -n dessai
    Write-Host ""
    
    Write-Host "Ingress:" -ForegroundColor Cyan
    kubectl get ingress -n dessai
    Write-Host ""
    
    Write-Host "HPA Status:" -ForegroundColor Cyan
    kubectl get hpa -n dessai
    Write-Host ""
    
    Write-Host "PVC Status:" -ForegroundColor Cyan
    kubectl get pvc -n dessai
}

# Clean up deployment
function Remove-Dessai {
    param(
        [switch]$Force = $false
    )
    
    if (-not $Force) {
        $confirmation = Read-Host "This will delete the entire Dessai deployment. Are you sure? (y/N)"
        if ($confirmation -ne "y" -and $confirmation -ne "Y") {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
            return
        }
    }
    
    Write-Host "🗑️  Removing Dessai deployment..." -ForegroundColor Red
    
    # Remove in reverse order
    kubectl delete -f k8s/ingress-loadbalancer.yaml --ignore-not-found=true
    kubectl delete -f k8s/additional-services.yaml --ignore-not-found=true
    kubectl delete -f k8s/api-deployment.yaml --ignore-not-found=true
    kubectl delete -f k8s/monitoring-deployments.yaml --ignore-not-found=true
    kubectl delete -f k8s/database-deployments.yaml --ignore-not-found=true
    kubectl delete -f k8s/monitoring-configs.yaml --ignore-not-found=true
    kubectl delete -f k8s/configmaps-secrets.yaml --ignore-not-found=true
    kubectl delete -f k8s/namespace.yaml --ignore-not-found=true
    
    Write-Host "✅ Dessai deployment removed" -ForegroundColor Green
}

# View logs
function Get-DessaiLogs {
    param(
        [string]$Service = "dessai-api",
        [int]$Lines = 100,
        [switch]$Follow = $false
    )
    
    $kubectlArgs = @("logs", "-n", "dessai", "-l", "app.kubernetes.io/name=$Service", "--tail=$Lines")
    
    if ($Follow) {
        $kubectlArgs += "-f"
        Write-Host "📜 Following logs for $Service (Ctrl+C to stop)..." -ForegroundColor Cyan
    } else {
        Write-Host "📜 Showing last $Lines lines for $Service..." -ForegroundColor Cyan
    }
    
    kubectl @kubectlArgs
}

# Port forward for local access
function Start-DessaiPortForward {
    param(
        [string]$Service = "dessai-api",
        [int]$LocalPort = 3000,
        [int]$RemotePort = 3000
    )
    
    Write-Host "🔌 Starting port forward for $Service ($LocalPort -> $RemotePort)..." -ForegroundColor Cyan
    Write-Host "Access the service at http://localhost:$LocalPort" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop port forwarding" -ForegroundColor Yellow
    
    kubectl port-forward service/$Service-service $LocalPort`:$RemotePort -n dessai
}

# Database operations
function Invoke-DessaiDBMigration {
    Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
    
    $podName = kubectl get pods -n dessai -l app.kubernetes.io/name=dessai-api -o jsonpath="{.items[0].metadata.name}"
    if (-not $podName) {
        Write-Error "No API pods found"
        return
    }
    
    kubectl exec -n dessai $podName -- npm run db:migrate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database migrations completed" -ForegroundColor Green
    } else {
        Write-Error "Database migrations failed"
    }
}

function Invoke-DessaiDBSeed {
    Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
    
    $podName = kubectl get pods -n dessai -l app.kubernetes.io/name=dessai-api -o jsonpath="{.items[0].metadata.name}"
    if (-not $podName) {
        Write-Error "No API pods found"
        return
    }
    
    kubectl exec -n dessai $podName -- npm run db:seed
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database seeding completed" -ForegroundColor Green
    } else {
        Write-Error "Database seeding failed"
    }
}

# Monitoring shortcuts
function Open-DessaiMonitoring {
    param(
        [string]$Tool = "grafana"
    )
    
    $serviceMap = @{
        "grafana" = @{ service = "grafana-service"; port = 3000 }
        "prometheus" = @{ service = "prometheus-service"; port = 9090 }
        "kibana" = @{ service = "kibana-service"; port = 5601 }
        "jaeger" = @{ service = "jaeger-service"; port = 16686 }
    }
    
    if (-not $serviceMap.ContainsKey($Tool)) {
        Write-Error "Unknown monitoring tool: $Tool. Available: grafana, prometheus, kibana, jaeger"
        return
    }
    
    $config = $serviceMap[$Tool]
    $localPort = 8080 + $config.port % 1000
    
    Write-Host "🖥️  Opening $Tool monitoring..." -ForegroundColor Cyan
    Write-Host "Local URL: http://localhost:$localPort" -ForegroundColor Green
    
    Start-Process powershell -ArgumentList "-Command", "kubectl port-forward service/$($config.service) $localPort`:$($config.port) -n dessai"
    Start-Sleep 2
    Start-Process "http://localhost:$localPort"
}

# Help function
function Get-DessaiHelp {
    Write-Host "🚀 Dessai Kubernetes Deployment Commands:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Deployment:" -ForegroundColor Cyan
    Write-Host "  Deploy-Dessai [-Environment production] [-DryRun]  - Deploy the entire platform"
    Write-Host "  Remove-Dessai [-Force]                             - Remove the deployment"
    Write-Host "  Scale-Dessai -Service <name> -Replicas <count>     - Scale a service"
    Write-Host ""
    Write-Host "Monitoring:" -ForegroundColor Cyan
    Write-Host "  Get-DessaiStatus                                   - Show deployment status"
    Write-Host "  Get-DessaiLogs [-Service <name>] [-Lines <count>] [-Follow] - View logs"
    Write-Host "  Open-DessaiMonitoring [-Tool <grafana|prometheus|kibana|jaeger>] - Open monitoring tools"
    Write-Host ""
    Write-Host "Utilities:" -ForegroundColor Cyan
    Write-Host "  Start-DessaiPortForward [-Service <name>] [-LocalPort <port>] - Port forward to service"
    Write-Host "  Invoke-DessaiDBMigration                           - Run database migrations"
    Write-Host "  Invoke-DessaiDBSeed                                - Seed database with test data"
    Write-Host ""
    Write-Host "Example usage:" -ForegroundColor Yellow
    Write-Host "  Deploy-Dessai -DryRun                              # Test deployment"
    Write-Host "  Deploy-Dessai                                      # Deploy to production"
    Write-Host "  Get-DessaiStatus                                   # Check status"
    Write-Host "  Get-DessaiLogs -Service dessai-api -Follow         # Follow API logs"
    Write-Host "  Scale-Dessai -Service dessai-api -Replicas 5       # Scale API to 5 replicas"
    Write-Host "  Open-DessaiMonitoring -Tool grafana                # Open Grafana dashboard"
}

# Export functions
Export-ModuleMember -Function Deploy-Dessai, Remove-Dessai, Scale-Dessai, Get-DessaiStatus, Get-DessaiLogs, Start-DessaiPortForward, Invoke-DessaiDBMigration, Invoke-DessaiDBSeed, Open-DessaiMonitoring, Get-DessaiHelp

# Display help on module load
Get-DessaiHelp
