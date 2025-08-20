# Epic 8: Infrastructure & DevOps - Deployment Validation Script
# Comprehensive validation for Epic 7: Integration Services production deployment
# 
# This script validates all aspects of the integration services deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$Namespace = "dessai",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$Detailed,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipExternalTests
)

# Set error handling
$ErrorActionPreference = "Continue"

# Colors for output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

# Validation results
$ValidationResults = @{
    Passed = 0
    Failed = 0
    Warnings = 0
    Tests = @()
}

# Logging functions
function Write-Success {
    param([string]$Message)
    Write-Host "${Green}✓${Reset} $Message"
    $ValidationResults.Passed++
}

function Write-Failure {
    param([string]$Message)
    Write-Host "${Red}✗${Reset} $Message"
    $ValidationResults.Failed++
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}⚠${Reset} $Message"
    $ValidationResults.Warnings++
}

function Write-Info {
    param([string]$Message)
    Write-Host "${Blue}ℹ${Reset} $Message"
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "${Cyan}=== $Title ===${Reset}"
}

# Add test result
function Add-TestResult {
    param(
        [string]$TestName,
        [string]$Status,
        [string]$Details = ""
    )
    
    $ValidationResults.Tests += @{
        Name = $TestName
        Status = $Status
        Details = $Details
        Timestamp = Get-Date
    }
}

# Test Kubernetes connectivity
function Test-KubernetesConnectivity {
    Write-Section "Kubernetes Connectivity"
    
    try {
        kubectl cluster-info | Out-Null
        Write-Success "Kubernetes cluster is accessible"
        Add-TestResult "Kubernetes Connectivity" "PASS" "Cluster is accessible"
    } catch {
        Write-Failure "Cannot connect to Kubernetes cluster: $($_.Exception.Message)"
        Add-TestResult "Kubernetes Connectivity" "FAIL" $_.Exception.Message
        return $false
    }
    
    # Check namespace
    $namespaceExists = kubectl get namespace $Namespace 2>$null
    if ($namespaceExists) {
        Write-Success "Namespace '$Namespace' exists"
        Add-TestResult "Namespace Existence" "PASS" "Namespace '$Namespace' is available"
    } else {
        Write-Failure "Namespace '$Namespace' does not exist"
        Add-TestResult "Namespace Existence" "FAIL" "Namespace '$Namespace' not found"
        return $false
    }
    
    return $true
}

# Test Integration Services Deployment
function Test-IntegrationServicesDeployment {
    Write-Section "Integration Services Deployment"
    
    # Check deployment exists
    $deployment = kubectl get deployment dessai-integration-services -n $Namespace -o json 2>$null | ConvertFrom-Json
    if ($deployment) {
        Write-Success "Integration services deployment exists"
        Add-TestResult "Deployment Existence" "PASS" "dessai-integration-services deployment found"
        
        # Check deployment status
        $availableReplicas = $deployment.status.availableReplicas
        $desiredReplicas = $deployment.spec.replicas
        
        if ($availableReplicas -eq $desiredReplicas) {
            Write-Success "All replicas are available ($availableReplicas/$desiredReplicas)"
            Add-TestResult "Replica Availability" "PASS" "$availableReplicas/$desiredReplicas replicas available"
        } else {
            Write-Failure "Not all replicas are available ($availableReplicas/$desiredReplicas)"
            Add-TestResult "Replica Availability" "FAIL" "Only $availableReplicas/$desiredReplicas replicas available"
        }
        
        # Check deployment conditions
        if ($deployment.status.conditions) {
            foreach ($condition in $deployment.status.conditions) {
                if ($condition.type -eq "Available" -and $condition.status -eq "True") {
                    Write-Success "Deployment is available"
                    Add-TestResult "Deployment Available" "PASS" "Deployment condition is Available=True"
                } elseif ($condition.type -eq "Progressing" -and $condition.status -eq "True") {
                    Write-Success "Deployment is progressing"
                    Add-TestResult "Deployment Progressing" "PASS" "Deployment is progressing normally"
                }
            }
        }
    } else {
        Write-Failure "Integration services deployment not found"
        Add-TestResult "Deployment Existence" "FAIL" "dessai-integration-services deployment not found"
        return $false
    }
    
    return $true
}

