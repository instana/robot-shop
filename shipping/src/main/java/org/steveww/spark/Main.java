package org.steveww.spark;

import spark.Spark;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Main {
    private static Logger logger = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) {
        Spark.port(8080);
        Spark.get("/hello", (req, res) -> "Hello World");
        Spark.awaitInitialization();
        logger.info("Ready");
    }
}
