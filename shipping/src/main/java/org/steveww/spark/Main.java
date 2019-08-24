package org.steveww.spark;

import com.google.gson.*;
import com.mchange.v2.c3p0.ComboPooledDataSource;
import spark.Spark;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.DefaultHttpClient;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.HttpConnectionParams;
import org.apache.http.params.HttpParams;
import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.handlers.MapListHandler;
import org.apache.commons.dbutils.DbUtils;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

public class Main {
    private static final Logger LOGGER = LoggerFactory.getLogger(Main.class);
    private static final ComboPooledDataSource CPDS = new ComboPooledDataSource();

    public static void main(String[] args) {
        // Get ENV configuration values
        final String cartUrl;
        final String jdbcUrl;

        final boolean isCloudFoundry = System.getenv("VCAP_APPLICATION") != null;

        if (isCloudFoundry) {
            // Cloud Foundry
            final JsonParser jsonParser = new JsonParser();

            jdbcUrl = getJdbcURLFromVCAPServices(jsonParser);

            if (System.getenv("CART_ENDPOINT") != null) {
                cartUrl = System.getenv("CART_ENDPOINT");
            } else {
                final JsonObject vcapApplication = jsonParser.parse(System.getenv("VCAP_APPLICATION")).getAsJsonObject();

                final JsonArray appUris = vcapApplication.get("application_uris").getAsJsonArray();
                if (appUris == null || appUris.size() == 0) {
                    throw new IllegalStateException("Cannot retrieve application URIs from 'VCAP_APPLICATION'");
                }

                final String applicationName = vcapApplication.get("application_name").getAsString();
                final String applicationURI = appUris.get(0).getAsString();

                cartUrl = "https://" + applicationURI.replace(applicationName, "cart") + "/shipping/";
            }
        } else {
            cartUrl = String.format("http://%s/shipping/", System.getenv("CART_ENDPOINT") != null ? System.getenv("CART_ENDPOINT") : "cart");
            jdbcUrl = String.format("jdbc:mysql://%s/cities?useSSL=false&autoReconnect=true", System.getenv("DB_HOST") != null ? System.getenv("DB_HOST") : "mysql");
        }


        //
        // Create database connector
        // TODO - might need a retry loop here
        //
        try {
            CPDS.setDriverClass( "com.mysql.jdbc.Driver" ); //loads the jdbc driver            
            CPDS.setJdbcUrl( jdbcUrl );

            if (!isCloudFoundry) {
                CPDS.setUser("shipping");
                CPDS.setPassword("secret");
            }

            // some config
            CPDS.setMinPoolSize(5);
            CPDS.setAcquireIncrement(5);
            CPDS.setMaxPoolSize(20);
            CPDS.setMaxStatements(180);
        }
        catch(Exception e) {
            LOGGER.error("Database Exception", e);
        }

        // Spark
        Spark.port(8080);

        Spark.get("/health", (req, res) -> "OK");

        Spark.get("/count", (req, res) -> {
            String data;
            try {
                data = queryToJson("select count(*) as count from cities");
                res.header("Content-Type", "application/json");
            } catch(Exception e) {
                LOGGER.error("count", e);
                res.status(500);
                data = "ERROR";
            }

            return data;
        });

        Spark.get("/codes", (req, res) -> {
            String data;
            try {
                String query = "select code, name from codes order by name asc";
                data = queryToJson(query);
                res.header("Content-Type", "application/json");
            } catch(Exception e) {
                LOGGER.error("codes", e);
                res.status(500);
                data = "ERROR";
            }

            return data;
        });

        // needed for load gen script
        Spark.get("/cities/:code", (req, res) -> {
            String data;
            try {
                String query = "select uuid, name from cities where country_code = ?";
                LOGGER.info("Query " + query);
                data = queryToJson(query, req.params(":code"));
                res.header("Content-Type", "application/json");
            } catch(Exception e) {
                LOGGER.error("cities", e);
                res.status(500);
                data = "ERROR";
            }

            return data;
        });

        Spark.get("/match/:code/:text", (req, res) -> {
            String data;
            try {
                String query = "select uuid, name from cities where country_code = ? and city like ? order by name asc limit 10";
                LOGGER.info("Query " + query);
                data = queryToJson(query, req.params(":code"), req.params(":text") + "%");
                res.header("Content-Type", "application/json");
            } catch(Exception e) {
                LOGGER.error("match", e);
                res.status(500);
                data = "ERROR";
            }

            return data;
        });

        Spark.get("/calc/:uuid", (req, res) -> {
            double homeLat = 51.164896;
            double homeLong = 7.068792;
            String data;

            Location location = getLocation(req.params(":uuid"));
            Ship ship = new Ship();
            if(location != null) {
                long distance = location.getDistance(homeLat, homeLong);
                // charge 0.05 Euro per km
                // try to avoid rounding errors
                double cost = Math.rint(distance * 5) / 100.0;
                ship.setDistance(distance);
                ship.setCost(cost);
                res.header("Content-Type", "application/json");
                data = new Gson().toJson(ship);
            } else {
                data = "no location";
                LOGGER.warn(data);
                res.status(400);
            }

            return data;
        });

        Spark.post("/confirm/:id", (req, res) -> {
            LOGGER.info("confirm " + req.params(":id") + " - " + req.body());
            String cart = addToCart(cartUrl, req.params(":id"), req.body());
            LOGGER.info("new cart " + cart);

            if(cart.equals("")) {
                res.status(404);
            } else {
                res.header("Content-Type", "application/json");
            }

            return cart;
        });

        LOGGER.info("Ready");
    }