# Test Integration Services Pods
function Test-IntegrationServicesPods {
    Write-Section "Integration Services Pods"
    
    $pods = kubectl get pods -n $Namespace -l app.kubernetes.io/name=dessai-integration-services -o json 2>$null | ConvertFrom-Json
    
    if ($pods.items.Count -eq 0) {
        Write-Failure "No integration services pods found"
        Add-TestResult "Pod Existence" "FAIL" "No pods found with label app.kubernetes.io/name=dessai-integration-services"
        return $false
    }
    
    Write-Success "Found $($pods.items.Count) integration services pod(s)"
    Add-TestResult "Pod Existence" "PASS" "Found $($pods.items.Count) pods"
    
    foreach ($pod in $pods.items) {
        $podName = $pod.metadata.name
        $podPhase = $pod.status.phase
        
        if ($podPhase -eq "Running") {
            Write-Success "Pod '$podName' is running"
            Add-TestResult "Pod Status: $podName" "PASS" "Pod is in Running state"
            
            # Check container readiness
            if ($pod.status.containerStatuses) {
                foreach ($container in $pod.status.containerStatuses) {
                    if ($container.ready) {
                        Write-Success "Container '$($container.name)' in pod '$podName' is ready"
                        Add-TestResult "Container Readiness: $($container.name)" "PASS" "Container is ready"
                    } else {
                        Write-Failure "Container '$($container.name)' in pod '$podName' is not ready"
                        Add-TestResult "Container Readiness: $($container.name)" "FAIL" "Container is not ready"
                    }
                }
            }
        } else {
            Write-Failure "Pod '$podName' is in '$podPhase' state"
            Add-TestResult "Pod Status: $podName" "FAIL" "Pod is in $podPhase state"
        }
        
        # Check pod events if detailed
        if ($Detailed) {
            $events = kubectl get events -n $Namespace --field-selector involvedObject.name=$podName --sort-by='.lastTimestamp' 2>$null
            if ($events) {
                Write-Info "Recent events for pod '$podName':"
                Write-Host $events
            }
        }
    }
    
    return $true
}

# Test Integration Services Service
function Test-IntegrationServicesService {
    Write-Section "Integration Services Service"
    
    $service = kubectl get service dessai-integration-services -n $Namespace -o json 2>$null | ConvertFrom-Json
    
    if ($service) {
        Write-Success "Integration services service exists"
        Add-TestResult "Service Existence" "PASS" "dessai-integration-services service found"
        
        # Check service type
        $serviceType = $service.spec.type
        Write-Info "Service type: $serviceType"
        
        # Check service ports
        foreach ($port in $service.spec.ports) {
            Write-Success "Service exposes port $($port.port):$($port.targetPort) ($($port.name))"
            Add-TestResult "Service Port: $($port.name)" "PASS" "Port $($port.port):$($port.targetPort) exposed"
        }
        
        # Check endpoints
        $endpoints = kubectl get endpoints dessai-integration-services -n $Namespace -o json 2>$null | ConvertFrom-Json
        if ($endpoints -and $endpoints.subsets -and $endpoints.subsets.Count -gt 0) {
            $endpointCount = 0
            foreach ($subset in $endpoints.subsets) {
                if ($subset.addresses) {
                    $endpointCount += $subset.addresses.Count
                }
            }
            Write-Success "Service has $endpointCount endpoint(s)"
            Add-TestResult "Service Endpoints" "PASS" "$endpointCount endpoints available"
        } else {
            Write-Failure "Service has no endpoints"
            Add-TestResult "Service Endpoints" "FAIL" "No endpoints found"
        }
    } else {
        Write-Failure "Integration services service not found"
        Add-TestResult "Service Existence" "FAIL" "dessai-integration-services service not found"
        return $false
    }
    
    return $true
}

