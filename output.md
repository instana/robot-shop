On my Windows platform, using administratove cmd prompt.

1. WSL already installed, enabled VM platform 
```shell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

2. Upgraded existing Unbuntu WSL to 2
```shell
wsl --set-version Ubuntu 2
```

3. set WSL v2 default for good measure

```shell
wsl --set-default-version 2

```

4. Download and Install docker-desktop om windows per [instructions](https://docs.docker.com/desktop/windows/install/)


5. Enabled WSL Integration with Ubuntu

![alt text](Images/WSL.jpg "Enable WSL")

In my WSL Ubuntu environment (running in Windows)

5. From repo directory, set key and build images

```shell
export INSTANA_AGENT_KEY="<my key from instana)"

docker-compose build

```

6. Started application
```shell
docker-compose up

```

7. Accessed the store http://localhost:8080

![alt text](Images/home.jpg "The home page")
