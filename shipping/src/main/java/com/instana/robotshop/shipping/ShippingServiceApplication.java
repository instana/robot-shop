package com.instana.robotshop.shipping;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

import com.instana.sdk.support.SpanSupport;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.handler.HandlerInterceptorAdapter;

import java.util.Random;

@SpringBootApplication
@EnableRetry
@EnableWebMvc
public class ShippingServiceApplication implements WebMvcConfigurer {

    private static final String[] DATA_CENTERS = {
            "asia-northeast2",
            "asia-south1",
            "europe-west3",
            "us-east1",
            "us-west1"
    };

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

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new InstanaDatacenterTagInterceptor());
    }

    private static class InstanaDatacenterTagInterceptor extends HandlerInterceptorAdapter {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

            SpanSupport.annotate("datacenter", DATA_CENTERS[new Random().nextInt(DATA_CENTERS.length)]);

            return super.preHandle(request, response, handler);
        }
    }
}
