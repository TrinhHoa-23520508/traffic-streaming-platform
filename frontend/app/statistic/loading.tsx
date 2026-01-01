export default function StatisticLoading() {
    return (
        <div className="fixed inset-0 h-screen w-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-600 text-sm">Loading statistics...</p>
            </div>
        </div>
    );
}
