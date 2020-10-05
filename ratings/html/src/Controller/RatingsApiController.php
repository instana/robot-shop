<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Controller;

use Instana\RobotShop\Ratings\Service\CatalogueService;
use Instana\RobotShop\Ratings\Service\RatingsService;
use Psr\Log\LoggerAwareInterface;
use Psr\Log\LoggerAwareTrait;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/api")
 */
class RatingsApiController implements LoggerAwareInterface
{
    use LoggerAwareTrait;

    /**
     * @var RatingsService
     */
    private $ratingsService;

    /**
     * @var CatalogueService
     */
    private $catalogueService;

    public function __construct(CatalogueService $catalogueService, RatingsService $ratingsService)
    {
        $this->ratingsService = $ratingsService;
        $this->catalogueService = $catalogueService;
    }

    /**
     * @Route(path="/rate/{sku}/{score}", methods={"PUT"})
     */
    public function put(Request $request, string $sku, int $score): Response
    {
        $score = min(max(1, $score), 5);

        try {
            if (false === $this->catalogueService->checkSKU($sku)) {
                throw new NotFoundHttpException("$sku not found");
            }
        } catch (\Exception $e) {
            throw new HttpException(500, $e->getMessage(), $e);
        }

        try {
            $rating = $this->ratingsService->ratingBySku($sku);
            if (0 === $rating['avg_rating']) {
                // not rated yet
                $this->ratingsService->addRatingForSKU($sku, $score);
            } else {
                // iffy maths
                $newAvg = (($rating['avg_rating'] * $rating['rating_count']) + $score) / ($rating['rating_count'] + 1);
                $this->ratingsService->updateRatingForSKU($sku, $newAvg, $rating['rating_count'] + 1);
            }

            return new JsonResponse([
                'success' => true,
            ]);
        } catch (\Exception $e) {
            throw new HttpException(500, 'Unable to update rating', $e);
        }
    }

    /**
     * @Route("/fetch/{sku}", methods={"GET"})
     */
    public function get(Request $request, string $sku): Response
    {
        try {
            if (!$this->ratingsService->ratingBySku($sku)) {
                throw new NotFoundHttpException("$sku not found");
            }
        } catch (\Exception $e) {
            throw new HttpException(500, $e->getMessage(), $e);
        }

        return new JsonResponse($this->ratingsService->ratingBySku($sku));
    }
}
