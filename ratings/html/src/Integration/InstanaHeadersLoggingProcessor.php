<?php

declare(strict_types=1);

namespace Instana\RobotShop\Ratings\Integration;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\FinishRequestEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Contracts\Service\ResetInterface;

class InstanaHeadersLoggingProcessor implements EventSubscriberInterface, ResetInterface
{
    private $routeData;

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['addHeaderData', 1],
            KernelEvents::FINISH_REQUEST => ['removeHeaderData', 1],
        ];
    }

    public function __invoke(array $records): array
    {
        if ($this->routeData && !isset($records['extra']['requests'])) {
            $records['extra']['instana'] = array_values($this->routeData);
        }

        return $records;
    }

    public function addHeaderData(RequestEvent $event): void
    {
        if ($event->isMasterRequest()) {
            $this->reset();
        }

        $request = $event->getRequest();
        if (null === $request->headers->get('X-INSTANA-L')) {
            return;
        }

        $currentTraceHeaders = [
            'l' => $request->headers->get('X-INSTANA-L', 'n/a'),
            's' => $request->headers->get('X-INSTANA-S', 'n/a'),
            't' => $request->headers->get('X-INSTANA-T', 'n/a'),
        ];

        if (null !== $request->headers->get('X-INSTANA-SYNTHETIC')) {
            $currentTraceHeaders['sy'] = $request->headers->get('X-INSTANA-SYNTHETIC');
        }

        $this->routeData[spl_object_id($request)] = $currentTraceHeaders;
    }

    public function reset(): void
    {
        $this->routeData = [];
    }

    public function removeHeaderData(FinishRequestEvent $event): void
    {
        $requestId = spl_object_id($event->getRequest());
        unset($this->routeData[$requestId]);
    }
}
