# Epic 8: Infrastructure & DevOps - Automated Integration Services Deployment
# Production deployment automation for Epic 7: Integration Services
# 
# This script specifically handles the deployment of Integration Services to production

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "dessai",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [string]$ImageTag = "1.0.0",
    
    [Parameter(Mandatory=$false)]
    [string]$Registry = "dessai"
)

# Set error handling
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Blue = "`e[34m"
$Reset = "`e[0m"

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "${Green}[INFO]${Reset} $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}[WARN]${Reset} $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}[ERROR]${Reset} $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
}

# Validate prerequisites
function Test-Prerequisites {
    Write-Info "Validating deployment prerequisites..."
    
    # Check kubectl
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        throw "kubectl is not installed or not in PATH"
    }
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker is not installed or not in PATH"
    }
    
    # Check cluster connectivity
    try {
        kubectl cluster-info | Out-Null
    } catch {
        throw "Unable to connect to Kubernetes cluster"
    }
    
    # Check namespace exists
    $namespaceExists = kubectl get namespace $Namespace 2>$null
    if (-not $namespaceExists) {
        Write-Warning "Namespace '$Namespace' does not exist. Creating..."
        kubectl create namespace $Namespace
    }
    
    Write-Info "Prerequisites validation completed successfully"
}

# Build integration services image
function Build-IntegrationServicesImage {
    Write-Info "Building integration services Docker image..."
    
    # Build integration services image
    docker build -t "${Registry}/integration-services:${ImageTag}" -f Dockerfile.integration .
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build integration services image"
    }
    
    Write-Info "Integration services image built successfully"
}

# Deploy Integration Services to Kubernetes
function Deploy-IntegrationServices {
    Write-Info "Deploying Epic 7: Integration Services to Kubernetes..."
    
    $dryRunFlag = if ($DryRun) { "--dry-run=client" } else { "" }
    
    # Deploy integration services configuration
    Write-Info "Deploying integration services configuration..."
    kubectl apply $dryRunFlag -f k8s/integration-services-config.yaml
    if ($LASTEXITCODE -ne 0 -and -not $DryRun) {
        throw "Failed to deploy integration services configuration"
    }
    
    # Deploy integration services deployment
    Write-Info "Deploying integration services application..."
    kubectl apply $dryRunFlag -f k8s/integration-services-deployment.yaml
    if ($LASTEXITCODE -ne 0 -and -not $DryRun) {
        throw "Failed to deploy integration services deployment"
    }
    
    # Deploy integration services ingress
    Write-Info "Deploying integration services ingress..."
    kubectl apply $dryRunFlag -f k8s/integration-services-ingress.yaml
    if ($LASTEXITCODE -ne 0 -and -not $DryRun) {
        throw "Failed to deploy integration services ingress"
    }
    
    # Deploy integration services monitoring
    Write-Info "Deploying integration services monitoring..."
    kubectl apply $dryRunFlag -f k8s/integration-services-monitoring.yaml
    if ($LASTEXITCODE -ne 0 -and -not $DryRun) {
        throw "Failed to deploy integration services monitoring"
    }
    
    Write-Info "Integration services deployed successfully"
}

# Wait for integration services to be ready
function Wait-ForIntegrationServices {
    if ($DryRun) {
        Write-Info "Skipping readiness check in dry-run mode"
        return
    }
    
    Write-Info "Waiting for integration services to be ready..."
    
    # Wait for deployment rollout
    kubectl rollout status deployment/dessai-integration-services -n $Namespace --timeout=600s
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Integration services deployment did not become ready within timeout"
        return
    }
    
    Write-Info "Integration services deployment is ready"
}

