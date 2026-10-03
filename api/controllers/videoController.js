const { Pool } = require('pg');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const amqplib = require('amqplib');

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize S3 client for MinIO
const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY
  }
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'videos';

// List videos with pagination and filtering
exports.listVideos = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query dynamically based on filters
    let query = `
      SELECT 
        id, title, raw_key, statys, created_at,
        (SELECT COUNT(*) FROM videos) as total_count
      FROM videos
      WHERE 1=1
    `;
    
    const conditions = [];
    const values = [];
    
    if (search) {
      conditions.push('(title ILIKE $1 OR raw_key ILIKE $1)');
      values.push(`%${search}%`);
    }
    
    if (status && status !== 'all') {
      conditions.push('statys = $1');
      values.push(status);
    }
    
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }
    
    // Add ordering
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows[0]?.total_count || 0,
        pages: Math.ceil((result.rows[0]?.total_count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get single video details
exports.getVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    const video = result.rows[0];
    
    // Get additional metadata from S3 if available
    let fileMetadata = null;
    try {
      const s3Params = {
        Bucket: BUCKET_NAME,
        Key: video.raw_key
      };
      
      const headObjectCommand = new GetObjectCommand(s3Params);
      const headObjectResponse = await s3Client.send(headObjectCommand);
      
      fileMetadata = {
        size: headObjectResponse.ContentLength,
        contentType: headObjectResponse.ContentType,
        etag: headObjectResponse.ETag
      };
    } catch (s3Error) {
      // File might not exist in S3 yet (processing in progress)
    }
    
    res.json({
      success: true,
      data: { ...video, fileMetadata }
    });
  } catch (error) {
    console.error('Error getting video:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Upload new video
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category, tags } = req.body;
    
    // Multer will handle file upload and store in uploads directory temporarily
    // We'll move it to MinIO later
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }
    
    // Generate raw_key for S3
    const raw_key = `${Date.now()}-${req.file.originalname}`;
    
    // Insert video record with 'uploaded' status (processing in progress)
    const result = await pool.query(
      `INSERT INTO videos (title, raw_key, statys, description, category, tags)
       VALUES ($1, $2, 'processing', $3, $4, $5, $6)
       RETURNING id, title, raw_key, statys, created_at`,
      [
        title || req.file.originalname,
        raw_key,
        description || null,
        category || null,
        tags ? JSON.stringify(tags.split(',')).trim() : null
      ]
    );
    
    // Publish message to RabbitMQ for processing
    try {
      const channel = await amqplib.connect(process.env.RABBITMQ_URL);
      const queueName = 'video-processing-queue';
      
      await channel.assertQueue(queueName, { durable: true });
      
      const message = {
        videoId: result.rows[0].id,
        raw_key: raw_key,
        file_path: req.file.path,
        title: title || req.file.originalname
      };
      
      await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        persistent: true
      });
      
      console.log(`📹 Video upload queued for processing: ${result.rows[0].id}`);
    } catch (mqError) {
      console.error('Failed to queue video for processing:', mqError);
      // Don't fail the upload if MQ is unavailable
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update video metadata
exports.updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, status } = req.body;
    
    const result = await pool.query(
      `UPDATE videos
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           tags = COALESCE($4, tags),
           statys = COALESCE($5, statys)
       WHERE id = $6
       RETURNING id, title, raw_key, statys, created_at`,
      [
        title,
        description,
        category,
        tags ? JSON.stringify(tags.split(',')).trim() : null,
        status,
        id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get video info before deletion
    const result = await pool.query(
      'SELECT raw_key FROM videos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    const video = result.rows[0];
    
    // Delete from S3 if file exists
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: video.raw_key
      });
      
      await s3Client.send(deleteCommand);
      console.log(`🗑️  Deleted video from S3: ${video.raw_key}`);
    } catch (s3Error) {
      console.error('Failed to delete from S3:', s3Error);
    }
    
    // Delete from database
    await pool.query('DELETE FROM videos WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get streaming URL for HLS/DASH
exports.getStreamUrl = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT raw_key, statys FROM videos WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    
    const video = result.rows[0];
    
    // Generate streaming URL based on status
    let streamUrl = '';
    
    if (video.statys === 'ready') {
      // For HLS streaming
      streamUrl = `${process.env.MINIO_ENDPOINT.replace('9000', '9000')}/${BUCKET_NAME}/hls/${video.raw_key}.m3u8`;
    } else if (video.statys === 'processing') {
      return res.status(400).json({ 
        success: false, 
        error: 'Video is still being processed',
        status: video.statys
      });
    }
    
    res.json({
      success: true,
      data: {
        streamUrl,
        videoId: id,
        status: video.statys
      }
    });
  } catch (error) {
    console.error('Error getting stream URL:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get video statistics
exports.getStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_videos,
        SUM(CASE WHEN statys = 'ready' THEN 1 ELSE 0 END) as ready_videos,
        SUM(CASE WHEN statys = 'processing' THEN 1 ELSE 0 END) as processing_videos,
        SUM(CASE WHEN statys = 'failed' THEN 1 ELSE 0 END) as failed_videos,
        SUM(file_size)::bigint as total_storage_bytes,
        EXTRACT(EPOCH FROM MAX(created_at) - MIN(created_at))::integer as days_active
      FROM videos
    `);
    
    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
