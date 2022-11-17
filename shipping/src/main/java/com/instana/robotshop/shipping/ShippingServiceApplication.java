package com.instana.robotshop.shipping;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import javax.sql.DataSource;

@SpringBootApplication
@EnableRetry
@EnableWebMvc
@EnableScheduling
public class ShippingServiceApplication implements WebMvcConfigurer {

    public static void main(String[] args) {
        SpringApplication.run(ShippingServiceApplication.class, args);
    }

    @Bean
    public BeanPostProcessor dataSourceWrapper() {
        return new DataSourcePostProcessor();
    }

    @Order(Ordered.HIGHEST_PRECEDENCE)
    private static class DataSourcePostProcessor implements BeanPostProcessor {
        @Override
        public Object postProcessBeforeInitialization(Object bean, String name) throws BeansException {
            if (bean instanceof DataSource) {
                bean = new RetryableDataSource((DataSource)bean);
            }
            return bean;
        }

        @Override
        public Object postProcessAfterInitialization(Object bean, String name) throws BeansException {
            return bean;
        }
    }
}
