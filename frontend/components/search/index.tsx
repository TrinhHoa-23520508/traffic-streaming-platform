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
    <div ref={searchRef} className="relative w-full max-w-full">
            {/* pill-shaped search bar */}
            <div className={`flex items-center w-full bg-white shadow-md ${showResults ? 'rounded-t-lg' : 'rounded-full'} overflow-hidden border border-gray-200`}>
                {/* left icon */}
                <div className="flex items-center pl-3 pr-2 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                    </svg>
                </div>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                    placeholder="Tìm kiếm địa điểm"
                    className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                />

                <div className="flex items-center pr-2 pl-1">
                    {isLoading ? (
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                    ) : query ? (
                        <button
                            onClick={() => {
                                setQuery('');
                                setResults([]);
                                setShowResults(false);
                            }}
                            className="text-gray-400 hover:text-gray-600 px-2"
                            aria-label="Clear"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    ) : null}
                    <button
                        onClick={() => { /* optional: trigger search */ }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1.5 ml-1 shadow-sm"
                        aria-label="Search"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M10 6a4 4 0 100 8 4 4 0 000-8zM21 21l-4.35-4.35" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Results dropdown attached to the bar */}
            {showResults && results.length > 0 && (
                <div className="absolute z-50 w-full top-full left-0 mt-0 bg-white border border-t-0 border-gray-200 rounded-b-lg shadow-lg max-h-80 overflow-y-auto">
                    {results.map((result) => (
                        <button
                            key={result.place_id}
                            onClick={() => handleSelectLocation(result)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start"
                        >
                            <svg
                                className="w-5 h-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0"
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
                                <p className="text-sm text-gray-900 font-medium leading-tight">
                                    {result.display_name}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No results message */}
            {showResults && query.length >= 3 && results.length === 0 && !isLoading && (
                <div className="absolute z-50 w-full top-full left-0 mt-0 bg-white border border-t-0 border-gray-200 rounded-b-lg shadow-lg p-4">
                    <p className="text-sm text-gray-500 text-center">
                        Không tìm thấy kết quả cho "{query}"
                    </p>
                </div>
            )}
        </div>
    );
}
