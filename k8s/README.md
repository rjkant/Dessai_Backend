# Dessai Kubernetes Infrastructure - README

This directory contains comprehensive Kubernetes configurations for deploying the Dessai platform in production environments.

## 📋 Overview

The Kubernetes infrastructure provides:
- **Containerized Services**: API, Execution, Proctoring services with Docker containerization
- **Data Layer**: PostgreSQL with persistent storage and Redis caching
- **Monitoring Stack**: Prometheus metrics, Grafana dashboards, ELK logging, Jaeger tracing
- **Load Balancing**: Nginx Ingress Controller with SSL/TLS termination
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA) with CPU/memory metrics
- **Security**: Network policies, RBAC, non-root containers, secrets management
- **High Availability**: Pod Disruption Budget, multi-replica deployments

## 🗂️ File Structure

```
k8s/
├── namespace.yaml              # Kubernetes namespace with resource quotas
├── configmaps-secrets.yaml     # Configuration and secrets management
├── api-deployment.yaml         # Main API deployment with autoscaling
├── database-deployments.yaml   # PostgreSQL and Redis with persistence
├── monitoring-deployments.yaml # Prometheus, Grafana, ELK, Jaeger
├── monitoring-configs.yaml     # Monitoring configurations and dashboards
├── additional-services.yaml    # Execution and Proctoring services
├── ingress-loadbalancer.yaml   # Nginx Ingress with SSL and routing
├── deploy.ps1                  # PowerShell deployment scripts
├── deploy.sh                   # Bash deployment scripts
└── README.md                   # This documentation
```

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes Cluster**: Running cluster with kubectl access
2. **Storage Class**: `fast-ssd` storage class configured
3. **SSL Certificates**: TLS certificates for HTTPS (or cert-manager)
4. **Docker Images**: Built and pushed to registry

### Deploy Everything

**Windows (PowerShell):**
```powershell
# Test deployment (dry run)
.\k8s\deploy.ps1 -DryRun

# Deploy to production
Deploy-Dessai

# Check status
Get-DessaiStatus
```

**Linux/macOS (Bash):**
```bash
# Make script executable
chmod +x k8s/deploy.sh

# Test deployment (dry run)
./k8s/deploy.sh deploy production true

# Deploy to production
./k8s/deploy.sh deploy

# Check status
./k8s/deploy.sh status
```

## 📊 Architecture Components

### Core Services
- **dessai-api**: Main API service (3 replicas, autoscaling 3-10)
- **dessai-execution**: Code execution service (3 replicas, autoscaling 2-10)
- **dessai-proctoring**: Proctoring service (2 replicas, autoscaling 2-8)

### Data Layer
- **PostgreSQL**: Primary database with replication support
- **Redis**: Caching and session storage with persistence

### Monitoring Stack
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization dashboards and monitoring
- **Elasticsearch**: Log aggregation and search
- **Kibana**: Log visualization and analysis
- **Jaeger**: Distributed tracing and performance monitoring

### Infrastructure
- **Nginx Ingress**: Load balancing and SSL termination
- **Network Policies**: Secure inter-service communication
- **Storage**: Persistent volumes for data and logs

## 🔧 Configuration

### Environment Variables
Update `configmaps-secrets.yaml` with your environment-specific values:

```yaml
# ConfigMap data
NODE_ENV: "production"
DATABASE_NAME: "dessai"
DATABASE_HOST: "postgres-service"
REDIS_HOST: "redis-service"

# Secrets (base64 encoded)
DATABASE_PASSWORD: "<base64-encoded>"
JWT_SECRET: "<base64-encoded>"
REDIS_PASSWORD: "<base64-encoded>"
```

### Storage Configuration
Ensure your cluster has the required storage classes:
```bash
kubectl get storageclass
```

If `fast-ssd` doesn't exist, update the storage class names in the YAML files.

### SSL/TLS Setup
The configuration expects SSL certificates in the `dessai-tls` secret. Either:
1. **Manual**: Create the secret with your certificates
2. **cert-manager**: Install cert-manager for automatic certificate management

```bash
# Manual certificate creation
kubectl create secret tls dessai-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n dessai
```

## 📈 Monitoring & Observability

### Access Monitoring Tools

