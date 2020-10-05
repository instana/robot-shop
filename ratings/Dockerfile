# Use composer to install dependencies
FROM composer AS build

COPY composer.json /app/

RUN composer install

#
# Build the app
#
FROM php:7.4-apache

RUN docker-php-ext-install pdo_mysql

# Enable AutoProfile for PHP which is currently opt-in beta
RUN echo "instana.enable_auto_profile=1" > "/usr/local/etc/php/conf.d/zzz-instana-extras.ini"

# relax permissions on status
COPY status.conf /etc/apache2/mods-available/status.conf
# Enable Apache mod_rewrite and status
RUN a2enmod rewrite && a2enmod status

WORKDIR /var/www/html

# copy dependencies from previous step
COPY --from=build /app/vendor/ /var/www/html/vendor/

COPY html/ /var/www/html

# This is important. Symfony needs write permissions and we
# dont know the context in which the container will run, i.e.
# which user will be forced from the outside so better play
# safe for this simple demo.
RUN rm -Rf /var/www/var/*
RUN chown -R www-data /var/www
RUN chmod -R 777 /var/www

