package com.instana.robotshop.shipping;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import javax.sql.DataSource;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class JpaConfig {
    private static final Logger logger = LoggerFactory.getLogger(JpaConfig.class);

    @Bean
    public DataSource getDataSource() {
        String JDBC_URL = String.format("jdbc:mysql://%s/cities?useSSL=false&autoReconnect=true", System.getenv("DB_HOST") == null ? "mysql" : System.getenv("DB_HOST"));

        logger.info("jdbc url {}", JDBC_URL);

        DataSourceBuilder bob = DataSourceBuilder.create();

        bob.driverClassName("com.mysql.jdbc.Driver");
        bob.url(JDBC_URL);
        bob.username("shipping");
        bob.password("secret");

        return bob.build();
    }
}
