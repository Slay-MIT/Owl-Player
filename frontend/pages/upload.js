import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (5GB limit)
      if (selectedFile.size > 5 * 1024 * 1024 * 1024) {
        setError('File size exceeds 5GB limit');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title || file.name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('tags', tags);

    try {
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/videos/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Video uploaded successfully! ID: ${data.data.id}`);
        
        // Reset form
        setFile(null);
        setTitle('');
        setDescription('');
        setCategory('');
        setTags('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Owl-Player - Upload Video</title>
        <meta name="description" content="Upload a video to your streaming library" />
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Upload Video</h1>

        {error && (
          <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video File (MP4, MOV - Max 5GB)
            </label>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <input
                type="file"
                accept="video/mp4,video/x-m4v,video/quicktime,video/x-msvideo"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-6xl mb-4">📁</div>
                <p className="text-gray-400 mb-2">
                  {file ? file.name : 'Click to select a video file'}
                </p>
                {file && (
                  <p className="text-sm text-gray-500">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title..."
              disabled={uploading}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description..."
              rows={4}
              disabled={uploading}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category (Optional)
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Tutorial, Music, Gaming..."
              disabled={uploading}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma-separated, Optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., tutorial, beginner, javascript..."
              disabled={uploading}
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>

          {/* Upload Button */}
          <button
            type="submit"
            disabled={uploading || !file}
            className={`w-full py-3 rounded-md font-medium text-white transition-colors ${
              uploading || !file
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.062 2.438 5.625 5.625 5.625a7.961 7.961 0 015.291-1.709z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload Video'
            )}
          </button>
        </form>

        {/* Upload Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Instructions</h2>
          <ul className="space-y-2 text-gray-400">
            <li>&bull; Supported formats: MP4, MOV, AVI</li>
            <li>&bull; Maximum file size: 5GB</li>
            <li>&bull; Video will be processed and transcoded to multiple qualities</li>
            <li>&bull; Processing may take several minutes depending on video size</li>
            <li>&bull; You'll receive a notification when processing is complete</li>
          </ul>
        </div>
      </div>
    </>
  );
}
