# ==============================================
# DOCKERFILE CHO NEXT.JS FRONTEND
# ==============================================
# Sử dụng multi-stage build để tối ưu kích thước image
# 
# GIẢI THÍCH:
# - Stage 1 (deps): Cài đặt dependencies
# - Stage 2 (builder): Build ứng dụng Next.js
# - Stage 3 (runner): Chạy production server
# ==============================================

# ----------------------------------------------
# STAGE 1: DEPENDENCIES
# ----------------------------------------------
FROM node:18-alpine AS deps

# Cài đặt libc6-compat (cần cho một số native modules)
RUN apk add --no-cache libc6-compat

# Đặt thư mục làm việc
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Cài đặt dependencies
RUN npm ci

# ----------------------------------------------
# STAGE 2: BUILDER
# ----------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

# Build arguments - được truyền từ docker-compose
ARG NEXT_PUBLIC_API_URL=http://localhost:6677
ARG NEXT_PUBLIC_WS_URL=http://localhost:6677/ws
ARG NEXT_PUBLIC_ENABLE_WEBSOCKET=false
ARG NEXT_PUBLIC_CAMERA_API_URL=https://api.notis.vn/v4
ARG NEXT_PUBLIC_TILE_LAYER_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
ARG NEXT_PUBLIC_ROUTING_API_URL=https://router.project-osrm.org/route/v1
ARG NEXT_PUBLIC_NOMINATIM_API_URL=https://nominatim.openstreetmap.org

# Chuyển build args thành environment variables cho Next.js
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_ENABLE_WEBSOCKET=$NEXT_PUBLIC_ENABLE_WEBSOCKET
ENV NEXT_PUBLIC_CAMERA_API_URL=$NEXT_PUBLIC_CAMERA_API_URL
ENV NEXT_PUBLIC_TILE_LAYER_URL=$NEXT_PUBLIC_TILE_LAYER_URL
ENV NEXT_PUBLIC_ROUTING_API_URL=$NEXT_PUBLIC_ROUTING_API_URL
ENV NEXT_PUBLIC_NOMINATIM_API_URL=$NEXT_PUBLIC_NOMINATIM_API_URL

# Copy dependencies từ stage trước
COPY --from=deps /app/node_modules ./node_modules

# Copy toàn bộ source code
COPY . .

# Bật standalone output mode trong next.config
ENV NEXT_TELEMETRY_DISABLED=1

# Build ứng dụng
RUN npm run build

# ----------------------------------------------
# STAGE 3: RUNNER (Production)
# ----------------------------------------------
FROM node:18-alpine AS runner

WORKDIR /app

# Tạo user non-root cho security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy public folder
COPY --from=builder /app/public ./public

# Copy build output
# Sử dụng standalone mode để có server.js độc lập
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Chuyển sang user non-root
USER nextjs

# Expose port 3000 (Next.js default)
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Chạy server
CMD ["node", "server.js"]
