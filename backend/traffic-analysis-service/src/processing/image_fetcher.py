import requests
import logging
from config import IMAGE_FETCH_TIMEOUT

logger = logging.getLogger(__name__)

class ImageFetcher:
    def __init__(self, base_url):
        self.base_url = base_url
        logger.info(f"Đã khởi tạo ImageFetcher với base URL: {base_url}")

    def fetch_image(self, liveview_url):
        try:
            full_url = self.construct_full_url(liveview_url)
            logger.info(f"Đang tải ảnh từ: {full_url}")
            image = self.download_image(full_url)
            return image
        except Exception as e:
            logger.error(f"Lỗi khi tải ảnh: {str(e)}")
            return None

    def construct_full_url(self, liveview_url):
        return f"{self.base_url}{liveview_url}"

    def download_image(self, url):
        response = requests.get(url, timeout=IMAGE_FETCH_TIMEOUT)
        if response.status_code == 200:
            logger.debug(f"Đã tải ảnh thành công từ {url}")
            return response.content
        else:
            raise Exception(f"Không thể tải ảnh từ {url}, mã trạng thái: {response.status_code}")