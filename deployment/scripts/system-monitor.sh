#!/bin/bash

# OpenLearn System Monitor - Comprehensive health and performance monitoring
# This script provides detailed monitoring for production EC2 deployment

set -e

# Configuration
APP_NAME="OpenLearn"
APP_URL="https://openlearn.org.in"
API_URL="$APP_URL/api"
HEALTH_URL="$APP_URL/health"
STATUS_URL="$API_URL/status"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=90
DISK_THRESHOLD=85
RESPONSE_TIME_THRESHOLD=2000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

info() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ $1${NC}"
}

header() {
    echo -e "${PURPLE}
╔══════════════════════════════════════════════════════════════════════════╗
║ $1
╚══════════════════════════════════════════════════════════════════════════╝${NC}"
}

# Global variables
HEALTH_STATUS="HEALTHY"
ISSUES=()
WARNINGS=()

# Function to add issue
add_issue() {
    ISSUES+=("$1")
    HEALTH_STATUS="UNHEALTHY"
}

# Function to add warning
add_warning() {
    WARNINGS+=("$1")
    if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
        HEALTH_STATUS="DEGRADED"
    fi
}

# System information
show_system_info() {
    header "System Information"
    
    info "Hostname: $(hostname)"
    info "Uptime: $(uptime -p)"
    info "Kernel: $(uname -r)"
    info "Architecture: $(uname -m)"
    info "Public IP: $(curl -s ifconfig.me 2>/dev/null || echo "Unknown")"
    info "Local IP: $(hostname -I | awk '{print $1}')"
    info "Timezone: $(timedatectl show --property=Timezone --value 2>/dev/null || date +%Z)"
    
    echo ""
}

# System resources monitoring
monitor_system_resources() {
    header "System Resources"
    
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' | sed 's/,//')
    local cpu_int=${cpu_usage%.*}
    
    if [ "$cpu_int" -lt "$CPU_THRESHOLD" ]; then
        success "CPU Usage: ${cpu_usage}% (Normal)"
    elif [ "$cpu_int" -lt 95 ]; then
        warning "CPU Usage: ${cpu_usage}% (High - threshold: ${CPU_THRESHOLD}%)"
        add_warning "High CPU usage: ${cpu_usage}%"
    else
        error "CPU Usage: ${cpu_usage}% (Critical)"
        add_issue "Critical CPU usage: ${cpu_usage}%"
    fi
    
    # Memory Usage
    local memory_info=$(free -h)
    local memory_percent=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    local memory_used=$(echo "$memory_info" | grep Mem | awk '{print $3}')
    local memory_total=$(echo "$memory_info" | grep Mem | awk '{print $2}')
    
    if (( $(echo "$memory_percent < $MEMORY_THRESHOLD" | bc -l) )); then
        success "Memory Usage: ${memory_used}/${memory_total} (${memory_percent}%)"
    elif (( $(echo "$memory_percent < 95" | bc -l) )); then
        warning "Memory Usage: ${memory_used}/${memory_total} (${memory_percent}% - threshold: ${MEMORY_THRESHOLD}%)"
        add_warning "High memory usage: ${memory_percent}%"
    else
        error "Memory Usage: ${memory_used}/${memory_total} (${memory_percent}%)"
        add_issue "Critical memory usage: ${memory_percent}%"
    fi
    
    # Disk Usage
    echo ""
    info "Disk Usage by Partition:"
    df -h | grep -vE '^Filesystem|tmpfs|cdrom' | while read partition; do
        local usage=$(echo "$partition" | awk '{print $5}' | sed 's/%//')
        local mount=$(echo "$partition" | awk '{print $6}')
        local used=$(echo "$partition" | awk '{print $3}')
        local total=$(echo "$partition" | awk '{print $2}')
        
        if [ "$usage" -lt "$DISK_THRESHOLD" ]; then
            success "  $mount: ${used}/${total} (${usage}%)"
        elif [ "$usage" -lt 95 ]; then
            warning "  $mount: ${used}/${total} (${usage}% - threshold: ${DISK_THRESHOLD}%)"
            add_warning "High disk usage on $mount: ${usage}%"
        else
            error "  $mount: ${used}/${total} (${usage}%)"
            add_issue "Critical disk usage on $mount: ${usage}%"
        fi
    done
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{ print $2 }')
    info "Load Average:$load_avg"
    
    # Swap Usage
    local swap_info=$(free -h | grep Swap)
    if [ -n "$swap_info" ]; then
        local swap_used=$(echo "$swap_info" | awk '{print $3}')
        local swap_total=$(echo "$swap_info" | awk '{print $2}')
        info "Swap Usage: ${swap_used}/${swap_total}"
    fi
    
    echo ""
}

