CREATE TABLE cities (
    uuid int auto_increment primary key,
    country_code      varchar(2),
    city             varchar(100),
    name             varchar(100),
    region           varchar(100),
    latitude         decimal(10, 7),
    longitude        decimal(10, 7)
) ENGINE=InnoDB;

CREATE FULLTEXT INDEX city_idx ON cities(city);

CREATE INDEX region_idx ON cities(region);

CREATE INDEX c_code_idx ON cities(country_code);