# Test Integration Services Health Endpoints
function Test-IntegrationServicesHealth {
    Write-Section "Integration Services Health Endpoints"
    
    if ($SkipExternalTests) {
        Write-Warning "Skipping health endpoint tests as requested"
        return $true
    }
    
    # Get pod names for health checks
    $pods = kubectl get pods -n $Namespace -l app.kubernetes.io/name=dessai-integration-services -o jsonpath='{.items[*].metadata.name}' 2>$null
    
    if ($pods) {
        foreach ($pod in $pods.Split(' ')) {
            if ($pod) {
                Write-Info "Testing health endpoint on pod: $pod"
                
                try {
                    # Test health endpoint
                    $healthResponse = kubectl exec -n $Namespace $pod -- curl -s -f http://localhost:3001/api/integrations/health 2>$null
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Success "Health endpoint responding on pod '$pod'"
                        Add-TestResult "Health Endpoint: $pod" "PASS" "Health endpoint returned 200 OK"
                        
                        if ($Detailed -and $healthResponse) {
                            Write-Info "Health response: $healthResponse"
                        }
                    } else {
                        Write-Failure "Health endpoint not responding on pod '$pod'"
                        Add-TestResult "Health Endpoint: $pod" "FAIL" "Health endpoint returned non-200 status"
                    }
                } catch {
                    Write-Failure "Could not test health endpoint on pod '$pod': $($_.Exception.Message)"
                    Add-TestResult "Health Endpoint: $pod" "FAIL" $_.Exception.Message
                }
                
                # Test API root endpoint
                try {
                    $apiResponse = kubectl exec -n $Namespace $pod -- curl -s -f http://localhost:3001/api/integrations/ 2>$null
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Success "API root endpoint responding on pod '$pod'"
                        Add-TestResult "API Root: $pod" "PASS" "API root endpoint accessible"
                    } else {
                        Write-Warning "API root endpoint not responding on pod '$pod'"
                        Add-TestResult "API Root: $pod" "WARN" "API root endpoint not accessible"
                    }
                } catch {
                    Write-Warning "Could not test API root endpoint on pod '$pod': $($_.Exception.Message)"
                    Add-TestResult "API Root: $pod" "WARN" $_.Exception.Message
                }
            }
        }
    } else {
        Write-Failure "No pods found for health testing"
        Add-TestResult "Health Endpoint Tests" "FAIL" "No pods available for testing"
        return $false
    }
    
    return $true
}

# Test Configuration and Secrets
function Test-ConfigurationAndSecrets {
    Write-Section "Configuration and Secrets"
    
    # Check ConfigMap
    $configMap = kubectl get configmap dessai-integration-services-config -n $Namespace 2>$null
    if ($configMap) {
        Write-Success "Integration services ConfigMap exists"
        Add-TestResult "ConfigMap Existence" "PASS" "dessai-integration-services-config found"
    } else {
        Write-Failure "Integration services ConfigMap not found"
        Add-TestResult "ConfigMap Existence" "FAIL" "dessai-integration-services-config not found"
    }
    
    # Check Secrets
    $secret = kubectl get secret dessai-integration-services-secrets -n $Namespace 2>$null
    if ($secret) {
        Write-Success "Integration services Secret exists"
        Add-TestResult "Secret Existence" "PASS" "dessai-integration-services-secrets found"
    } else {
        Write-Failure "Integration services Secret not found"
        Add-TestResult "Secret Existence" "FAIL" "dessai-integration-services-secrets not found"
    }
    
    # Check ServiceAccount
    $serviceAccount = kubectl get serviceaccount dessai-integration-services -n $Namespace 2>$null
    if ($serviceAccount) {
        Write-Success "Integration services ServiceAccount exists"
        Add-TestResult "ServiceAccount Existence" "PASS" "dessai-integration-services ServiceAccount found"
    } else {
        Write-Failure "Integration services ServiceAccount not found"
        Add-TestResult "ServiceAccount Existence" "FAIL" "dessai-integration-services ServiceAccount not found"
    }
    
    return $true
}

# Test Monitoring Configuration
function Test-MonitoringConfiguration {
    Write-Section "Monitoring Configuration"
    
    # Check ServiceMonitor
    $serviceMonitor = kubectl get servicemonitor dessai-integration-services -n $Namespace 2>$null
    if ($serviceMonitor) {
        Write-Success "Integration services ServiceMonitor exists"
        Add-TestResult "ServiceMonitor Existence" "PASS" "ServiceMonitor configured for Prometheus"
    } else {
        Write-Warning "Integration services ServiceMonitor not found"
        Add-TestResult "ServiceMonitor Existence" "WARN" "ServiceMonitor not found - metrics may not be collected"
    }
    
    # Check if Prometheus is running (optional)
    $prometheusDeployment = kubectl get deployment prometheus -n $Namespace 2>$null
    if ($prometheusDeployment) {
        Write-Success "Prometheus deployment found"
        Add-TestResult "Prometheus Deployment" "PASS" "Prometheus is available for monitoring"
    } else {
        Write-Warning "Prometheus deployment not found in namespace '$Namespace'"
        Add-TestResult "Prometheus Deployment" "WARN" "Prometheus not found - monitoring may be limited"
    }
    
    return $true
}

