package com.trafic_stream.ingestion_service.dto;

import java.util.List;

public class CameraRawDTO {
    private String _id;
    private String id;
    private String name;
    private Location loc;
    private Values values;
    private String dist;
    private boolean ptz;
    private int angle;
    private String liveviewUrl;
    private long timestamp;

    // inner classes
    public static class Location {
        private String type;
        private List<Double> coordinates;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public List<Double> getCoordinates() { return coordinates; }
        public void setCoordinates(List<Double> coordinates) { this.coordinates = coordinates; }
    }

    public static class Values {
        private String ip;

        public String getIp() { return ip; }
        public void setIp(String ip) { this.ip = ip; }
    }

    // getters & setters
    public String get_id() { return _id; }
    public void set_id(String _id) { this._id = _id; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Location getLoc() { return loc; }
    public void setLoc(Location loc) { this.loc = loc; }

    public Values getValues() { return values; }
    public void setValues(Values values) { this.values = values; }

    public String getDist() { return dist; }
    public void setDist(String dist) { this.dist = dist; }

    public boolean isPtz() { return ptz; }
    public void setPtz(boolean ptz) { this.ptz = ptz; }

    public int getAngle() { return angle; }
    public void setAngle(int angle) { this.angle = angle; }

    public String getLiveviewUrl() { return liveviewUrl; }
    public void setLiveviewUrl(String liveviewUrl) { this.liveviewUrl = liveviewUrl; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
