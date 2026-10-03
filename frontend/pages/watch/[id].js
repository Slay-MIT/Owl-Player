import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Hls from 'hls.js';

export default function WatchPage({ id }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quality, setQuality] = useState('auto');
  const [streamUrl, setStreamUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/videos/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          setVideo(data.data);
          
          // Get stream URL
          const streamResponse = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/videos/${id}/stream`);
          if (streamResponse.ok) {
            const streamData = await streamResponse.json();
            setStreamUrl(streamData.data.streamUrl);
          } else {
            // Fallback URL
            setStreamUrl(`${process.env.MINIO_ENDPOINT || 'http://localhost:9000'}/${process.env.MINIO_BUCKET || 'videos'}/hls/${data.data.raw_key}.m3u8`);
          }
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Video not found');
        }
      } catch (error) {
        console.error('Failed to fetch video:', error);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleQualityChange = async (quality) => {
    setQuality(quality);
    
    // Update video element source
    const qualityPath = `/hls/${quality}/playlist.m3u8`;
    const newSource = `${streamUrl}${qualityPath}`;
    
    const player = document.getElementById('video-player');
    if (player) {
      player.src = newSource;
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Owl-Player - Loading...</title>
        </Head>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-gray-400 text-xl">Loading video...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>Owl-Player - Error</title>
        </Head>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-200 mb-4">Error</h1>
            <p className="text-red-200 mb-4">{error}</p>
            <Link href="/" className="inline-block bg-primary-600 hover:bg-primary-700 px-6 py-2 rounded-md font-medium">
              Back to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!video) {
    return (
      <>
        <Head>
          <title>Owl-Player - Video Not Found</title>
        </Head>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-300 mb-4">Video Not Found</h1>
            <Link href="/" className="inline-block bg-primary-600 hover:bg-primary-700 px-6 py-2 rounded-md font-medium">
              Back to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{video.title} - Owl-Player</title>
        <meta name="description" content={`Watch ${video.title}`} />
        
      </Head>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Video Player */}
        <div className="bg-black rounded-lg overflow-hidden shadow-2xl mb-6">
          {/* Video Container with Aspect Ratio */}
          <div className="relative aspect-video bg-black">
            {video.statys === 'ready' ? (
              <>
                {/* HLS.js Player */}
                {typeof Hls !== 'undefined' && (
                  <Hls>
                    {(hls) => {
                      hls.loadSource(streamUrl);
                      hls.attachMedia(document.getElementById('video-player'));
                      
                      hls.on(Hls.Events.MANIFEST_PARSED, function () {
                        const videoElement = document.getElementById('video-player');
                        if (videoElement) {
                          videoElement.play();
                        }
                      });
                      
                      hls.on(Hls.Events.ERROR, function (event, data) {
                        if (data.fatal) {
                          console.error('HLS Error:', data);
                          // Try to recover by changing quality
                          const newQuality = quality === '1080p' ? '720p' : '480p';
                          handleQualityChange(newQuality);
                        }
                      });
                    }}
                  </Hls>
                )}
                
                {/* Fallback for browsers without HLS support */}
                <video
                  id="video-player"
                  className="w-full h-full"
                  controls
                  poster={`${process.env.API_URL || 'http://localhost:3001'}/uploads/${video.raw_key}?t=${Date.now()}`}
                  onError={(e) => {
                    console.error('Video playback error:', e);
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">⏳</div>
                  <p className="text-gray-400 text-xl mb-2">Video is being processed</p>
                  <p className="text-gray-500">Please check back later</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
          
          {video.description && (
            <p className="text-gray-400 mb-4">{video.description}</p>
          )}

          {/* Quality Selector */}
          {video.statys === 'ready' && (
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm text-gray-400">Quality:</span>
              <select
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="auto">Auto</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 mb-4">
            {video.category && (
              <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                {video.category}
              </span>
            )}
            {video.tags?.split(',').slice(0, 5).map((tag, i) => (
              <span key={i} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                {tag.trim()}
              </span>
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded-full ${
              video.statys === 'ready' ? 'bg-green-500' :
              video.statys === 'processing' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></span>
            <span className="text-gray-400 capitalize">{video.statys}</span>
          </div>
        </div>

        {/* Video Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Information</h3>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500">Uploaded:</span>
                <span className="text-gray-300 ml-2">
                  {new Date(video.created_at).toLocaleString()}
                </span>
              </div>
              
              <div>
                <span className="text-gray-500">File Size:</span>
                <span className="text-gray-300 ml-2">
                  {video.fileMetadata?.size ? (video.fileMetadata.size / (1024 * 1024)).toFixed(2) + ' MB' : 'N/A'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-500">File Type:</span>
                <span className="text-gray-300 ml-2">
                  {video.fileMetadata?.contentType || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Share Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Share Video</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                📋 Copy Link
              </button>
              
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-center transition-colors"
              >
                🔗 Open in New Tab
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
