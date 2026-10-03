const amqplib = require('amqplib');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

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

// Connect to RabbitMQ
let channel = null;
let queueName = 'video-processing-queue';

async function connectToRabbitMQ() {
  try {
    const connection = await amqplib.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Declare the queue
    await channel.assertQueue(queueName, { durable: true });
    
    console.log('🐰 Video processor connected to RabbitMQ');
    console.log(`   Queue: ${queueName}`);
    
    // Set up consumer for processing messages
    channel.consume(queueName, async (msg) => {
      try {
        const message = JSON.parse(msg.content.toString());
        
        console.log(`📹 Processing video: ${message.videoId}`);
        
        await processVideo(message);
        
        // Acknowledge message
        channel.ack(msg);
      } catch (error) {
        console.error(`❌ Error processing video ${message.videoId}:`, error.message);
        
        // Reject and requeue the message
        channel.nack(msg, false, true);
      }
    });
    
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    process.exit(1);
  }
}

// Process a single video
async function processVideo(message) {
  const { videoId, raw_key, file_path, title } = message;
  
  try {
    // Step 1: Move file from local uploads to MinIO
    await moveToMinIO(file_path, raw_key);
    
    // Step 2: Transcode video to multiple formats (HLS)
    const transcodeResult = await transcodeVideo(file_path, raw_key);
    
    // Step 3: Upload HLS segments and manifest to MinIO
    if (transcodeResult.success) {
      await uploadHlsToMinIO(transcodeResult.outputPath, raw_key);
    }
    
    // Update video status in database
    await updateVideoStatus(videoId, 'ready');
    
    console.log(`✅ Video processing completed: ${videoId}`);
    
  } catch (error) {
    console.error(`❌ Video processing failed for ${videoId}:`, error.message);
    
    // Update video status to failed
    await updateVideoStatus(videoId, 'failed', error.message);
    
    throw error;
  }
}

// Move file from local storage to MinIO
async function moveToMinIO(localPath, s3Key) {
  try {
    // Read file from local storage
    const fileBuffer = await fs.readFile(localPath);
    
    // Upload to MinIO
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      Metadata: {
        'original-filename': path.basename(localPath)
      }
    });
    
    await s3Client.send(uploadCommand);
    
    // Clean up local file
    await fs.unlink(localPath);
    
    console.log(`   📤 Uploaded to MinIO: ${s3Key}`);
    
  } catch (error) {
    throw new Error(`Failed to upload to MinIO: ${error.message}`);
  }
}

// Transcode video using FFmpeg
async function transcodeVideo(inputPath, outputPrefix) {
  try {
    // Check if FFmpeg is available
    const ffmpegCheck = await exec('ffmpeg -version');
    
    // Create output directory
    const outputPath = path.join(__dirname, '..', 'uploads', 'hls', outputPrefix);
    await fs.mkdir(outputPath, { recursive: true });
    
    // Get video info
    const ffprobe = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,rate -of json "${inputPath}"`);
    const info = JSON.parse(ffprobe);
    const stream = info.streams[0];
    
    console.log(`   🎬 Video info: ${stream.width}x${stream.height} @ ${stream.codec_name}`);
    
    // Transcode to multiple resolutions for adaptive streaming
    const resolutions = [
      { width: 1920, height: 1080, label: '1080p' },
      { width: 1280, height: 720, label: '720p' },
      { width: 854, height: 480, label: '480p' },
      { width: 640, height: 360, label: '360p' }
    ];
    
    const promises = resolutions.map(async (res) => {
      const qualityLabel = res.label.toLowerCase();
      const bitrate = qualityLabel === '1080p' ? '5000k' : 
                       qualityLabel === '720p' ? '3000k' :
                       qualityLabel === '480p' ? '1500k' : '800k';
      
      const command = `ffmpeg -i "${inputPath}" \
        -c:v libx264 \
        -b:v ${bitrate} \
        -maxrate ${bitrate} \
        -minrate ${bitrate} \
        -s ${res.width}x${res.height} \
        -c:a aac -b:a 128k \
        -preset medium \
        -profile:v baseline -level:3 3.1 \
        -hls_time 6 \
        -hls_list_size 0 \
        -hls_wrap 0 \
        "${outputPath}/${qualityLabel}/video_${qualityLabel}.ts"`;
      
      console.log(`   🔨 Transcoding to ${qualityLabel}...`);
      
      await exec(command);
      
      // Generate playlist for this resolution
      const playlistPath = `${outputPath}/${qualityLabel}/playlist.m3u8`;
      await fs.writeFile(playlistPath, `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:0\n`);
      
      // List all ts files and add to playlist
      const tsFiles = await fs.readdir(`${outputPath}/${qualityLabel}`);
      for (const file of tsFiles.sort()) {
        const content = `#EXTINF:6.000,\n${outputPath}/${qualityLabel}/${file}`;
        await fs.appendFile(playlistPath, content + '\n');
      }
      
      // Add end tag
      await fs.appendFile(playlistPath, '#EXT-X-END-TAG\n');
      
      console.log(`   ✅ Created ${qualityLabel} stream`);
    });
    
    await Promise.all(promises);
    
    return { success: true, outputPath };
    
  } catch (error) {
    throw new Error(`Transcoding failed: ${error.message}`);
  }
}

// Upload HLS segments to MinIO
async function uploadHlsToMinIO(localPath, baseKey) {
  try {
    const hlsDir = path.dirname(localPath);
    const qualityLabels = ['1080p', '720p', '480p', '360p'];
    
    for (const label of qualityLabels) {
      const qualityPath = `${hlsDir}/${label}`;
      
      // Read all TS files in this quality
      const tsFiles = await fs.readdir(qualityPath);
      
      if (tsFiles.length === 0) continue;
      
      // Upload each segment
      for (const file of tsFiles) {
        const filePath = `${qualityPath}/${file}`;
        const s3Key = `${baseKey}/hls/${label}/${file}`;
        
        try {
          const fileBuffer = await fs.readFile(filePath);
          
          const uploadCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: 'application/x-mpegURL'
          });
          
          await s3Client.send(uploadCommand);
        } catch (error) {
          console.error(`   Failed to upload ${file}:`, error.message);
        }
      }
      
      // Upload playlist
      const playlistPath = `${qualityPath}/playlist.m3u8`;
      const playlistBuffer = await fs.readFile(playlistPath);
      
      const playlistKey = `${baseKey}/hls/${label}/playlist.m3u8`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: playlistKey,
        Body: playlistBuffer,
        ContentType: 'application/x-mpegURL'
      });
      
      await s3Client.send(uploadCommand);
    }
    
    console.log(`   📤 Uploaded HLS segments to MinIO`);
    
  } catch (error) {
    throw new Error(`Failed to upload HLS: ${error.message}`);
  }
}

// Update video status in database
async function updateVideoStatus(videoId, status, errorMessage = null) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const query = `
      UPDATE videos
      SET statys = $1, 
          updated_at = now()
      WHERE id = $2
    `;
    
    await pool.query(query, [status, videoId]);
    
    console.log(`   📊 Updated status to: ${status}`);
    
  } catch (error) {
    console.error('Failed to update video status:', error);
    throw error;
  }
}

// Start the worker
connectToRabbitMQ();

module.exports = { processVideo, connectToRabbitMQ };
