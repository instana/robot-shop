package com.instana.robotshop.shipping;

import java.util.List;

import org.springframework.data.repository.CrudRepository;

public interface CityRepository extends CrudRepository<City, Long> {
    List<City> findByCode(String code);

    City findById(long id);
}
