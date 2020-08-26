package com.instana.robotshop.shipping;

import java.util.List;
import java.util.ArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class Controller {
    private static final Logger logger = LoggerFactory.getLogger(Controller.class);

    @GetMapping("/cities")
    public List<City> cities(@RequestParam(value = "code") String code) {
        logger.info("cities by code {}", code);

        return new <City>ArrayList();
    }
}
