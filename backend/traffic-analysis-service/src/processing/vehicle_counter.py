import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)

class VehicleCounter:
    def __init__(self, yolo_model):
        self.yolo_model = yolo_model
        logger.info("Khởi tạo VehicleCounter")

    def count_vehicles(self, image_data):
        """
        Đếm tất cả đối tượng trong ảnh (phương tiện + người + xe đạp)
        
        Args:
            image_data: bytes hoặc numpy array của ảnh
            
        Returns:
            dict: Thống kê đầy đủ các đối tượng
        """
        try:
            # Chuyển đổi image_data thành numpy array nếu cần
            if isinstance(image_data, bytes):
                nparr = np.frombuffer(image_data, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            else:
                image = image_data
            
            if image is None:
                logger.error("Không thể đọc ảnh")
                return {'total': 0, 'details': {}}
            
            # Phân tích ảnh với YOLO
            results = self.yolo_model.analyze_image(image)
            
            # Đếm tất cả đối tượng
            count_result = self.yolo_model.count_objects(results)
            
            return count_result
            
        except Exception as e:
            logger.error(f"Lỗi khi đếm đối tượng: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'total': 0, 'details': {}}