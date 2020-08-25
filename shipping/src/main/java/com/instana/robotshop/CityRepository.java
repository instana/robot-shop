package com.instana.robotshop;

import java.util.List;

import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;

@RepositoryRestResource(collectionResourceRel = "cities", path = "city")
public interface CityRepository extends PagingAndSortingRepository<City, Long> {
    List<City> findByCode(@Param("code") String code);
}
