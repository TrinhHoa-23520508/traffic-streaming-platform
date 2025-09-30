package com.trafic_stream.ingestion_service.dto;

public class CameraDTO {
    private String cameraId;
    private long timestamp;
    private String snapshotUrl;
    private int vehicleCount;

    public CameraDTO(String cameraId, long timestamp, String snapshotUrl, int vehicleCount) {
        this.cameraId = cameraId;
        this.timestamp = timestamp;
        this.snapshotUrl = snapshotUrl;
        this.vehicleCount = vehicleCount;
    }

    public String getCameraId() { return cameraId; }
    public void setCameraId(String cameraId) { this.cameraId = cameraId; }
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    public String getSnapshotUrl() { return snapshotUrl; }
    public void setSnapshotUrl(String snapshotUrl) { this.snapshotUrl = snapshotUrl; }
    public int getVehicleCount() { return vehicleCount; }
    public void setVehicleCount(int vehicleCount) { this.vehicleCount = vehicleCount; }
}