# Test Ingress Configuration
function Test-IngressConfiguration {
    Write-Section "Ingress Configuration"
    
    # Check Ingress
    $ingress = kubectl get ingress dessai-integration-services -n $Namespace 2>$null
    if ($ingress) {
        Write-Success "Integration services Ingress exists"
        Add-TestResult "Ingress Existence" "PASS" "dessai-integration-services Ingress configured"
        
        # Get ingress details
        if ($Detailed) {
            $ingressDetails = kubectl get ingress dessai-integration-services -n $Namespace -o json 2>$null | ConvertFrom-Json
            if ($ingressDetails.spec.rules) {
                foreach ($rule in $ingressDetails.spec.rules) {
                    Write-Info "Ingress rule: $($rule.host)"
                }
            }
        }
    } else {
        Write-Warning "Integration services Ingress not found"
        Add-TestResult "Ingress Existence" "WARN" "Ingress not configured - external access may be limited"
    }
    
    return $true
}

# Generate validation summary
function Write-ValidationSummary {
    Write-Section "Validation Summary"
    
    Write-Info "Total tests run: $($ValidationResults.Tests.Count)"
    Write-Success "Tests passed: $($ValidationResults.Passed)"
    Write-Warning "Warnings: $($ValidationResults.Warnings)"
    Write-Failure "Tests failed: $($ValidationResults.Failed)"
    
    $successRate = if ($ValidationResults.Tests.Count -gt 0) {
        [math]::Round(($ValidationResults.Passed / $ValidationResults.Tests.Count) * 100, 2)
    } else { 0 }
    
    Write-Info "Success rate: $successRate%"
    
    if ($ValidationResults.Failed -eq 0) {
        Write-Success "🎉 All critical validations passed! Integration services deployment is healthy."
    } elseif ($ValidationResults.Failed -le 2) {
        Write-Warning "⚠️  Some non-critical issues found. Review the failed tests above."
    } else {
        Write-Failure "❌ Multiple critical issues found. Deployment may not be fully functional."
    }
    
    # Detailed test results
    if ($Detailed) {
        Write-Section "Detailed Test Results"
        foreach ($test in $ValidationResults.Tests) {
            $status = switch ($test.Status) {
                "PASS" { "${Green}PASS${Reset}" }
                "FAIL" { "${Red}FAIL${Reset}" }
                "WARN" { "${Yellow}WARN${Reset}" }
                default { $test.Status }
            }
            Write-Host "[$status] $($test.Name) - $($test.Details)"
        }
    }
    
    Write-Info ""
    Write-Info "Epic 7: Integration Services validation completed"
    Write-Info "Epic 8: Infrastructure & DevOps validation completed"
    
    return ($ValidationResults.Failed -eq 0)
}

# Main execution flow
function Main {
    Write-Info "=== Epic 8: Infrastructure & DevOps - Deployment Validation ==="
    Write-Info "Epic 7: Integration Services - Production Validation"
    Write-Info "Validation started at: $(Get-Date)"
    Write-Info "Environment: $Environment"
    Write-Info "Namespace: $Namespace"
    
    # Run all validations
    $allPassed = $true
    
    $allPassed = (Test-KubernetesConnectivity) -and $allPassed
    $allPassed = (Test-IntegrationServicesDeployment) -and $allPassed
    $allPassed = (Test-IntegrationServicesPods) -and $allPassed
    $allPassed = (Test-IntegrationServicesService) -and $allPassed
    $allPassed = (Test-IntegrationServicesHealth) -and $allPassed
    $allPassed = (Test-ConfigurationAndSecrets) -and $allPassed
    $allPassed = (Test-MonitoringConfiguration) -and $allPassed
    $allPassed = (Test-IngressConfiguration) -and $allPassed
    
    # Generate summary
    $summaryPassed = Write-ValidationSummary
    
    if ($summaryPassed) {
        Write-Info "=== Validation Completed Successfully ==="
        exit 0
    } else {
        Write-Info "=== Validation Completed with Issues ==="
        exit 1
    }
}

# Execute main function
Main
