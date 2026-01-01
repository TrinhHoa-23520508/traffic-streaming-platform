export default function MapLoading() {
    return (
        <div className="fixed inset-0 h-screen w-screen bg-gray-100 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-600 text-sm">Loading map...</p>
            </div>
        </div>
    );
}