    private static String getJdbcURLFromVCAPServices(final JsonParser jsonParser) {
        final JsonObject vcapServices = jsonParser.parse(System.getenv("VCAP_SERVICES")).getAsJsonObject();

        for (Map.Entry<String, JsonElement> boundServices : vcapServices.entrySet()) {
            final JsonArray bindings = boundServices.getValue().getAsJsonArray();

            for (JsonElement boundService : bindings) {
                final JsonObject bindingDetails = boundService.getAsJsonObject();
                if (bindingDetails.has("binding_name") && "shipping_database".equals(bindingDetails.get("binding_name").getAsString())) {
                    final JsonObject credentials = bindingDetails.get("credentials").getAsJsonObject();
                    return credentials.get("jdbcUrl").getAsString();
                }
            }
        }

        throw new IllegalStateException("Cannot retrieve the 'shipping_database' service binding.");
    }


    /**
     * Query to Json - QED
     **/
    private static String queryToJson(String query, Object ... args) {
        List<Map<String, Object>> listOfMaps;
        try {
            QueryRunner queryRunner = new QueryRunner(CPDS);
            listOfMaps = queryRunner.query(query, new MapListHandler(), args);
        } catch (SQLException se) {
            throw new RuntimeException("Couldn't query the database.", se);
        }

        return new Gson().toJson(listOfMaps);
    }

    /**
     * Special case for location, dont want Json
     **/
    private static Location getLocation(String uuid) {
        Location location = null;
        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;
        String query = "select latitude, longitude from cities where uuid = ?";

        try {
            conn = CPDS.getConnection();
            stmt = conn.prepareStatement(query);
            stmt.setInt(1, Integer.parseInt(uuid));
            rs = stmt.executeQuery();
            while(rs.next()) {
                location = new Location(rs.getDouble(1), rs.getDouble(2));
                break;
            }
        } catch(Exception e) {
            LOGGER.error("Location exception", e);
        } finally {
            DbUtils.closeQuietly(conn, stmt, rs);
        }

        return location;
    }

    private static String addToCart(String cartUrl, String id, String data) {
        StringBuilder buffer = new StringBuilder();

        DefaultHttpClient httpClient = null;
        try {
            // set timeout to 5 secs
            HttpParams httpParams = new BasicHttpParams();
            HttpConnectionParams.setConnectionTimeout(httpParams, 5000);

            httpClient = new DefaultHttpClient(httpParams);
            HttpPost postRequest = new HttpPost(cartUrl + id);
            StringEntity payload = new StringEntity(data);
            payload.setContentType("application/json");
            postRequest.setEntity(payload);
            HttpResponse res = httpClient.execute(postRequest);

            if(res.getStatusLine().getStatusCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(res.getEntity().getContent()));
                String line;
                while((line = in.readLine()) != null) {
                    buffer.append(line);
                }
            } else {
                LOGGER.warn("Failed with code: " + res.getStatusLine().getStatusCode());
            }
        } catch(Exception e) {
            LOGGER.error("http client exception", e);
        } finally {
            if(httpClient != null) {
                httpClient.getConnectionManager().shutdown();
            }
        }

        return buffer.toString();
    }
}
