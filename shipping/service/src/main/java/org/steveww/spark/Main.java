package org.steveww.spark;

import com.mchange.v2.c3p0.ComboPooledDataSource;
import spark.Spark;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.Statement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;

public class Main {
    private static Logger logger = LoggerFactory.getLogger(Main.class);
    private static ComboPooledDataSource cpds = null;

    public static void main(String[] args) {
        //
        // Create database connector
        // TODO - might need a retry loop here
        //
        try {
            cpds = new ComboPooledDataSource();
            cpds.setDriverClass( "com.mysql.jdbc.Driver" ); //loads the jdbc driver            
            cpds.setJdbcUrl( "jdbc:mysql://mysql/cities?useSSL=false&autoReconnect=true" );
            cpds.setUser("shipping");                                  
            cpds.setPassword("secret");
            // some config
            cpds.setMinPoolSize(5);
            cpds.setAcquireIncrement(5);
            cpds.setMaxPoolSize(20);
            cpds.setMaxStatements(180);
        }
        catch(Exception e) {
            logger.error("Database Exception", e);
        }

        // Spark
        Spark.port(8080);

        Spark.get("/health", (req, res) -> "OK");

        Spark.get("/count", (req, res) -> {
            String data = query("select count(*) as count from cities");
            res.header("Content-Type", "application/json");

            return data;
        });

        Spark.get("/codes", (req, res) -> {
            String data = query("select code, name from codes order by name asc");
            res.header("Content-Type", "application/json");

            return data;
        });

        Spark.get("/match/:code/:text", (req, res) -> {
            String query = "select name from cities where country_code ='" + req.params(":code") + "' and city like '" + req.params(":text") + "%' order by name asc limit 10";
            logger.info("Query " + query);
            String data = query(query);
            res.header("Content-Type", "application/json");

            return data;
        });

        logger.info("Ready");
    }


    private static String query(String query) {
        StringBuilder buffer = new StringBuilder();
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = cpds.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(query);
            ResultSetMetaData metadata = rs.getMetaData();
            int colCount = metadata.getColumnCount();
            buffer.append('[');
            while(rs.next()) {
                // result set to JSON
                buffer.append('{');
                for(int idx = 1; idx <= colCount; idx++) {
                    String name = metadata.getColumnLabel(idx);
                    switch(metadata.getColumnType(idx)) {
                        case Types.INTEGER:
                            int i = rs.getInt(idx);
                            buffer.append(write(name, rs.getInt(idx)));
                            break;
                        case Types.BIGINT:
                            buffer.append(write(name, rs.getLong(idx)));
                            break;
                        case Types.DECIMAL:
                        case Types.NUMERIC:
                            buffer.append(write(name, rs.getBigDecimal(idx)));
                            break;
                        case Types.FLOAT:
                        case Types.REAL:
                        case Types.DOUBLE:
                            buffer.append(write(name, rs.getDouble(idx)));
                            break;
                        case Types.NVARCHAR:
                        case Types.VARCHAR:
                        case Types.LONGNVARCHAR:
                        case Types.LONGVARCHAR:
                            buffer.append(write(name, '"' + rs.getString(idx) + '"'));
                            break;
                        case Types.TINYINT:
                        case Types.SMALLINT:
                            buffer.append(write(name, rs.getShort(idx)));
                            break;
                        default:
                            logger.info("Unknown type " + metadata.getColumnType(idx));
                    }
                    if(idx != colCount) {
                        buffer.append(',');
                    }
                }
                buffer.append("}, ");
            }
            // trim off trailing ,
            int idx = buffer.lastIndexOf(",");
            if(idx != -1) {
                buffer.setCharAt(idx, ' ');
            }
            buffer.append(']');
        }
        catch(Exception e) {
            logger.error("Query Exception", e);
        }
        finally {
            if(rs != null) {
                try {
                    rs.close();
                } catch(Exception e) {
                    logger.error("Close Exception", e);
                }
            }
            if(stmt != null) {
                try {
                    stmt.close();
                } catch(Exception e) {
                    logger.error("Close Exception", e);
                }
            }
            if(conn != null) {
                try {
                    conn.close();
                } catch(Exception e) {
                    logger.error("Close Exception", e);
                }
            }
        }

        return buffer.toString();
    }


    private static String write(String key, Object val) {
        StringBuilder buffer = new StringBuilder();

        buffer.append('"').append(key).append('"').append(": ").append(val);

        return buffer.toString();
    }
}
