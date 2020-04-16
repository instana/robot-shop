<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Service;

use PDO;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;

class HealthCheckService implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * @var PDO
     */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function checkConnectivity(): bool
    {
        return $this->pdo->prepare('SELECT 1 + 1 FROM DUAL;')->execute();
    }
}
