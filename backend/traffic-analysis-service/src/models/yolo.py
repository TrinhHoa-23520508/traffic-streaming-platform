import logging

logger = logging.getLogger(__name__)

class YOLOModel:
    def __init__(self, model_path):
        from ultralytics import YOLO
        logger.info(f"Đang tải model YOLO từ {model_path}")
        self.model = YOLO(model_path)
        
        # Các loại phương tiện và đối tượng cần phát hiện trong COCO dataset
        # Bao gồm: người, xe đạp, xe máy, ô tô, xe bus, xe tải
        self.detection_classes = {
            0: 'person',        # Người
            1: 'bicycle',       # Xe đạp
            2: 'car',           # Ô tô
            3: 'motorcycle',    # Xe máy
            5: 'bus',           # Xe bus
            7: 'truck'          # Xe tải
        }
        
        logger.info(f"Đã tải model YOLO thành công")
        logger.info(f"Các đối tượng sẽ được phát hiện: {list(self.detection_classes.values())}")

    def analyze_image(self, image):
        """
        Phân tích hình ảnh với YOLO
        
        Args:
            image: numpy array hoặc đường dẫn file ảnh
            
        Returns:
            results: Kết quả phát hiện từ YOLO
        """
        results = self.model(image)
        return results

    def count_objects(self, results):
        """
        Đếm tất cả đối tượng được phát hiện (phương tiện + người)
        
        Args:
            results: Kết quả từ YOLO model
            
        Returns:
            dict: Thống kê đối tượng
        """
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