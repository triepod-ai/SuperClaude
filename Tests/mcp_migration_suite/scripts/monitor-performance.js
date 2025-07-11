#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Real-time monitoring of MCP servers and bridge system performance
 */

const axios = require('axios');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      interval: config.interval || 5000, // 5 seconds
      duration: config.duration || 300000, // 5 minutes
      servers: config.servers || [
        { name: 'superclaude-tasks', url: 'http://localhost:3001' },
        { name: 'superclaude-orchestrator', url: 'http://localhost:3002' },
        { name: 'superclaude-code', url: 'http://localhost:3003' },
        { name: 'superclaude-quality', url: 'http://localhost:3004' },
        { name: 'superclaude-performance', url: 'http://localhost:3005' },
        { name: 'bridge-system', url: 'http://localhost:3006' }
      ],
      thresholds: config.thresholds || {
        responseTime: 500, // ms
        memoryUsage: 512 * 1024 * 1024, // 512MB
        cpuUsage: 80, // percentage
        errorRate: 1 // percentage
      },
      outputDir: config.outputDir || './performance-data',
      alerts: config.alerts || true
    };

    this.metrics = [];
    this.alerts = [];
    this.isRunning = false;
    this.startTime = null;
  }

  async start() {
    console.log('🚀 Starting performance monitoring...');
    console.log(`Monitoring ${this.config.servers.length} servers for ${this.config.duration / 1000}s`);
    
    this.isRunning = true;
    this.startTime = Date.now();

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Start monitoring loop
    const monitoringPromise = this.monitoringLoop();

    // Setup WebSocket monitoring if available
    this.setupWebSocketMonitoring();

    // Setup graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    // Wait for monitoring duration
    setTimeout(() => this.stop(), this.config.duration);

    await monitoringPromise;
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('\n🛑 Stopping performance monitoring...');
    this.isRunning = false;

    // Generate final report
    await this.generateReport();

    console.log('✅ Performance monitoring completed');
    process.exit(0);
  }

  async monitoringLoop() {
    while (this.isRunning) {
      const timestamp = Date.now();
      const metrics = await this.collectMetrics(timestamp);
      
      this.metrics.push(metrics);
      this.analyzeMetrics(metrics);
      this.displayRealTimeStatus(metrics);

      await this.sleep(this.config.interval);
    }
  }

  async collectMetrics(timestamp) {
    const metrics = {
      timestamp,
      servers: {},
      system: await this.getSystemMetrics()
    };

    // Collect metrics from each server
    const serverPromises = this.config.servers.map(async (server) => {
      try {
        const serverMetrics = await this.collectServerMetrics(server);
        metrics.servers[server.name] = serverMetrics;
      } catch (error) {
        metrics.servers[server.name] = {
          status: 'error',
          error: error.message,
          responseTime: null,
          available: false
        };
      }
    });

    await Promise.all(serverPromises);
    return metrics;
  }

  async collectServerMetrics(server) {
    const startTime = performance.now();
    
    try {
      // Health check
      const healthResponse = await axios.get(`${server.url}/health`, {
        timeout: 5000
      });
      
      const responseTime = performance.now() - startTime;

      // Performance metrics endpoint
      let performanceData = {};
      try {
        const perfResponse = await axios.get(`${server.url}/metrics`, {
          timeout: 2000
        });
        performanceData = perfResponse.data;
      } catch (error) {
        // Metrics endpoint may not be available
      }

      return {
        status: 'healthy',
        available: true,
        responseTime,
        httpStatus: healthResponse.status,
        performance: performanceData,
        memory: performanceData.memory || null,
        cpu: performanceData.cpu || null,
        activeConnections: performanceData.connections || null,
        requestCount: performanceData.requests || null,
        errorCount: performanceData.errors || 0
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        status: 'unhealthy',
        available: false,
        responseTime: responseTime > 5000 ? null : responseTime,
        error: error.message,
        httpStatus: error.response?.status || null
      };
    }
  }

  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      loadAverage: require('os').loadavg()
    };
  }

  analyzeMetrics(metrics) {
    // Check response time thresholds
    Object.entries(metrics.servers).forEach(([serverName, serverMetrics]) => {
      if (serverMetrics.responseTime && serverMetrics.responseTime > this.config.thresholds.responseTime) {
        this.addAlert('HIGH_RESPONSE_TIME', {
          server: serverName,
          responseTime: serverMetrics.responseTime,
          threshold: this.config.thresholds.responseTime,
          timestamp: metrics.timestamp
        });
      }

      if (!serverMetrics.available) {
        this.addAlert('SERVER_UNAVAILABLE', {
          server: serverName,
          error: serverMetrics.error,
          timestamp: metrics.timestamp
        });
      }

      // Check memory usage if available
      if (serverMetrics.memory && serverMetrics.memory.used > this.config.thresholds.memoryUsage) {
        this.addAlert('HIGH_MEMORY_USAGE', {
          server: serverName,
          memoryUsed: serverMetrics.memory.used,
          threshold: this.config.thresholds.memoryUsage,
          timestamp: metrics.timestamp
        });
      }
    });

    // Check system metrics
    if (metrics.system.memory.used > this.config.thresholds.memoryUsage) {
      this.addAlert('HIGH_SYSTEM_MEMORY', {
        memoryUsed: metrics.system.memory.used,
        threshold: this.config.thresholds.memoryUsage,
        timestamp: metrics.timestamp
      });
    }
  }

  addAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    if (this.config.alerts) {
      console.log(`\n🚨 ALERT: ${type}`);
      console.log(`   ${JSON.stringify(data, null, 2)}`);
    }
  }

  displayRealTimeStatus(metrics) {
    // Clear screen and show current status
    process.stdout.write('\x1B[2J\x1B[0f');
    
    console.log('🔍 SuperClaude MCP Performance Monitor');
    console.log('═'.repeat(60));
    console.log(`Started: ${new Date(this.startTime).toISOString()}`);
    console.log(`Current: ${new Date(metrics.timestamp).toISOString()}`);
    console.log(`Duration: ${Math.floor((metrics.timestamp - this.startTime) / 1000)}s`);
    console.log('');

    // Server status table
    console.log('📊 Server Status:');
    console.log('─'.repeat(80));
    console.log('Server                  | Status    | Response | Memory   | CPU     ');
    console.log('─'.repeat(80));

    Object.entries(metrics.servers).forEach(([name, server]) => {
      const status = server.available ? '✅ UP  ' : '❌ DOWN';
      const responseTime = server.responseTime ? `${server.responseTime.toFixed(0)}ms` : '  N/A  ';
      const memory = server.memory ? `${(server.memory.used / 1024 / 1024).toFixed(0)}MB` : ' N/A  ';
      const cpu = server.cpu ? `${server.cpu.toFixed(1)}%` : ' N/A ';

      console.log(`${name.padEnd(22)} | ${status} | ${responseTime.padStart(7)} | ${memory.padStart(7)} | ${cpu.padStart(6)}`);
    });

    console.log('─'.repeat(80));

    // System metrics
    console.log('\n💻 System Metrics:');
    console.log(`Memory: ${(metrics.system.memory.used / 1024 / 1024).toFixed(0)}MB used, ${(metrics.system.memory.total / 1024 / 1024).toFixed(0)}MB total`);
    console.log(`Load: ${metrics.system.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
    console.log(`Uptime: ${Math.floor(metrics.system.uptime)}s`);

    // Recent alerts
    if (this.alerts.length > 0) {
      console.log('\n🚨 Recent Alerts:');
      this.alerts.slice(-3).forEach(alert => {
        const time = new Date(alert.timestamp).toISOString().substr(11, 8);
        console.log(`${time} - ${alert.type}: ${alert.data.server || 'system'}`);
      });
    }

    console.log('\nPress Ctrl+C to stop monitoring...');
  }

  setupWebSocketMonitoring() {
    try {
      const ws = new WebSocket('ws://localhost:3006/performance/stream');
      
      ws.on('open', () => {
        console.log('📡 WebSocket connection established for real-time metrics');
      });

      ws.on('message', (data) => {
        try {
          const realTimeMetric = JSON.parse(data.toString());
          // Process real-time metrics
        } catch (error) {
          // Ignore parsing errors
        }
      });

      ws.on('error', () => {
        // WebSocket not available, continue with polling
      });

    } catch (error) {
      // WebSocket not available, continue with polling only
    }
  }

  async generateReport() {
    console.log('\n📊 Generating performance report...');

    const report = {
      summary: {
        duration: Date.now() - this.startTime,
        totalMetrics: this.metrics.length,
        totalAlerts: this.alerts.length,
        averageInterval: this.config.interval
      },
      servers: {},
      system: this.analyzeSystemPerformance(),
      alerts: this.categorizeAlerts(),
      recommendations: this.generateRecommendations()
    };

    // Analyze each server
    this.config.servers.forEach(server => {
      report.servers[server.name] = this.analyzeServerPerformance(server.name);
    });

    // Save detailed data
    await fs.writeFile(
      path.join(this.config.outputDir, 'raw-metrics.json'),
      JSON.stringify(this.metrics, null, 2)
    );

    await fs.writeFile(
      path.join(this.config.outputDir, 'alerts.json'),
      JSON.stringify(this.alerts, null, 2)
    );

    // Save report
    await fs.writeFile(
      path.join(this.config.outputDir, 'performance-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate HTML report
    await this.generateHTMLReport(report);

    console.log(`📄 Performance report saved to: ${this.config.outputDir}`);
    this.printSummary(report);
  }

  analyzeServerPerformance(serverName) {
    const serverMetrics = this.metrics
      .map(m => m.servers[serverName])
      .filter(Boolean);

    if (serverMetrics.length === 0) {
      return { available: false, analysis: 'No data collected' };
    }

    const responseTimes = serverMetrics
      .map(m => m.responseTime)
      .filter(rt => rt !== null && rt !== undefined);

    const availability = serverMetrics.filter(m => m.available).length / serverMetrics.length;

    return {
      availability: (availability * 100).toFixed(2),
      responseTime: {
        average: responseTimes.length > 0 ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2) : null,
        min: responseTimes.length > 0 ? Math.min(...responseTimes).toFixed(2) : null,
        max: responseTimes.length > 0 ? Math.max(...responseTimes).toFixed(2) : null,
        p95: responseTimes.length > 0 ? this.percentile(responseTimes, 0.95).toFixed(2) : null
      },
      totalRequests: serverMetrics.length,
      errorCount: serverMetrics.filter(m => !m.available).length,
      analysis: this.getServerAnalysis(serverName, availability, responseTimes)
    };
  }

  analyzeSystemPerformance() {
    const systemMetrics = this.metrics.map(m => m.system);
    
    const memoryUsage = systemMetrics.map(m => m.memory.used);
    const loadAverages = systemMetrics.map(m => m.loadAverage[0]);

    return {
      memory: {
        average: (memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length / 1024 / 1024).toFixed(2),
        peak: (Math.max(...memoryUsage) / 1024 / 1024).toFixed(2)
      },
      load: {
        average: (loadAverages.reduce((a, b) => a + b, 0) / loadAverages.length).toFixed(2),
        peak: Math.max(...loadAverages).toFixed(2)
      }
    };
  }

  categorizeAlerts() {
    const categories = {};
    
    this.alerts.forEach(alert => {
      if (!categories[alert.type]) {
        categories[alert.type] = [];
      }
      categories[alert.type].push(alert);
    });

    return Object.entries(categories).map(([type, alerts]) => ({
      type,
      count: alerts.length,
      firstOccurrence: Math.min(...alerts.map(a => a.timestamp)),
      lastOccurrence: Math.max(...alerts.map(a => a.timestamp))
    }));
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Check for frequent alerts
    const alertCounts = {};
    this.alerts.forEach(alert => {
      alertCounts[alert.type] = (alertCounts[alert.type] || 0) + 1;
    });

    Object.entries(alertCounts).forEach(([alertType, count]) => {
      if (count > this.metrics.length * 0.1) { // More than 10% of checks
        switch (alertType) {
          case 'HIGH_RESPONSE_TIME':
            recommendations.push({
              priority: 'high',
              category: 'performance',
              issue: 'Frequent high response times detected',
              recommendation: 'Consider optimizing server performance, adding caching, or scaling resources'
            });
            break;
          case 'SERVER_UNAVAILABLE':
            recommendations.push({
              priority: 'critical',
              category: 'availability',
              issue: 'Server availability issues detected',
              recommendation: 'Investigate server stability, implement health checks, and consider redundancy'
            });
            break;
          case 'HIGH_MEMORY_USAGE':
            recommendations.push({
              priority: 'medium',
              category: 'resources',
              issue: 'High memory usage detected',
              recommendation: 'Monitor for memory leaks, optimize memory usage, or increase available memory'
            });
            break;
        }
      }
    });

    return recommendations;
  }

  async generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>SuperClaude MCP Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .server-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .server-card { border: 1px solid #ddd; border-radius: 6px; padding: 15px; }
        .server-card h3 { margin-top: 0; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 6px; }
        .critical { background: #f8d7da; border-color: #f5c6cb; }
        .chart-placeholder { height: 200px; background: #e9ecef; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6c757d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SuperClaude MCP Performance Report</h1>
            <p>Generated: ${new Date().toISOString()}</p>
            <p>Duration: ${(report.summary.duration / 1000).toFixed(0)}s | Samples: ${report.summary.totalMetrics}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Alerts</h3>
                <div class="value ${report.summary.totalAlerts === 0 ? 'success' : 'warning'}">${report.summary.totalAlerts}</div>
            </div>
            <div class="metric">
                <h3>System Load</h3>
                <div class="value">${report.system.load.average}</div>
            </div>
            <div class="metric">
                <h3>Memory Usage</h3>
                <div class="value">${report.system.memory.peak}MB</div>
            </div>
            <div class="metric">
                <h3>Monitoring Quality</h3>
                <div class="value success">${((report.summary.totalMetrics * report.summary.averageInterval) / report.summary.duration * 100).toFixed(0)}%</div>
            </div>
        </div>
        
        <h2>Server Performance</h2>
        <div class="server-grid">
            ${Object.entries(report.servers).map(([name, server]) => `
                <div class="server-card">
                    <h3>${name}</h3>
                    <p><strong>Availability:</strong> <span class="${server.availability > 95 ? 'success' : 'warning'}">${server.availability}%</span></p>
                    <p><strong>Avg Response:</strong> ${server.responseTime.average || 'N/A'}ms</p>
                    <p><strong>P95 Response:</strong> ${server.responseTime.p95 || 'N/A'}ms</p>
                    <p><strong>Error Count:</strong> ${server.errorCount}</p>
                </div>
            `).join('')}
        </div>
        
        ${report.recommendations.length > 0 ? `
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation ${rec.priority === 'critical' ? 'critical' : ''}">
                <h4>${rec.category.toUpperCase()}: ${rec.issue}</h4>
                <p>${rec.recommendation}</p>
            </div>
        `).join('')}
        ` : ''}
        
        <h2>Alert Summary</h2>
        ${report.alerts.length > 0 ? 
            report.alerts.map(alert => `<p><strong>${alert.type}:</strong> ${alert.count} occurrences</p>`).join('') :
            '<p class="success">No alerts during monitoring period</p>'
        }
    </div>
</body>
</html>`;

    await fs.writeFile(
      path.join(this.config.outputDir, 'performance-report.html'),
      html
    );
  }

  printSummary(report) {
    console.log('\n📋 Performance Summary:');
    console.log('═'.repeat(50));
    console.log(`Duration: ${(report.summary.duration / 1000).toFixed(0)}s`);
    console.log(`Total Alerts: ${report.summary.totalAlerts}`);
    console.log(`System Peak Memory: ${report.system.memory.peak}MB`);
    console.log(`System Avg Load: ${report.system.load.average}`);
    
    console.log('\n🖥️  Server Summary:');
    Object.entries(report.servers).forEach(([name, server]) => {
      const status = parseFloat(server.availability) > 95 ? '✅' : '⚠️';
      console.log(`${status} ${name}: ${server.availability}% uptime, ${server.responseTime.average || 'N/A'}ms avg response`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.issue}`);
      });
    }
  }

  percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  getServerAnalysis(serverName, availability, responseTimes) {
    if (availability < 0.9) {
      return 'Poor availability - requires immediate attention';
    } else if (availability < 0.95) {
      return 'Suboptimal availability - monitor closely';
    } else if (responseTimes.length > 0 && Math.max(...responseTimes) > 1000) {
      return 'Good availability but occasional slow responses';
    } else {
      return 'Performing well within acceptable parameters';
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    
    switch (key) {
      case 'duration':
        config.duration = parseInt(value) * 1000;
        break;
      case 'interval':
        config.interval = parseInt(value) * 1000;
        break;
      case 'output':
        config.outputDir = value;
        break;
      case 'alerts':
        config.alerts = value === 'true';
        break;
    }
  }

  const monitor = new PerformanceMonitor(config);
  await monitor.start();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceMonitor;