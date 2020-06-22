<?php

declare(strict_types=1);

require __DIR__.'/vendor/autoload.php';

use Instana\RobotShop\Ratings\Kernel;
use Symfony\Component\HttpFoundation\Request;

$env = getenv('APP_ENV') ?: 'dev';
$kernel = new Kernel($env, true);
$request = Request::createFromGlobals();
$response = $kernel->handle($request);
$response->send();
$kernel->terminate($request, $response);
