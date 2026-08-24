import React from 'react';

interface Artifact {
  id: string;
  type: 'screenshot' | 'video' | 'trace' | 'log';
  name: string;
  url: string;
  size: number;
}

interface VideoPlayerProps {
  artifacts: Artifact[];
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ artifacts }) => {
  const videoArtifacts = artifacts.filter((a) => a.type === 'video');

  if (videoArtifacts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Video Playback</h3>
        <div className="text-center text-gray-500 py-8">
          No video artifacts available for this test run
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">Video Playback</h3>
      <div className="space-y-6">
        {videoArtifacts.map((video) => (
          <div key={video.id} className="border rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h4 className="text-lg font-medium text-gray-900">{video.name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                Size: {formatFileSize(video.size)}
              </p>
            </div>
            <div className="bg-black">
              <video
                src={video.url}
                controls
                className="w-full"
                poster={video.type === 'screenshot' ? video.url : undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default VideoPlayer;
