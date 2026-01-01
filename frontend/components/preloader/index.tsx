"use client"

import { useEffect } from 'react';

/**
 * Preloads heavy components in the background after the initial page load.
 * This ensures instant navigation between map, statistic, and report pages.
 */
export default function ComponentPreloader() {
    useEffect(() => {
        // Wait for the page to be fully loaded and idle before preloading
        const preloadComponents = () => {
            // Use requestIdleCallback if available, otherwise setTimeout
            const schedulePreload = (callback: () => void, delay: number) => {
                if ('requestIdleCallback' in window) {
                    (window as any).requestIdleCallback(callback, { timeout: delay });
                } else {
                    setTimeout(callback, delay);
                }
            };

            // Preload Map component (if not already loaded)
            schedulePreload(() => {
                import('@/components/map').catch(() => {});
            }, 1000);

            // Preload CityStatistics component
            schedulePreload(() => {
                import('@/components/city-statistics').catch(() => {});
            }, 2000);

            // Preload ReportDialog component
            schedulePreload(() => {
                import('@/components/report-dialog').catch(() => {});
            }, 3000);

            // Preload CameraInfoCard
            schedulePreload(() => {
                import('@/components/camera-info-card').catch(() => {});
            }, 4000);

            // Preload camera data
            schedulePreload(() => {
                const cached = sessionStorage.getItem('cameras_data');
                if (!cached) {
                    fetch('/camera_api.json')
                        .then(res => res.json())
                        .then(data => {
                            sessionStorage.setItem('cameras_data', JSON.stringify({
                                data,
                                timestamp: Date.now()
                            }));
                        })
                        .catch(() => {});
                }
            }, 500);
        };

        // Start preloading after a short delay to not block initial render
        if (document.readyState === 'complete') {
            preloadComponents();
        } else {
            window.addEventListener('load', preloadComponents, { once: true });
        }
    }, []);

    return null;
}
