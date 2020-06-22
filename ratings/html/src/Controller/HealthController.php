<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Controller;

use Instana\RobotShop\Ratings\Service\HealthCheckService;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/_health")
 */
class HealthController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * @var HealthCheckService
     */
    private $healthCheckService;

    public function __construct(HealthCheckService $healthCheckService)
    {
        $this->healthCheckService = $healthCheckService;
    }

    public function __invoke(Request $request)
    {
        $checks = [];
        try {
            $this->healthCheckService->checkConnectivity();
            $checks['pdo_connectivity'] = true;
        } catch (\PDOException $e) {
            $checks['pdo_connectivity'] = false;
        }

        $this->logger->info('Health-Check', $checks);

        return new JsonResponse($checks, $checks['pdo_connectivity'] ? Response::HTTP_OK : Response::HTTP_BAD_REQUEST);
    }
}
