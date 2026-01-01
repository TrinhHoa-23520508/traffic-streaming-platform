/**
 * Demo YouTube Video Component
 * This component is not used in production.
 * If you need to embed videos, configure NEXT_PUBLIC_VIDEO_EMBED_URL in your environment.
 */
export default function Youtube() {
  const videoUrl = process.env.NEXT_PUBLIC_VIDEO_EMBED_URL;
  
  if (!videoUrl) {
    return (
      <div className="w-[500px] h-[400px] bg-gray-200 flex items-center justify-center text-gray-500">
        Video URL not configured
      </div>
    );
  }
  
  return (
    <iframe 
      width="500" 
      height="400" 
      src={videoUrl} 
      title="Video embed" 
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}