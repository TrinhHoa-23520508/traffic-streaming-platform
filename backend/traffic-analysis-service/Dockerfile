FROM python:3.9-slim

# Cài đặt các gói cần thiết
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép file requirements
COPY requirements.txt .

# Cài đặt các thư viện
RUN pip install --no-cache-dir numpy opencv-python kafka-python requests Pillow minio
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir ultralytics

# Tạo thư mục cho models và tải YOLOv11n
RUN mkdir -p /app/models
RUN python -c "from ultralytics import YOLO; model = YOLO('yolo11n.pt'); model.save('/app/models/yolo11n.pt')"

# Sao chép mã nguồn
COPY src/ ./src/

# Thiết lập lệnh chạy ứng dụng
CMD ["python", "src/main.py"]