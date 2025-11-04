# 📚 Traffic API & WebSocket Usage Guide

This guide explains how to use the centralized API service and WebSocket for real-time traffic data in your application.

---

## 🎯 Quick Start

### Import the API Service

```typescript
import { trafficApi } from "@/lib/api/trafficApi";
import { API_CONFIG } from "@/lib/api/config";
```

---

## 📡 REST API Usage

### 1. Get Latest Traffic Data (100 records)

```typescript
// Get all latest traffic records
const allTraffic = await trafficApi.getLatest();

// Get latest for specific district
const districtTraffic = await trafficApi.getLatest({
  district: "Quận 1",
});

// Example response:
// [
//   {
//     id: 372,
//     cameraId: "TTH 29.4",
//     cameraName: "Trường Sơn - Ga Quốc Nội 2",
//     district: "Quận Tân Bình",
//     coordinates: [106.66490256786346, 10.812946593709597],
//     detectionDetails: { car: 3 },
//     totalCount: 3,
//     timestamp: "2025-11-02T12:05:26.540Z"
//   },
//   ...
// ]
```

### 2. Get Traffic Summary by District

```typescript
// Get today's summary
const todaySummary = await trafficApi.getSummaryByDistrict();

// Get summary for specific date
const dateSummary = await trafficApi.getSummaryByDistrict({
  date: "2025-11-03",
});

// Example response:
// {
//   "Quận 1": 150,
//   "Quận Tân Bình": 230,
//   "Quận 3": 180,
//   ...
// }
```

### 3. Get All Traffic Records for a Date

```typescript
// Get all records for today
const todayRecords = await trafficApi.getByDate();

// Get records for specific date
const dateRecords = await trafficApi.getByDate({
  date: "2025-11-03",
});

// Get records for specific date and district
const filteredRecords = await trafficApi.getByDate({
  date: "2025-11-03",
  district: "Quận 1",
});

// Returns: TrafficMetricsDTO[]
```

### 4. Get Hourly Traffic Summary

```typescript
// Get today's hourly summary (all districts)
const todayHourly = await trafficApi.getHourlySummary();

// Get hourly summary for specific district
const districtHourly = await trafficApi.getHourlySummary({
  district: "Quận 1",
});

// Get hourly summary for specific date and district
const specificHourly = await trafficApi.getHourlySummary({
  date: "2025-11-03",
  district: "Quận 1",
});

// Example response:
// {
//   0: 10,   // 12:00 AM - 1:00 AM
//   1: 5,    // 1:00 AM - 2:00 AM
//   2: 3,    // 2:00 AM - 3:00 AM
//   ...
//   23: 45   // 11:00 PM - 12:00 AM
// }
```

### 5. Health Check

```typescript
// Check if API is available
const isOnline = await trafficApi.healthCheck();
if (isOnline) {
  console.log("API is available");
} else {
  console.log("API is offline");
}
```

---

## 🔌 WebSocket Usage (Real-time Updates)

### Basic WebSocket Setup

```typescript
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_CONFIG, getWsUrl } from "@/lib/api/config";
import type { TrafficMetricsDTO } from "@/types/traffic";

// In your component
useEffect(() => {
  const wsUrl = getWsUrl(); // 'http://localhost:8085/ws'

  const client = new Client({
    brokerURL: undefined,
    webSocketFactory: () => new SockJS(wsUrl),
    reconnectDelay: 5000,
    onConnect: () => {
      console.log("Connected to WebSocket");

      // Subscribe to traffic topic
      client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
        const trafficData: TrafficMetricsDTO = JSON.parse(message.body);

        // Handle real-time data
        console.log("New traffic data:", trafficData);
        // Update your state here
      });
    },
    onStompError: (frame) => {
      console.error("STOMP error:", frame);
    },
  });

  client.activate();

  // Cleanup
  return () => {
    client.deactivate();
  };
}, []);
```

---

## 📊 Complete Component Examples

### Example 1: Display District Statistics

```typescript
"use client";

import { useState, useEffect } from "react";
import { trafficApi } from "@/lib/api/trafficApi";
import type { DistrictSummary } from "@/lib/api/trafficApi";

export default function DistrictStats() {
  const [summary, setSummary] = useState<DistrictSummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await trafficApi.getSummaryByDistrict();
        setSummary(data);
        setError(null);
      } catch (err) {
        setError("Failed to load district statistics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Traffic by District</h2>
      <div className="grid gap-2">
        {Object.entries(summary).map(([district, count]) => (
          <div
            key={district}
            className="flex justify-between p-2 bg-gray-100 rounded"
          >
            <span className="font-medium">{district}</span>
            <span className="text-blue-600">{count} vehicles</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 2: Hourly Traffic Chart

```typescript
"use client";

