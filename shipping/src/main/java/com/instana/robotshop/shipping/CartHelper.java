package com.instana.robotshop.shipping;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.params.BasicHttpParams;
import org.apache.http.params.HttpConnectionParams;
import org.apache.http.params.HttpParams;

public class CartHelper {
    private static final Logger logger = LoggerFactory.getLogger(CartHelper.class);
    
    private String baseUrl;

    public CartHelper(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    // TODO - Remove deprecated calls
    public String addToCart(String id, String data) {
        logger.info("add shipping to cart {}", id);
        StringBuilder buffer = new StringBuilder();

        CloseableHttpClient httpClient = null;
        try {
            // set timeout to 5 secs
            HttpParams httpParams = new BasicHttpParams();
            HttpConnectionParams.setConnectionTimeout(httpParams, 5000);

            httpClient = HttpClients.createDefault();
            HttpPost postRequest = new HttpPost(baseUrl + id);
            StringEntity payload = new StringEntity(data);
            payload.setContentType("application/json");
            postRequest.setEntity(payload);
            CloseableHttpResponse res = httpClient.execute(postRequest);

            if (res.getStatusLine().getStatusCode() == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(res.getEntity().getContent()));
                String line;
                while ((line = in.readLine()) != null) {
                    buffer.append(line);
                }
            } else {
                logger.warn("Failed with code {}", res.getStatusLine().getStatusCode());
            }
            try {
                res.close();
            } catch(IOException e) {
                logger.warn("httpresponse", e);
            }
        } catch(Exception e) {
            logger.warn("http client exception", e);
        } finally {
            if (httpClient != null) {
                try {
                    httpClient.close();
                } catch(IOException e) {
                    logger.warn("httpclient", e);
                }
            }
        }

        // this will be empty on error
        return buffer.toString();
    }
}
