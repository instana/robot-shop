# Use composer to install dependencies
FROM composer AS build

COPY composer.json /app/

RUN composer install

#
# Build the app
#
FROM php:7.3-apache

RUN docker-php-ext-install pdo_mysql

# relax permissions on status
COPY status.conf /etc/apache2/mods-available/status.conf
# Enable Apache mod_rewrite and status
RUN a2enmod rewrite && a2enmod status

WORKDIR /var/www/html

# copy dependencies from previous step
COPY --from=build /app/vendor/ /var/www/html/vendor/

COPY html/ /var/www/html

