package org.steveww.spark;

public class Location {
    private double latitude;
    private double longitude;

    public Location(double latitude, double longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public double getLatitude() {
        return this.latitude;
    }

    public double getLongitude() {
        return this.longitude;
    }

    /**
     * Calculate the distance in km between this location and the given coordinates
     **/
    public double getDistance(double targetLatitude, double targetLongitude) {
        double distance = 0.0;

        double diffLat = Math.pow(this.latitude - targetLatitude, 2);
        double diffLong = Math.pow(this.longitude - targetLongitude, 2);
        distance = Math.sqrt(diffLat + diffLong);
        // 1 degree == 1 nautical mile
        // 1 nautical mile == 1.852km
        distance = distance * 60.0 / 1.852;

        return Math.round(distance);
    }
}
