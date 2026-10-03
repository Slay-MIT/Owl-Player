import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/videos?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVideos();
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.raw_key?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || video.statys === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    let comparison = 0;
    if (a[sortBy] < b[sortBy]) comparison = -1;
    if (a[sortBy] > b[sortBy]) comparison = 1;
    return sortOrder === 'ASC' ? comparison : -comparison;
  });

  return (
    <>
      <Head>
        <title>Owl-Player - Home</title>
        <meta name="description" content="Video Streaming Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="space-y-8">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-8 text-center shadow-lg">
          <h1 className="text-4xl font-bold mb-4">Welcome to Owl-Player</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            Upload and stream your videos with adaptive bitrate streaming. 
            Experience high-quality video playback across all devices.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-primary-500">{videos.length}</div>
            <div className="text-gray-400 mt-2">Total Videos</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-500">
              {videos.filter(v => v.statys === 'ready').length}
            </div>
            <div className="text-gray-400 mt-2">Ready</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-yellow-500">
              {videos.filter(v => v.statys === 'processing').length}
            </div>
            <div className="text-gray-400 mt-2">Processing</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-red-500">
              {videos.filter(v => v.statys === 'failed').length}
            </div>
            <div className="text-gray-400 mt-2">Failed</div>
          </div>
        </section>

        {/* Filters */}
        <section className="bg-gray-800 rounded-lg p-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search videos..."
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="created_at">Upload Date</option>
                <option value="title">Title</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-medium text-gray-300 mb-2">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Search
            </button>
          </form>
        </section>

        {/* Video Grid */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Video Library</h2>
          
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading videos...</div>
          ) : sortedVideos.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <p className="text-xl text-gray-400 mb-4">No videos found</p>
              <Link href="/upload" target="_blank" rel="noopener noreferrer" className="inline-block bg-primary-600 hover:bg-primary-700 px-6 py-3 rounded-md font-medium transition-colors">
                Upload Your First Video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function VideoCard({ video }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ready': return 'Ready to Stream';
      case 'processing': return 'Processing...';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      {/* Thumbnail/Placeholder */}
      <div className="aspect-video bg-gray-700 flex items-center justify-center relative group cursor-pointer" onClick={() => window.open(`/watch/${video.id}`, '_blank')}>
        {video.statys === 'ready' ? (
          <>
            <img
              src={`${process.env.API_URL || 'http://localhost:3001'}/uploads/${video.raw_key}?t=${Date.now()}`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/640x360/374151/9ca3af?text=Video+Thumbnail';
              }}
            />
          </>
        ) : (
          <div className="text-center p-4">
            <div className="text-6xl mb-2">🎬</div>
            <p className="text-gray-400">{getStatusText(video.statys)}</p>
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={`/watch/${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md font-medium"
          >
            Watch Now
          </a>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate" title={video.title}>{video.title}</h3>
        
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-block w-2 h-2 rounded-full ${getStatusColor(video.statys)}`}></span>
          <span className="text-sm text-gray-400">{getStatusText(video.statys)}</span>
        </div>

        {/* Metadata */}
        <div className="mt-3 flex flex-wrap gap-2">
          {video.category && (
            <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
              {video.category}
            </span>
          )}
          {video.tags?.split(',').slice(0, 3).map((tag, i) => (
            <span key={i} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
              {tag.trim()}
            </span>
          ))}
        </div>

        {/* Timestamp */}
        <p className="text-sm text-gray-500 mt-3">
          Uploaded {new Date(video.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
