import React from "react";

const VideoCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      {/* Thumbnail Skeleton */}
      <div className="bg-gray-300 h-48" />

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-6 bg-gray-300 rounded w-3/4" />
        
        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2">
          <div className="flex-1 h-10 bg-gray-300 rounded-lg" />
          <div className="h-10 w-20 bg-gray-300 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default VideoCardSkeleton;
