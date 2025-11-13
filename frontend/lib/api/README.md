# Traffic API Service

Centralized API service for traffic data with automatic WebSocket management and fallback support.

## Features

- ✅ **Single WebSocket Connection** - One connection shared across all components
- ✅ **Automatic Reconnection** - Smart retry logic with configurable attempts
- ✅ **REST API Fallback** - Automatically falls back to polling if WebSocket fails
- ✅ **Subscription System** - Easy to subscribe/unsubscribe to real-time updates
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Data Caching** - Maintains local cache of latest traffic data

## Usage

### Basic REST API Calls

```typescript
import { trafficApi } from "@/lib/api/trafficApi";

// Get latest 100 traffic records
const latest = await trafficApi.getLatest();

// Get latest for specific district
const districtData = await trafficApi.getLatest({ district: "Quận 1" });

// Get summary by district
const summary = await trafficApi.getSummaryByDistrict();
// Returns: { "Quận 1": 150, "Quận 3": 230, ... }

// Get traffic by date
const dateData = await trafficApi.getByDate({
  date: "2025-11-13",
  district: "Quận 1",
});

// Get hourly summary
const hourlySummary = await trafficApi.getHourlySummary({ date: "2025-11-13" });
// Returns: { 0: 10, 1: 5, ..., 23: 45 }
```

### Real-time Updates (WebSocket)

The service automatically manages WebSocket connection when you subscribe to updates:

```typescript
import { useEffect } from "react";
import { trafficApi } from "@/lib/api/trafficApi";

function MyComponent() {
  useEffect(() => {
    // Subscribe to real-time traffic updates
    const unsubscribe = trafficApi.subscribe((trafficData) => {
      console.log("New traffic data:", trafficData);
      // trafficData: { cameraId, totalCount, carCount, ... }

      // Update your component state here
    });

    // Cleanup subscription when component unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return <div>My Component</div>;
}
```

### Access Cached Data

The service maintains a cache of the latest traffic data:

```typescript
// Get cached data for specific camera
const cameraData = trafficApi.getCachedData("camera-123");

// Get all cached data
const allData = trafficApi.getAllCachedData();

// Check WebSocket status
const isConnected = trafficApi.isWebSocketConnected();
```

## How It Works

### Automatic Connection Management

1. **First Subscriber**: When the first component subscribes, the service automatically initializes the WebSocket connection
2. **Active Connection**: As long as there are subscribers, the connection remains active
3. **Auto Cleanup**: When the last subscriber unsubscribes, the connection is closed to save resources

### Fallback Mode

If WebSocket connection fails:

- After 15 seconds or max reconnection attempts
- Automatically switches to REST API polling (every 5 seconds)
- Seamless transition - subscribers continue receiving updates
- If WebSocket becomes available again, switches back automatically

### Example: Dashboard with Multiple Components

```typescript
// components/traffic-dashboard.tsx
import { useEffect, useState } from "react";
import { trafficApi } from "@/lib/api/trafficApi";

function TrafficDashboard() {
  const [trafficData, setTrafficData] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    // Fetch initial data
    trafficApi.getLatest().then((data) => {
      const map = new Map();
      data.forEach((t) => map.set(t.cameraId, t.totalCount));
      setTrafficData(map);
    });

    // Subscribe to real-time updates
    const unsubscribe = trafficApi.subscribe((traffic) => {
      setTrafficData((prev) => {
        const next = new Map(prev);
        next.set(traffic.cameraId, traffic.totalCount);
        return next;
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1>Traffic Dashboard</h1>
      <div>Total Cameras: {trafficData.size}</div>
      {/* ... render your dashboard ... */}
    </div>
  );
}
```

## Configuration

Edit `lib/api/config.ts` to customize:

```typescript
export const API_CONFIG = {
  BASE_URL: "http://localhost:8085",
  WS_URL: "http://localhost:8085/ws",
  WS_TOPIC: "/topic/traffic",
  DEFAULT_TIMEOUT: 10000,
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 5000,
};
```

## Benefits Over Previous Implementation

### Before

- Each component managed its own WebSocket connection
- Multiple connections to the same server
- Duplicate code for connection management
- Hard to switch between WebSocket and REST

### After

- Single shared WebSocket connection
- Centralized connection management
- Simple subscribe/unsubscribe pattern
- Easy to use fallback or switch modes
- Better resource utilization
- Cleaner component code

## Migration Guide

### Old Code (Component manages WebSocket)

```typescript
// ❌ Old way - complex component code
const [data, setData] = useState([]);
const stompClient = useRef(null);

useEffect(() => {
  const client = new Client({
    // ... complex setup
    onConnect: () => {
      client.subscribe("/topic/traffic", (message) => {
        // ... handle message
      });
    },
  });
  client.activate();

  return () => client.deactivate();
}, []);
```

### New Code (Use centralized API)

```typescript
// ✅ New way - simple and clean
const [data, setData] = useState([]);

useEffect(() => {
  const unsubscribe = trafficApi.subscribe((trafficData) => {
    setData((prev) => [...prev, trafficData]);
  });

  return () => unsubscribe();
}, []);
```
