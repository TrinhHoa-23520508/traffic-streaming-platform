import unittest
from src.processing.image_fetcher import ImageFetcher

class TestImageFetcher(unittest.TestCase):

    def setUp(self):
        self.image_fetcher = ImageFetcher()

    def test_construct_image_url(self):
        liveview_url = "example/liveview"
        expected_url = "https://api.notis.vn/v4/example/liveview"
        constructed_url = self.image_fetcher.construct_image_url(liveview_url)
        self.assertEqual(constructed_url, expected_url)

    def test_fetch_image_success(self):
        url = "https://api.notis.vn/v4/example/liveview"
        image = self.image_fetcher.fetch_image(url)
        self.assertIsNotNone(image)

    def test_fetch_image_failure(self):
        url = "https://api.notis.vn/v4/invalid_url"
        image = self.image_fetcher.fetch_image(url)
        self.assertIsNone(image)

if __name__ == '__main__':
    unittest.main()