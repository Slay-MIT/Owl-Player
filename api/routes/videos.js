const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const authMiddleware = require('../middleware/auth');

// All routes need authentication except upload
router.use(authMiddleware);

// GET /api/videos - List all videos with pagination and filtering
router.get('/', videoController.listVideos);

// GET /api/videos/:id - Get single video details
router.get('/:id', videoController.getVideo);

// POST /api/videos - Upload new video (requires auth)
router.post('/upload', videoController.uploadVideo);

// PUT /api/videos/:id - Update video metadata
router.put('/:id', videoController.updateVideo);

// DELETE /api/videos/:id - Delete video (admin only)
router.delete('/:id', videoController.deleteVideo);

// GET /api/videos/:id/stream - Get streaming URL for HLS/DASH
router.get('/:id/stream', videoController.getStreamUrl);

// GET /api/videos/stats - Get video statistics
router.get('/stats', videoController.getStats);

module.exports = router;
