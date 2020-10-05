package com.instana.robotshop.shipping;

import java.util.List;

import org.springframework.data.repository.PagingAndSortingRepository;

public interface CodeRepository extends PagingAndSortingRepository<Code, Long> {

    Iterable<Code> findAll();

    Code findById(long id);
}
