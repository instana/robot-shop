<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings;

use Instana\RobotShop\Ratings\Controller\HealthController;
use Instana\RobotShop\Ratings\Controller\RatingsApiController;
use Instana\RobotShop\Ratings\EventListener\InstanaDataCenterListener;
use Instana\RobotShop\Ratings\Integration\InstanaHeadersLoggingProcessor;
use Instana\RobotShop\Ratings\Service\CatalogueService;
use Instana\RobotShop\Ratings\Service\HealthCheckService;
use Instana\RobotShop\Ratings\Service\RatingsService;
use Monolog\Formatter\LineFormatter;
use Symfony\Bundle\FrameworkBundle\FrameworkBundle;
use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Bundle\MonologBundle\MonologBundle;
use Symfony\Component\Config\Loader\LoaderInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Routing\RouteCollectionBuilder;

class Kernel extends BaseKernel implements EventSubscriberInterface
{
    use MicroKernelTrait;

    public function registerBundles()
    {
        return [
            new FrameworkBundle(),
            new MonologBundle(),
        ];
    }

    /**
     * {@inheritdoc}
     */
    public static function getSubscribedEvents()
    {
        return [
            KernelEvents::RESPONSE => 'corsResponseFilter',
        ];
    }

    public function corsResponseFilter(ResponseEvent $event)
    {
        $response = $event->getResponse();

        $response->headers->add([
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => '*',
        ]);
    }

    protected function configureContainer(ContainerBuilder $c, LoaderInterface $loader): void
    {
        $c->loadFromExtension('framework', [
            'secret' => 'S0ME_SECRET',
        ]);

        $c->loadFromExtension('monolog', [
            'handlers' => [
                'stdout' => [
                    'type' => 'stream',
                    'level' => 'info',
                    'path' => 'php://stdout',
                    'channels' => ['!request'],
                ],
            ],
        ]);

        $c->setParameter('catalogueUrl', getenv('CATALOGUE_URL') ?: 'http://catalogue:8080');
        $c->setParameter('pdo_dsn', getenv('PDO_URL') ?: 'mysql:host=mysql;dbname=ratings;charset=utf8mb4');
        $c->setParameter('pdo_user', 'ratings');
        $c->setParameter('pdo_password', 'iloveit');
        $c->setParameter('logger.name', 'RatingsAPI');

        $c->register(InstanaHeadersLoggingProcessor::class)
            ->addTag('kernel.event_subscriber')
            ->addTag('monolog.processor');

        $c->register('monolog.formatter.instana_headers', LineFormatter::class)
            ->addArgument('[%%datetime%%] [%%extra.token%%] %%channel%%.%%level_name%%: %%message%% %%context%% %%extra%%\n');

        $c->register(Database::class)
            ->addArgument($c->getParameter('pdo_dsn'))
            ->addArgument($c->getParameter('pdo_user'))
            ->addArgument($c->getParameter('pdo_password'))
            ->addMethodCall('setLogger', [new Reference('logger')])
            ->setAutowired(true);

        $c->register(CatalogueService::class)
            ->addArgument($c->getParameter('catalogueUrl'))
            ->addMethodCall('setLogger', [new Reference('logger')])
            ->setAutowired(true);

        $c->register(HealthCheckService::class)
            ->addArgument(new Reference('database.connection'))
            ->addMethodCall('setLogger', [new Reference('logger')])
            ->setAutowired(true);

        $c->register('database.connection', \PDO::class)
            ->setFactory([new Reference(Database::class), 'getConnection']);

        $c->setAlias(\PDO::class, 'database.connection');

        $c->register(RatingsService::class)
            ->addMethodCall('setLogger', [new Reference('logger')])
            ->setAutowired(true);

        $c->register(HealthController::class)
            ->addMethodCall('setLogger', [new Reference('logger')])
            ->addTag('controller.service_arguments')
            ->setAutowired(true);

        $c->register(RatingsApiController::class)
            ->addMethodCall('setLogger', [new Reference('logger')])
            ->addTag('controller.service_arguments')
            ->setAutowired(true);

        $c->register(InstanaDataCenterListener::class)
            ->addTag('kernel.event_listener', [
                'event' => 'kernel.request'
            ])
            ->setAutowired(true);
    }

    protected function configureRoutes(RouteCollectionBuilder $routes)
    {
        $routes->import(__DIR__.'/Controller/', '/', 'annotation');
    }
}
