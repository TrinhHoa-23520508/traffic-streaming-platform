# Monitoring Stack cho Traffic Streaming Platform

## Tổng quan

Monitoring stack bao gồm:
- **Prometheus**: Thu thập và lưu trữ metrics
- **Grafana**: Visualization và dashboard
- **Alertmanager**: Quản lý alerts
- **Node Exporter**: Thu thập system metrics
- **cAdvisor**: Thu thập container metrics
- **Postgres Exporter**: Thu thập PostgreSQL metrics

## Ports

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| Prometheus | 9090 | http://localhost:9090 | - |
| Grafana | 3000 | http://localhost:3000 | admin/admin |
| Alertmanager | 9093 | http://localhost:9093 | - |
| Node Exporter | 9100 | http://localhost:9100 | - |
| cAdvisor | 8081 | http://localhost:8081 | - |
| Postgres Exporter | 9187 | http://localhost:9187 | - |

## Cách sử dụng

### 1. Khởi động monitoring stack

```bash
cd backend
docker-compose up -d prometheus grafana alertmanager node-exporter cadvisor postgres-exporter
```

### 2. Truy cập Grafana

1. Mở trình duyệt: http://localhost:3000
2. Login: `admin` / `admin`
3. Datasource Prometheus đã được tự động cấu hình

### 3. Xem Prometheus

- Targets: http://localhost:9090/targets
- Alerts: http://localhost:9090/alerts
- Graph: http://localhost:9090/graph

### 4. Xem Alertmanager

- UI: http://localhost:9093


## Alert Rules

Các alert rules đã được cấu hình:

### Critical Alerts
- `ServiceDown`: Service không hoạt động > 1 phút
- `HighErrorRate`: Error rate > 5%
- `DiskSpaceCritical`: Disk space < 5%
- `KafkaPartitionOffline`: Kafka partition offline
- `PostgreSQLDown`: Database down

### Warning Alerts
- `HighCPUUsage`: CPU usage > 80%
- `HighMemoryUsage`: Memory usage > 85%
- `HighRequestRate`: Request rate > 1000 req/s
- `SlowResponseTime`: P95 latency > 2s
- `DiskSpaceRunningOut`: Disk space < 15%

## Tùy chỉnh Alertmanager

Chỉnh sửa file `monitoring/alertmanager/alertmanager.yml` để cấu hình:
- Email notifications
- Slack webhooks
- PagerDuty integration
- Custom webhooks

## Dashboard Grafana

### Tạo dashboard mới

1. Vào Grafana UI
2. Click "+" → "Dashboard"
3. Add Panel
4. Chọn datasource: Prometheus
5. Viết PromQL query

### Import dashboard có sẵn

1. Click "+" → "Import"
2. Nhập Dashboard ID từ grafana.com:
   - 1860: Node Exporter Full
   - 893: Docker and System Monitoring
   - 10991: Kafka Overview
   - 9628: PostgreSQL Database

## PromQL Examples

### Service Health
```promql
up{job="spring-boot-services"}
```

### CPU Usage
```promql
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### Memory Usage
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

### Request Rate
```promql
rate(http_requests_total[5m])
```

### Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

## Backup & Restore

### Backup Grafana dashboards
```bash
docker exec -it grafana grafana-cli admin export-dashboard > backup.json
```

### Backup Prometheus data
```bash
docker cp prometheus:/prometheus ./prometheus-backup
```

## Troubleshooting

### Prometheus không scrape được targets

1. Kiểm tra service có expose metrics endpoint không
2. Kiểm tra network connectivity: `docker exec prometheus ping <service-name>`
3. Xem logs: `docker logs prometheus`

### Grafana không kết nối được Prometheus

1. Kiểm tra datasource configuration
2. Test connection trong Grafana UI
3. Xem logs: `docker logs grafana`

### Alert không được gửi

1. Kiểm tra alert rules: http://localhost:9090/alerts
2. Kiểm tra Alertmanager: http://localhost:9093
3. Xem logs: `docker logs alertmanager`

## Best Practices

1. **Metric Naming**: Sử dụng naming convention chuẩn (app_subsystem_operation_unit)
2. **Labels**: Không dùng quá nhiều labels với high cardinality
3. **Retention**: Cấu hình retention policy phù hợp với storage
4. **Dashboards**: Tạo dashboard theo từng team/service
5. **Alerts**: Chỉ alert cho các vấn đề cần action ngay

## Tài liệu tham khảo

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
