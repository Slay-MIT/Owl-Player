const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Health check endpoint for load balancers and monitoring
router.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  };

  // Check database connection
  checkDatabaseConnection()
    .then(dbStatus => {
      healthData.database = dbStatus;
      
      // Check if worker is running (optional)
      checkWorkerStatus()
        .then(workerStatus => {
          healthData.worker = workerStatus;
          res.json(healthData);
        })
        .catch(err => {
          logger.warn('Worker status check failed:', err.message);
          healthData.worker = { status: 'unknown', error: err.message };
          res.json(healthData);
        });
    })
    .catch(err => {
      logger.error('Health check failed:', err);
      healthData.status = 'unhealthy';
      healthData.database = { status: 'error', error: err.message };
      res.status(503).json(healthData);
    });
});

// Check database connection
async function checkDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    return { status: 'connected' };
  } catch (error) {
    logger.error('Database connection check failed:', error.message);
    return { status: 'disconnected', error: error.message };
  }
}

// Check worker status (optional)
async function checkWorkerStatus() {
  try {
    // In production, you might want to use a separate health endpoint on the worker
    // For now, we'll just return unknown since it's optional
    return { status: 'unknown' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// Ready check for Kubernetes/liveness probes
router.get('/ready', async (req, res) => {
  try {
    const isReady = await checkDatabaseConnection();
    
    if (isReady.status === 'connected') {
      res.json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready', error: isReady.error });
    }
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

// Metrics endpoint for Prometheus scraping
router.get('/metrics', async (req, res) => {
  try {
    const metricsTracker = require('../utils/metrics');
    
    const metrics = {
      uptime_seconds: metricsTracker.getUptime(),
      video_uploads_total: metricsTracker.getCount('video_upload'),
      video_processing_total: metricsTracker.getCount('video_process'),
      errors_total: metricsTracker.getCount('error')
    };
    
    res.set('Content-Type', 'text/plain');
    res.send(`# HELP owl_player_uptime_seconds Uptime of the API server in seconds\n# TYPE owl_player_uptime_seconds gauge\nowl_player_uptime_seconds ${metrics.uptime_seconds}\n# HELP owl_player_video_uploads_total Total number of video uploads\n# TYPE owl_player_video_uploads_total counter\nowl_player_video_uploads_total ${metrics.video_uploads_total}\n`);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

module.exports = router;
