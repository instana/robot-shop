> **Fork notes** — This is a fork of [instana/robot-shop](https://github.com/instana/robot-shop),
> used as a hands-on lab for AKS, Helm and GitOps. Changes from upstream are documented below.

## Fix: portable StorageClass in the Redis chart

### Symptom
On AKS, `redis-0` never started:

    Warning  FailedScheduling  default-scheduler
      0/2 nodes are available: pod has unbound immediate PersistentVolumeClaims.
    Normal   NotTriggerScaleUp cluster-autoscaler
      pod didn't trigger scale-up: 1 max node group size reached

The autoscaler message points at node capacity — which is misleading.

### Diagnosis
`kubectl describe pvc data-redis-0 -n robot-shop` gave the real cause:

    Warning  ProvisioningFailed  persistentvolume-controller
      storageclass.storage.k8s.io "standard" not found

The chart hardcoded `storageClassName: standard` — a GKE/minikube name.
AKS ships `default`, `managed-csi`, `azurefile-csi` and others, but no `standard`.
No number of nodes could fix an unbound volume.

### Fix
`storageClassName` is now templated and **omitted entirely when empty**, so the
cluster's own default StorageClass applies. Portable across AKS, EKS, GKE and kind.

Three states matter in Kubernetes:

| Value | Behaviour |
|---|---|
| key omitted | cluster default StorageClass is used |
| `"managed-csi"` | that specific class; fails if it doesn't exist |
| `""` (empty string) | dynamic provisioning **disabled** — waits for a manual PV |

### Verify without a cluster

    helm template . | grep -A9 volumeClaimTemplates                          # no storageClassName
    helm template . --set redis.storageClassName=managed-csi | grep -A9 ...  # explicit class
    helm template . --set openshift=true | grep -A9 ...                      # no volumeMode

### Note
`volumeClaimTemplates` is immutable — changing it requires deleting and
recreating the StatefulSet and its PVC.