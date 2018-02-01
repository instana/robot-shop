package org.steveww.spark;

/**
 * Bean to hold shipping information
 **/
public class Ship {
    private long distance;
    private double cost;

    public Ship() {
        this.distance = 0;
        this.cost = 0.0;
    }

    public Ship(long distnace, double cost) {
        this.distance = distance;
        this.cost = cost;
    }

    public void setDistance(long distance) {
        this.distance = distance;
    }

    public void setCost(double cost) {
        this.cost = cost;
    }

    public long getDistance() {
        return this.distance;
    }

    public double getCost() {
        return this.cost;
    }
}

