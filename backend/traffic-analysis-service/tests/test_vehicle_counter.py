import unittest
from src.processing.vehicle_counter import VehicleCounter

class TestVehicleCounter(unittest.TestCase):

    def setUp(self):
        self.vehicle_counter = VehicleCounter()

    def test_count_vehicles(self):
        test_image_path = "path/to/test/image.jpg"  # Replace with a valid test image path
        count = self.vehicle_counter.count_vehicles(test_image_path)
        self.assertIsInstance(count, int)
        self.assertGreaterEqual(count, 0)

    def test_count_vehicles_no_vehicles(self):
        test_image_path = "path/to/test/image_no_vehicles.jpg"  # Replace with a valid test image path
        count = self.vehicle_counter.count_vehicles(test_image_path)
        self.assertEqual(count, 0)

if __name__ == '__main__':
    unittest.main()