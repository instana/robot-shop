<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Service;

use PDO;

class HealthCheckService
{
    /**
     * @var PDO
     */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function checkConnectivity()
    {
        return $this->pdo->prepare('SELECT 1 + 1 FROM DUAL;')->execute();
    }
}
