FROM php:7.2-apache

RUN docker-php-ext-install pdo_mysql

# relax permissions on status
COPY status.conf /etc/apache2/mods-available/status.conf
# Enable Apache mod_rewrite and status
RUN a2enmod rewrite && a2enmod status


WORKDIR /var/www/html

COPY html/ /var/www/html