import { useState, useEffect } from "react";
import { trafficApi } from "@/lib/api/trafficApi";
import type { HourlySummary } from "@/lib/api/trafficApi";

export default function HourlyChart() {
  const [hourlyData, setHourlyData] = useState<HourlySummary>({});
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  useEffect(() => {
    async function loadHourlyData() {
      try {
        const data = await trafficApi.getHourlySummary({
          district: selectedDistrict || undefined,
        });
        setHourlyData(data);
      } catch (err) {
        console.error("Failed to load hourly data:", err);
      }
    }

    loadHourlyData();
  }, [selectedDistrict]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">24-Hour Traffic Pattern</h2>

      <select
        value={selectedDistrict}
        onChange={(e) => setSelectedDistrict(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        <option value="">All Districts</option>
        <option value="Quận 1">Quận 1</option>
        <option value="Quận Tân Bình">Quận Tân Bình</option>
        {/* Add more districts */}
      </select>

      <div className="space-y-1">
        {Object.entries(hourlyData).map(([hour, count]) => (
          <div key={hour} className="flex items-center gap-2">
            <span className="w-16 text-sm">{hour}:00</span>
            <div
              className="bg-blue-500 h-6 rounded"
              style={{
                width: `${
                  (count / Math.max(...Object.values(hourlyData))) * 100
                }%`,
              }}
            />
            <span className="text-sm">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 3: Real-time Traffic Feed with WebSocket

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { trafficApi } from "@/lib/api/trafficApi";
import { API_CONFIG, getWsUrl } from "@/lib/api/config";
import type { TrafficMetricsDTO } from "@/types/traffic";

export default function RealTimeTrafficFeed() {
  const [trafficFeed, setTrafficFeed] = useState<TrafficMetricsDTO[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // Load initial data
    async function loadInitial() {
      try {
        const data = await trafficApi.getLatest();
        setTrafficFeed(data.slice(0, 10)); // Show latest 10
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }

    loadInitial();

    // Setup WebSocket
    const client = new Client({
      brokerURL: undefined,
      webSocketFactory: () => new SockJS(getWsUrl()),
      reconnectDelay: 5000,
      onConnect: () => {
        setIsConnected(true);

        client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
          const newTraffic: TrafficMetricsDTO = JSON.parse(message.body);

          // Add to feed (keep only last 10)
          setTrafficFeed((prev) => [newTraffic, ...prev].slice(0, 10));
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Live Traffic Feed</h2>
        <div
          className={`px-3 py-1 rounded-full text-sm ${
            isConnected
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isConnected ? "🟢 Live" : "🔴 Offline"}
        </div>
      </div>

      <div className="space-y-2">
        {trafficFeed.map((traffic) => (
          <div
            key={traffic.id}
            className="p-3 bg-white border rounded shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{traffic.cameraName}</div>
                <div className="text-sm text-gray-600">{traffic.district}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  {traffic.totalCount}
                </div>
                <div className="text-xs text-gray-500">vehicles</div>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {new Date(traffic.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🛠️ Configuration

### Update API URLs (Production)

In `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-api.com
NEXT_PUBLIC_WS_URL=https://your-api.com/ws
```

### Custom Timeouts

Edit `lib/api/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: "http://localhost:8085",
  WS_URL: "http://localhost:8085/ws",
  DEFAULT_TIMEOUT: 10000, // Change timeout
  MAX_RECONNECT_ATTEMPTS: 10, // Change max attempts
  RECONNECT_DELAY: 5000, // Change reconnect delay
};
```

---

## 🎨 TypeScript Types

All types are available for import:

```typescript
import type { TrafficMetricsDTO, DetectionDetails } from "@/types/traffic";

import type {
  LatestParams,
  SummaryByDistrictParams,
  ByDateParams,
  HourlySummaryParams,
  DistrictSummary,
  HourlySummary,
} from "@/lib/api/trafficApi";
```

---

## ✅ Best Practices

1. **Always use try-catch** when calling API methods
2. **Show loading states** while fetching data
3. **Handle errors gracefully** with user-friendly messages
4. **Clean up WebSocket connections** in useEffect cleanup
5. **Use TypeScript types** for type safety
6. **Cache data** when appropriate to reduce API calls
7. **Implement fallbacks** for when API is unavailable

---

## 🚀 Summary

- **REST API**: Use `trafficApi.methodName()` for data fetching
- **WebSocket**: Use STOMP client for real-time updates
- **Configuration**: All settings in `lib/api/config.ts`
- **Types**: Full TypeScript support with interfaces
- **Error Handling**: Built-in error logging and graceful failures

Your traffic API is now ready to use anywhere in your application! 🎉
