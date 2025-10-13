// component/search/index.tsx
"use client"

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    boundingbox: string[];
}

interface SearchProps {
    onSelectLocation: (lat: number, lon: number, name: string) => void;
}

export default function SearchBox({ onSelectLocation }: SearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search function
    useEffect(() => {
        if (query.length < 3) {
            setResults([]);
            return;
        }

        const delaySearch = setTimeout(() => {
            searchLocation(query);
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [query]);

    const searchLocation = async (searchQuery: string) => {
        setIsLoading(true);
        try {
            // Using Nominatim API with Vietnam focus (countrycodes=vn)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    searchQuery
                )}&countrycodes=vn&limit=5&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                    },
                }
            );
            const data = await response.json();
            setResults(data);
            setShowResults(true);
        } catch (error) {
            console.error('Error searching location:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectLocation = (result: SearchResult) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        onSelectLocation(lat, lon, result.display_name);
        setQuery(result.display_name);
        setShowResults(false);
        setResults([]);
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-xl">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                    placeholder="Tìm kiếm địa điểm"
                    className="w-full px-4 py-3 pr-10 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
                {isLoading && (
                    <div className="absolute right-3 top-3">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
                {!isLoading && query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setResults([]);
                            setShowResults(false);
                        }}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Results dropdown */}
            {showResults && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {results.map((result) => (
                        <button
                            key={result.place_id}
                            onClick={() => handleSelectLocation(result)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                            <div className="flex items-start">
                                <svg
                                    className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-900 font-medium">
                                        {result.display_name}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No results message */}
            {showResults && query.length >= 3 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                    <p className="text-sm text-gray-500 text-center">
                        Không tìm thấy kết quả cho "{query}"
                    </p>
                </div>
            )}
        </div>
    );
}
