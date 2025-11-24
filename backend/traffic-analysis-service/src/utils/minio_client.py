import logging
from minio import Minio
from minio.error import S3Error
from datetime import datetime
import io

logger = logging.getLogger(__name__)

class MinioClient:
    def __init__(self, endpoint, access_key, secret_key, bucket_name):
        """
        Khởi tạo MinIO client cho việc lưu ảnh đã phân tích
        """
        try:
            # Khởi tạo MinIO client
            self.client = Minio(
                endpoint,
                access_key=access_key,
                secret_key=secret_key,
                secure=False  # Sử dụng HTTP thay vì HTTPS
            )
            self.bucket_name = bucket_name
            
            logger.info(f"Đang kết nối đến MinIO tại {endpoint}")
            
            # Kiểm tra và tạo bucket nếu chưa tồn tại
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"✓ Đã tạo bucket mới: {bucket_name}")
            else:
                logger.info(f"✓ Bucket đã tồn tại: {bucket_name}")
                
            # Thiết lập policy công khai cho bucket
            self._set_public_policy()
            
        except S3Error as e:
            logger.error(f"✗ Lỗi khi khởi tạo MinIO client: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"✗ Lỗi không xác định khi kết nối MinIO: {str(e)}")
            raise
    
    def _set_public_policy(self):
        """Thiết lập policy công khai cho bucket"""
        try:
            policy = f'''{{
                "Version": "2012-10-17",
                "Statement": [
                    {{
                        "Effect": "Allow",
                        "Principal": {{"AWS": "*"}},
                        "Action": ["s3:GetObject"],
                        "Resource": ["arn:aws:s3:::{self.bucket_name}/*"]
                    }}
                ]
            }}'''
            
            self.client.set_bucket_policy(self.bucket_name, policy)
            logger.info(f"✓ Đã thiết lập policy công khai cho bucket {self.bucket_name}")
        except Exception as e:
            logger.warning(f"Không thể thiết lập policy công khai: {str(e)}")
    
    def upload_image(self, image_data, camera_id, timestamp):
        """
        Upload hình ảnh đã phân tích lên MinIO
        
        Args:
            image_data: bytes của hình ảnh
            camera_id: ID của camera
            timestamp: timestamp của ảnh (milliseconds hoặc seconds)
            
        Returns:
            URL của hình ảnh đã upload, hoặc None nếu thất bại
        """
        try:
            # Chuyển đổi timestamp thành datetime
            if timestamp and timestamp > 1000000000000:  # Nếu là milliseconds
                timestamp = timestamp / 1000
            
            if timestamp:
                dt = datetime.fromtimestamp(timestamp)
                timestamp_str = dt.strftime('%Y%m%d_%H%M%S')
            else:
                timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Tạo tên file theo cấu trúc: analyzed-images/{camera_id}/{date}/{timestamp}.jpg
            date_folder = datetime.fromtimestamp(timestamp if timestamp else datetime.now().timestamp()).strftime('%Y-%m-%d')
            filename = f"analyzed-images/{camera_id}/{date_folder}/{timestamp_str}.jpg"
            
            logger.info(f"Đang upload ảnh: {filename}")
            
            # Upload lên MinIO
            self.client.put_object(
                self.bucket_name,
                filename,
                io.BytesIO(image_data),
                len(image_data),
                content_type='image/jpeg'
            )
            encoded_filename = quote(filename, safe='/')
            # Tạo URL với localhost:9000
            url = f"http://localhost:9000/{self.bucket_name}/{encoded_filename}"
            
            logger.info(f"✓ Đã upload ảnh thành công!")
            logger.info(f"  - Kích thước: {len(image_data) / 1024:.2f} KB")
            logger.info(f"  - URL: {url}")
            
            return url
            
        except S3Error as e:
            logger.error(f"✗ Lỗi S3 khi upload hình ảnh: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"✗ Lỗi không xác định khi upload hình ảnh: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def delete_image(self, filename):
        """Xóa hình ảnh từ MinIO"""
        try:
            self.client.remove_object(self.bucket_name, filename)
            logger.info(f"✓ Đã xóa ảnh: {filename}")
            return True
        except S3Error as e:
            logger.error(f"✗ Lỗi khi xóa ảnh: {str(e)}")
            return False
    
    def list_images(self, camera_id=None, date=None):
        """Liệt kê các ảnh trong bucket"""
        try:
            prefix = "analyzed-images/"
            if camera_id:
                prefix += f"{camera_id}/"
                if date:
                    prefix += f"{date}/"
            
            objects = self.client.list_objects(self.bucket_name, prefix=prefix, recursive=True)
            return list(objects)
        except S3Error as e:
            logger.error(f"✗ Lỗi khi liệt kê ảnh: {str(e)}")
            return []