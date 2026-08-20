package com.instana.robotshop.shipping;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CityTest {

    @Test
    void settersPopulateCityFields() {
        City city = new City();

        city.setCode("US");
        city.setCity("Seattle");
        city.setName("Seattle, Washington");
        city.setRegion("WA");
        city.setLatitude(47.6062);
        city.setLongitude(-122.3321);

        assertEquals("US", city.getCode());
        assertEquals("Seattle", city.getCity());
        assertEquals("Seattle, Washington", city.getName());
        assertEquals("WA", city.getRegion());
        assertEquals(47.6062, city.getLatitude());
        assertEquals(-122.3321, city.getLongitude());
    }

    @Test
    void toStringIncludesLocationDetails() {
        City city = new City();
        city.setCode("US");
        city.setCity("Seattle");
        city.setRegion("WA");
        city.setLatitude(47.6062);
        city.setLongitude(-122.3321);

        assertEquals("Country: US City: Seattle Region: WA Coords: 47.606200 -122.332100", city.toString());
    }
}