# Process monitoring
monitor_processes() {
    header "Process Monitoring"
    
    # PM2 Processes
    if command -v pm2 >/dev/null 2>&1; then
        log "Checking PM2 processes..."
        
        local pm2_output=$(pm2 jlist 2>/dev/null)
        if [ $? -eq 0 ] && [ "$pm2_output" != "[]" ]; then
            local running_count=$(echo "$pm2_output" | jq -r '.[] | select(.pm2_env.status == "online") | .name' 2>/dev/null | wc -l)
            local total_count=$(echo "$pm2_output" | jq -r '.[].name' 2>/dev/null | wc -l)
            
            if [ "$running_count" -eq "$total_count" ] && [ "$total_count" -gt 0 ]; then
                success "PM2 Processes: $running_count/$total_count online"
                
                # Show individual process status
                echo "$pm2_output" | jq -r '.[] | "  " + .name + ": " + .pm2_env.status + " (CPU: " + (.monit.cpu|tostring) + "%, Memory: " + (.monit.memory/1024/1024|floor|tostring) + "MB)"' 2>/dev/null
            else
                error "PM2 Processes: $running_count/$total_count online"
                add_issue "PM2 processes not all running"
            fi
        else
            warning "No PM2 processes found or PM2 not accessible"
        fi
    else
        warning "PM2 not installed"
    fi
    
    echo ""
}

# Docker monitoring
monitor_docker() {
    header "Docker Container Status"
    
    if command -v docker >/dev/null 2>&1; then
        local running_containers=$(docker ps --format "{{.Names}}" 2>/dev/null | wc -l)
        local total_containers=$(docker ps -a --format "{{.Names}}" 2>/dev/null | wc -l)
        
        log "Container Overview: $running_containers/$total_containers running"
        
        # Expected containers
        local expected_containers=("openlearn-postgres" "openlearn-redis" "openlearn-nginx")
        
        for container in "${expected_containers[@]}"; do
            if docker ps --format "{{.Names}}" | grep -q "^$container$" 2>/dev/null; then
                local status=$(docker ps --format "{{.Names}}: {{.Status}}" | grep "^$container:" | cut -d: -f2-)
                success "  $container:$status"
            else
                if docker ps -a --format "{{.Names}}" | grep -q "^$container$" 2>/dev/null; then
                    local status=$(docker ps -a --format "{{.Names}}: {{.Status}}" | grep "^$container:" | cut -d: -f2-)
                    error "  $container:$status (Not running)"
                    add_issue "Container $container is not running"
                else
                    warning "  $container: Not found"
                    add_warning "Container $container not found"
                fi
            fi
        done
        
        # Show resource usage
        log "Container Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null | head -10
        
    else
        warning "Docker not installed or not accessible"
    fi
    
    echo ""
}

