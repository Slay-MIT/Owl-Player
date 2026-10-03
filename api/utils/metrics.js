const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Metrics tracking for monitoring
class MetricsTracker {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  // Record a metric
  record(name, value, labels = {}) {
    const key = `${name}:${Object.keys(labels).map(k => `${k}=${labels[k]}`).join(',')}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { count: 0, sum: 0, min: Infinity, max: -Infinity });
    }
    
    const metric = this.metrics.get(key);
    metric.count++;
    metric.sum += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
  }

  // Get metric average
  getAverage(name, labels = {}) {
    const key = `${name}:${Object.keys(labels).map(k => `${k}=${labels[k]}`).join(',')}`;
    const metric = this.metrics.get(key);
    
    if (!metric || metric.count === 0) return 0;
    
    return Math.round((metric.sum / metric.count) * 100) / 100;
  }

  // Get metric count
  getCount(name, labels = {}) {
    const key = `${name}:${Object.keys(labels).map(k => `${k}=${labels[k]}`).join(',')}`;
    return this.metrics.get(key)?.count || 0;
  }

  // Get uptime in seconds
  getUptime() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // Export metrics to database
  async exportMetrics() {
    try {
      const metrics = [];
      
      for (const [key, value] of this.metrics.entries()) {
        if (value.count > 0) {
          metrics.push({
            metric_name: key.split(':')[0],
            labels: key.split(':').slice(1).join(':'),
            count: value.count,
            average: Math.round((value.sum / value.count) * 100) / 100,
            min: Math.floor(value.min),
            max: Math.ceil(value.max),
            recorded_at: new Date().toISOString()
          });
        }
      }
      
      // Insert into database if table exists
      if (metrics.length > 0) {
        await pool.query(`
          INSERT INTO api_metrics (metric_name, labels, count, average, min, max, recorded_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          metrics[0].metric_name,
          metrics[0].labels,
          metrics[0].count,
          metrics[0].average,
          metrics[0].min,
          metrics[0].max,
          metrics[0].recorded_at
        ]);
      }
      
      logger.info('Metrics exported');
      
    } catch (error) {
      logger.error('Failed to export metrics:', error);
    }
  }

  // Reset all metrics
  reset() {
    this.metrics.clear();
    this.startTime = Date.now();
  }
}

// Create singleton instance
const metricsTracker = new MetricsTracker();

module.exports = metricsTracker;
