package com.instana.robotshop.shipping;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class BuildInfo {
    private static final String TAG_BRANCH = "branch";
    private static final String TAG_REVISION = "revision";
    private static final String TAG_VERSION = "version";
    private static final String GOOD_BUILD_REVISION = "a82866556862f6f33ab42e3fc0b4f6436675983b";
    private static final String GOOD_BUILD_VERSION = "1.0.3";
    private static final String BAD_BUILD_REVISION = "4950a0e6374aed95a1fc9913008f0679653abd16";
    private static final String BAD_BUILD_VERSION = "1.0.4";

    private final MeterRegistry meterRegistry;
    private Gauge buildInfoGauge;

    public BuildInfo(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Scheduled(fixedDelay = 10000)
    public void run() {
        LocalDateTime now = LocalDateTime.now();
        if (now.getHour() == 10 && now.getMinute() < 15) {
            if (buildInfoGauge != null && GOOD_BUILD_VERSION.equals(buildInfoGauge.getId().getTag(TAG_VERSION))) {
                meterRegistry.remove(buildInfoGauge);
            }
            buildInfoGauge = registerBadBuild();
        } else {
            if (buildInfoGauge != null && BAD_BUILD_VERSION.equals(buildInfoGauge.getId().getTag(TAG_VERSION))) {
                meterRegistry.remove(buildInfoGauge);
            }
            buildInfoGauge = registerGoodBuild();
        }
    }

    private Gauge registerGoodBuild() {
        return registerBuild(GOOD_BUILD_REVISION, GOOD_BUILD_VERSION);
    }

    private Gauge registerBadBuild() {
        return registerBuild(BAD_BUILD_REVISION, BAD_BUILD_VERSION);
    }

    private Gauge registerBuild(String revision, String version) {
        return Gauge.builder("shipping_build_info", () -> 1)
                .description("Shipping build info")
                .tag(TAG_BRANCH, "HEAD")
                .tag(TAG_REVISION, revision)
                .tag(TAG_VERSION, version)
                .register(meterRegistry);
    }
}