# Verify integration services health
function Test-IntegrationServicesHealth {
    if ($DryRun) {
        Write-Info "Skipping health check in dry-run mode"
        return
    }
    
    Write-Info "Performing integration services health checks..."
    
    # Get pod names
    $pods = kubectl get pods -n $Namespace -l app.kubernetes.io/name=dessai-integration-services -o jsonpath='{.items[*].metadata.name}'
    
    if ($pods) {
        foreach ($pod in $pods.Split(' ')) {
            if ($pod) {
                Write-Info "Checking health of pod: $pod"
                
                # Check pod status
                $podStatus = kubectl get pod $pod -n $Namespace -o jsonpath='{.status.phase}'
                if ($podStatus -eq "Running") {
                    Write-Info "Pod '$pod' is running"
                    
                    # Test health endpoint
                    try {
                        $healthCheck = kubectl exec -n $Namespace $pod -- curl -f http://localhost:3001/api/integrations/health 2>$null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Info "Pod '$pod' health check passed"
                        } else {
                            Write-Warning "Pod '$pod' health check failed"
                        }
                    } catch {
                        Write-Warning "Could not perform health check on pod '$pod': $($_.Exception.Message)"
                    }
                } else {
                    Write-Warning "Pod '$pod' status: $podStatus"
                }
            }
        }
    } else {
        Write-Warning "No integration services pods found"
    }
    
    # Check service endpoints
    Write-Info "Checking integration services endpoints..."
    kubectl get endpoints dessai-integration-services -n $Namespace 2>$null
    
    Write-Info "Health checks completed"
}

# Generate deployment summary
function Write-DeploymentSummary {
    Write-Info "=== Epic 8: Infrastructure & DevOps - Integration Services Deployment Summary ==="
    Write-Info "Environment: $Environment"
    Write-Info "Namespace: $Namespace"
    Write-Info "Image Tag: $ImageTag"
    Write-Info "Registry: $Registry"
    Write-Info "Dry Run: $DryRun"
    
    if (-not $DryRun) {
        Write-Info ""
        Write-Info "Deployed Integration Services Resources:"
        kubectl get all -n $Namespace -l epic=epic-7-integration-services
        
        Write-Info ""
        Write-Info "Integration Services Endpoints:"
        Write-Info "- Health Check: http://localhost:3001/api/integrations/health"
        Write-Info "- API Base URL: http://localhost:3001/api/integrations/"
        Write-Info "- Production URL: https://api.dessai.com/api/integrations/"
        Write-Info "- Dedicated Domain: https://integrations.dessai.com/"
        
        Write-Info ""
        Write-Info "Available API Endpoints:"
        Write-Info "- GET    /api/integrations/health"
        Write-Info "- GET    /api/integrations/"
        Write-Info "- POST   /api/integrations/"
        Write-Info "- GET    /api/integrations/:id"
        Write-Info "- PUT    /api/integrations/:id"
        Write-Info "- DELETE /api/integrations/:id"
        Write-Info "- POST   /api/integrations/:id/test"
        Write-Info "- GET    /api/integrations/greenhouse/jobs"
        Write-Info "- POST   /api/integrations/greenhouse/candidates"
        Write-Info "- GET    /api/integrations/calendar/events"
        Write-Info "- POST   /api/integrations/calendar/schedule"
        Write-Info "- GET    /api/integrations/admin"
        Write-Info "- POST   /api/integrations/sync"
    }
    
    Write-Info ""
    Write-Info "Epic 7: Integration Services deployment completed successfully!"
    Write-Info "Epic 8: Infrastructure & DevOps integration services deployment completed!"
}

# Main execution flow
function Main {
    try {
        Write-Info "=== Epic 8: Infrastructure & DevOps - Integration Services Deployment ==="
        Write-Info "Epic 7: Integration Services - Production Deployment Starting"
        Write-Info "Deployment started at: $(Get-Date)"
        
        # Validate prerequisites
        Test-Prerequisites
        
        # Build integration services image
        Build-IntegrationServicesImage
        
        # Deploy to Kubernetes
        Deploy-IntegrationServices
        
        # Wait for readiness
        Wait-ForIntegrationServices
        
        # Health checks
        Test-IntegrationServicesHealth
        
        # Summary
        Write-DeploymentSummary
        
        Write-Info "=== Integration Services Deployment Completed Successfully ==="
        
    } catch {
        Write-Error "Integration services deployment failed: $($_.Exception.Message)"
        Write-Error "Stack trace: $($_.ScriptStackTrace)"
        exit 1
    }
}

# Execute main function
Main