# Database monitoring
monitor_database() {
    header "Database Status"
    
    # PostgreSQL
    if docker ps --format "{{.Names}}" | grep -q "openlearn-postgres"; then
        if docker exec openlearn-postgres pg_isready -U postgres >/dev/null 2>&1; then
            success "PostgreSQL: Online and accepting connections"
            
            # Get database info
            local db_version=$(docker exec openlearn-postgres psql -U postgres -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
            local db_size=$(docker exec openlearn-postgres psql -U postgres -t -c "SELECT pg_size_pretty(pg_database_size('openlearn_prod'));" 2>/dev/null | xargs)
            local active_connections=$(docker exec openlearn-postgres psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
            
            info "  Version: $db_version"
            info "  Database Size: $db_size"
            info "  Active Connections: $active_connections"
        else
            error "PostgreSQL: Connection failed"
            add_issue "PostgreSQL connection failed"
        fi
    else
        error "PostgreSQL: Container not running"
        add_issue "PostgreSQL container not running"
    fi
    
    # Redis
    if docker ps --format "{{.Names}}" | grep -q "openlearn-redis"; then
        if docker exec openlearn-redis redis-cli ping >/dev/null 2>&1; then
            success "Redis: Online and responding"
            
            local redis_info=$(docker exec openlearn-redis redis-cli info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
            info "  Memory Usage: $redis_info"
        else
            error "Redis: Connection failed"
            add_issue "Redis connection failed"
        fi
    else
        error "Redis: Container not running"
        add_issue "Redis container not running"
    fi
    
    echo ""
}

# Network and SSL monitoring
monitor_network() {
    header "Network & SSL Status"
    
    # Internet connectivity
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        success "Internet Connectivity: Available"
    else
        error "Internet Connectivity: Failed"
        add_issue "Internet connectivity failed"
    fi
    
    # DNS resolution
    if nslookup google.com >/dev/null 2>&1; then
        success "DNS Resolution: Working"
    else
        error "DNS Resolution: Failed"
        add_issue "DNS resolution failed"
    fi
    
    # SSL Certificate
    local domain="openlearn.org.in"
    local cert_expiry=$(echo | timeout 10 openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ -n "$cert_expiry" ]; then
        local expiry_timestamp=$(date -d "$cert_expiry" +%s 2>/dev/null)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            success "SSL Certificate: Valid for $days_until_expiry days"
        elif [ "$days_until_expiry" -gt 7 ]; then
            warning "SSL Certificate: Expires in $days_until_expiry days"
            add_warning "SSL certificate expires soon"
        else
            error "SSL Certificate: Expires in $days_until_expiry days"
            add_issue "SSL certificate expires very soon"
        fi
    else
        error "SSL Certificate: Check failed"
        add_issue "SSL certificate check failed"
    fi
    
    echo ""
}

# Application endpoint monitoring
monitor_endpoints() {
    header "Application Endpoints"
    
    local endpoints=(
        "$HEALTH_URL:Health Check"
        "$STATUS_URL:Status API" 
        "$API_URL/auth/health:Auth Service"
        "$APP_URL:Main Application"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local url=$(echo "$endpoint_info" | cut -d: -f1)
        local name=$(echo "$endpoint_info" | cut -d: -f2)
        
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$url" --max-time 10 2>/dev/null || echo -e "\nERROR\n0")
        local end_time=$(date +%s%N)
        
        local http_code=$(echo "$response" | tail -2 | head -1)
        local curl_time=$(echo "$response" | tail -1)
        local response_time_ms=$(echo "scale=0; $curl_time * 1000" | bc 2>/dev/null || echo "0")
        
        if [ "$http_code" = "200" ]; then
            if (( $(echo "$response_time_ms < $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
                success "$name: HTTP $http_code (${response_time_ms}ms)"
            else
                warning "$name: HTTP $http_code (${response_time_ms}ms - Slow)"
                add_warning "$name slow response time"
            fi
        else
            error "$name: HTTP $http_code (${response_time_ms}ms)"
            add_issue "$name returned HTTP $http_code"
        fi
    done
    
    echo ""
}

# Log analysis
analyze_logs() {
    header "Log Analysis"
    
    local log_dir="/home/ubuntu/openlearn/logs"
    
    if [ -d "$log_dir" ]; then
        local log_size=$(du -sh "$log_dir" 2>/dev/null | cut -f1)
        info "Log Directory Size: $log_size"
        
        # Recent errors
        local recent_errors=$(find "$log_dir" -name "*.log" -mtime -1 -exec grep -i "error" {} \; 2>/dev/null | wc -l)
        local recent_warnings=$(find "$log_dir" -name "*.log" -mtime -1 -exec grep -i "warning\|warn" {} \; 2>/dev/null | wc -l)
        
        if [ "$recent_errors" -eq 0 ]; then
            success "Recent Errors (24h): $recent_errors"
        elif [ "$recent_errors" -lt 10 ]; then
            warning "Recent Errors (24h): $recent_errors"
            add_warning "Some errors in recent logs"
        else
            error "Recent Errors (24h): $recent_errors"
            add_issue "High error count in recent logs"
        fi
        
        info "Recent Warnings (24h): $recent_warnings"
        
        # Log files by size
        info "Largest Log Files:"
        find "$log_dir" -name "*.log" -type f -exec du -h {} \; 2>/dev/null | sort -hr | head -5 | while read size file; do
            info "  $size - $(basename "$file")"
        done
        
    else
        warning "Log directory not found: $log_dir"
    fi
    
    echo ""
}

# Security monitoring
monitor_security() {
    header "Security Status"
    
    # Failed login attempts
    local failed_logins=$(grep "authentication failure" /var/log/auth.log 2>/dev/null | grep "$(date +%b\ %d)" | wc -l)
    if [ "$failed_logins" -eq 0 ]; then
        success "Failed SSH Logins Today: $failed_logins"
    elif [ "$failed_logins" -lt 10 ]; then
        warning "Failed SSH Logins Today: $failed_logins"
        add_warning "Some failed SSH login attempts"
    else
        error "Failed SSH Logins Today: $failed_logins"
        add_issue "High number of failed SSH login attempts"
    fi
    
    # Firewall status
    if command -v ufw >/dev/null 2>&1; then
        local ufw_status=$(ufw status | grep "Status:" | awk '{print $2}')
        if [ "$ufw_status" = "active" ]; then
            success "UFW Firewall: Active"
        else
            warning "UFW Firewall: $ufw_status"
            add_warning "UFW firewall not active"
        fi
    fi
    
    # fail2ban status
    if command -v fail2ban-client >/dev/null 2>&1; then
        if systemctl is-active fail2ban >/dev/null 2>&1; then
            success "fail2ban: Active"
            local banned_ips=$(fail2ban-client status sshd 2>/dev/null | grep "Currently banned:" | awk -F: '{print $2}' | xargs | wc -w)
            info "  Currently banned IPs: $banned_ips"
        else
            warning "fail2ban: Not active"
            add_warning "fail2ban not active"
        fi
    fi
    
    echo ""
}

# Performance summary
show_performance_summary() {
    header "Performance Summary"
    
    # Top processes by CPU
    info "Top 5 CPU-consuming processes:"
    ps aux --sort=-%cpu | head -6 | tail -5 | while read line; do
        info "  $(echo "$line" | awk '{print $11 " - " $3 "% CPU, " $4 "% Memory"}')"
    done
    
    echo ""
    
    # Top processes by Memory
    info "Top 5 Memory-consuming processes:"
    ps aux --sort=-%mem | head -6 | tail -5 | while read line; do
        info "  $(echo "$line" | awk '{print $11 " - " $4 "% Memory, " $3 "% CPU"}')"
    done
    
    echo ""
}

# Generate summary report
generate_summary() {
    header "Health Check Summary"
    
    local total_checks=$((${#ISSUES[@]} + ${#WARNINGS[@]}))
    
    case "$HEALTH_STATUS" in
        "HEALTHY")
            success "Overall Status: $HEALTH_STATUS ✅"
            success "All systems operational"
            ;;
        "DEGRADED")
            warning "Overall Status: $HEALTH_STATUS ⚠️"
            warning "${#WARNINGS[@]} warning(s) found"
            ;;
        "UNHEALTHY")
            error "Overall Status: $HEALTH_STATUS ❌"
            error "${#ISSUES[@]} critical issue(s) found"
            if [ ${#WARNINGS[@]} -gt 0 ]; then
                warning "${#WARNINGS[@]} warning(s) also found"
            fi
            ;;
    esac
    
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo ""
        warning "Warnings:"
        for warning_msg in "${WARNINGS[@]}"; do
            echo "  ⚠️  $warning_msg"
        done
    fi
    
    if [ ${#ISSUES[@]} -gt 0 ]; then
        echo ""
        error "Critical Issues:"
        for issue in "${ISSUES[@]}"; do
            echo "  ❌ $issue"
        done
    fi
    
    echo ""
    info "Report generated at: $(date)"
    info "Next check recommended in: 5 minutes"
    
    # Set exit code based on health status
    case "$HEALTH_STATUS" in
        "HEALTHY") exit 0 ;;
        "DEGRADED") exit 1 ;;
        "UNHEALTHY") exit 2 ;;
    esac
}

# Main execution
main() {
    clear
    echo -e "${PURPLE}
    ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗
    ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║
    ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║
    ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║
    ███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║
    ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝
    
    ███╗   ███╗ ██████╗ ███╗   ██╗██╗████████╗ ██████╗ ██████╗ 
    ████╗ ████║██╔═══██╗████╗  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗
    ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║   ██║   ██║██████╔╝
    ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║   ██║   ██║██╔══██╗
    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║   ██║   ╚██████╔╝██║  ██║
    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
    
    OpenLearn System Health & Performance Monitor
    ${NC}"
    
    show_system_info
    monitor_system_resources
    monitor_processes
    monitor_docker
    monitor_database
    monitor_network
    monitor_endpoints
    analyze_logs
    monitor_security
    show_performance_summary
    generate_summary
}

# Check if running with options
case "${1:-}" in
    "--help"|"-h")
        echo "OpenLearn System Monitor"
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --quiet, -q   Run in quiet mode (errors only)"
        echo "  --json        Output in JSON format"
        echo ""
        exit 0
        ;;
    "--quiet"|"-q")
        # Redirect stdout to /dev/null, keep stderr
        exec 1>/dev/null
        ;;
    "--json")
        # JSON output mode (simplified for now)
        echo '{"status":"'$HEALTH_STATUS'","timestamp":"'$(date -Iseconds)'","issues":[],"warnings":[]}'
        exit 0
        ;;
esac

# Run main function
main "$@"
