# Instana Agent Installation

See the official [documentation](https://docs.instana.io/quick_start/agent_setup/container/openshift/) for how to install the Instana agent on an OpenShift environment.

# Robot Shop Deployment

Have a look at the contents of the *setup.sh* and *deploy,sh* scripts, you may want to tweak some settings to suit your environment.

Run the *setup.sh* script first, you will need the passwords for the developer and system:admin users.

Once the set up is completed, run the *deploy.sh* script. This script imports the application images from Docker Hub into OpenShift, then it creates applications from those images.

When the deployment has completed, to make Stan's Robot Shop accessible the web service needs to be updated.

```bash
oc edit svc web
```

Change *type* to **NodePort** when running on Minishift or **LoadBalancer** for regular OpenShift.

