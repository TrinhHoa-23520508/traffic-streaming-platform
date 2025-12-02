import logging
import torch

logger = logging.getLogger(__name__)

class YOLOModel:
    def __init__(self, model_path):
        from ultralytics import YOLO
        logger.info(f"Đang tải model YOLO từ {model_path}")

        # Kiểm tra GPU có sẵn không
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Sử dụng device: {self.device}")

        if self.device == 'cuda':
            logger.info(f"GPU Name: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")

        # Load model và chuyển sang GPU
        self.model = YOLO(model_path)
        self.model.to(self.device)

        # Các loại phương tiện và đối tượng cần phát hiện
        self.detection_classes = {
            0: 'person',
            1: 'bicycle',
            2: 'car',
            3: 'motorcycle',
            5: 'bus',
            7: 'truck'
        }
        
        logger.info(f"Đã tải model YOLO thành công trên {self.device}")
        logger.info(f"Các đối tượng sẽ được phát hiện: {list(self.detection_classes.values())}")

    def analyze_image(self, images):
        """
        Phân tích hình ảnh với YOLO trên GPU
        Args:
            images: Một list các numpy array (batch) hoặc 1 ảnh đơn lẻ
        """
        results = self.model(images, device=self.device, verbose=False)
        return results

    def count_objects(self, results):
        """Đếm tất cả đối tượng"""
        total_count = 0
        object_types = {}
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id in self.detection_classes:
                    total_count += 1
                    object_type = self.detection_classes[cls_id]
                    object_types[object_type] = object_types.get(object_type, 0) + 1
        
        logger.info(f"Phát hiện tổng cộng {total_count} đối tượng:")
        for obj_type, count in object_types.items():
            logger.info(f"  - {obj_type}: {count}")
        
        return {
            'total': total_count,
            'details': object_types
        }
    
    def count_vehicles_only(self, results):
        """
        Chỉ đếm phương tiện (không bao gồm người và xe đạp)
        
        Args:
            results: Kết quả từ YOLO model
            
        Returns:
            dict: Thống kê phương tiện
        """
        vehicle_classes = {2: 'car', 3: 'motorcycle', 5: 'bus', 7: 'truck'}
        vehicle_count = 0
        vehicle_types = {}
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id in vehicle_classes:
                    vehicle_count += 1
                    vehicle_type = vehicle_classes[cls_id]
                    vehicle_types[vehicle_type] = vehicle_types.get(vehicle_type, 0) + 1
        
        return {
            'total': vehicle_count,
            'details': vehicle_types
        }