# Sử dụng base image có CUDA
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Thiết lập biến môi trường để tránh prompt khi cài đặt
ENV DEBIAN_FRONTEND=noninteractive

# Cài đặt Python 3.10 (mặc định của Ubuntu 22.04) và các gói cần thiết
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập Python 3 là mặc định
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

WORKDIR /app

COPY requirements.txt .

# Upgrade pip
RUN pip install --upgrade pip

# Cài đặt thư viện Python từ requirements.txt
# --extra-index-url để tìm torch bản CUDA, nhưng vẫn tìm các gói khác trên PyPI
RUN pip install --no-cache-dir -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118

# Tải YOLOv11 model
RUN mkdir -p /app/models
RUN python -c "from ultralytics import YOLO; model = YOLO('yolo11n.pt'); model.save('/app/models/yolo11n.pt')"

COPY src/ ./src/

# Biến môi trường cho CUDA
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

CMD ["python", "src/main.py"]