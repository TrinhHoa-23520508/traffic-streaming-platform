from datetime import datetime, timezone, timedelta

def timestamp_to_vietnam_time(timestamp):
    """
    Chuyển đổi timestamp thành giờ Việt Nam (UTC+7)
    
    Args:
        timestamp: Unix timestamp (có thể là giây hoặc mili giây)
        
    Returns:
        Chuỗi thời gian định dạng 'YYYY-MM-DD HH:MM:SS'
    """
    if not timestamp:
        return None
        
    # Kiểm tra nếu timestamp là mili giây
    if timestamp > 1000000000000:
        timestamp = timestamp / 1000
        
    # Chuyển timestamp thành datetime (UTC)
    dt_utc = datetime.fromtimestamp(timestamp, timezone.utc)
    
    # Chuyển sang múi giờ Việt Nam (UTC+7)
    vietnam_tz = timezone(timedelta(hours=7))
    vietnam_time = dt_utc.astimezone(vietnam_tz)
    
    # Trả về chuỗi thời gian định dạng
    return vietnam_time.strftime('%Y-%m-%d %H:%M:%S')