**Using PowerShell:**
```powershell
# Open Grafana dashboard
Open-DessaiMonitoring -Tool grafana

# Open Prometheus
Open-DessaiMonitoring -Tool prometheus

# Open Kibana
Open-DessaiMonitoring -Tool kibana

# Open Jaeger
Open-DessaiMonitoring -Tool jaeger
```

**Using Bash:**
```bash
# Open Grafana dashboard
./k8s/deploy.sh monitoring grafana

# Open Prometheus
./k8s/deploy.sh monitoring prometheus
```

### Key Metrics Monitored
- **API Performance**: Response time, error rate, throughput
- **Database**: Connection count, query performance, storage usage
- **Cache**: Redis memory usage, hit rate, connections
- **Infrastructure**: CPU, memory, disk usage, network traffic
- **Security**: Failed authentication attempts, suspicious activity

### Alerts Configured
- High API response time (>2s)
- High error rate (>5%)
- Database connection failures
- Redis connection failures
- High memory/CPU usage (>80%)
- Pod restart rate

## 🔒 Security Features

### Container Security
- **Non-root users**: All containers run as non-root
- **Read-only filesystem**: Where possible
- **Security contexts**: Restricted capabilities
- **Resource limits**: CPU and memory constraints

### Network Security
- **Network policies**: Restrict inter-pod communication
- **TLS encryption**: All external communication encrypted
- **Internal mTLS**: Secure service-to-service communication

### Access Control
- **RBAC**: Role-based access control for services
- **Service accounts**: Dedicated accounts with minimal permissions
- **Secrets management**: Encrypted storage of sensitive data

## 🎯 Scaling & Performance

### Horizontal Pod Autoscaler (HPA)
Services automatically scale based on:
- **CPU utilization**: Target 70%
- **Memory utilization**: Target 80%

### Manual Scaling
```powershell
# PowerShell
Scale-Dessai -Service dessai-api -Replicas 5

# Bash
./k8s/deploy.sh scale dessai-api 5
```

### Performance Optimization
- **Resource requests/limits**: Optimized for each service
- **Readiness/Liveness probes**: Fast health checks
- **Rolling updates**: Zero-downtime deployments
- **Pod disruption budgets**: Maintain availability during maintenance

## 🗄️ Database Management

### Migrations
```powershell
# PowerShell
Invoke-DessaiDBMigration

# Bash
./k8s/deploy.sh db-migrate
```

### Seeding
```powershell
# PowerShell
Invoke-DessaiDBSeed

# Bash
./k8s/deploy.sh db-seed
```

### Backup & Recovery
PostgreSQL includes automatic backup configuration. For production:
1. Configure automated backups to external storage
2. Test recovery procedures regularly
3. Monitor backup success/failure

## 🔍 Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n dessai -o wide
kubectl describe pod <pod-name> -n dessai
```

### View Logs
```powershell
# PowerShell - Follow API logs
Get-DessaiLogs -Service dessai-api -Follow

# Bash - Show last 100 lines
./k8s/deploy.sh logs dessai-api 100
```

### Debug Network Issues
```bash
# Check services
kubectl get svc -n dessai

# Check endpoints
kubectl get endpoints -n dessai

# Test internal connectivity
kubectl exec -n dessai <pod-name> -- nslookup <service-name>
```

### Resource Issues
```bash
# Check resource usage
kubectl top pods -n dessai
kubectl top nodes

# Check HPA status
kubectl get hpa -n dessai
kubectl describe hpa <hpa-name> -n dessai
```

## 🔄 Maintenance

### Rolling Updates
```bash
# Update deployment image
kubectl set image deployment/dessai-api dessai-api=dessai/api:v2.0.0 -n dessai

# Check rollout status
kubectl rollout status deployment/dessai-api -n dessai

# Rollback if needed
kubectl rollout undo deployment/dessai-api -n dessai
```

### Cleanup
```powershell
# PowerShell - Remove everything
Remove-Dessai -Force

# Bash - Remove everything
./k8s/deploy.sh remove true
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [PostgreSQL on Kubernetes](https://postgresql.org/docs/)

## 🤝 Support

For issues related to the Kubernetes infrastructure:
1. Check the troubleshooting section above
2. Review pod logs and events
3. Consult the monitoring dashboards
4. Refer to the main project documentation

---

**Persona: Technical Strategy Advisor (@cto-advisor)**
**Epic 8: Infrastructure & DevOps - Task 8.1 Docker & Kubernetes Setup: COMPLETED**
