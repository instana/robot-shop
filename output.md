## Steps to run the sample microservice application

- Forked the project https://github.com/instana/robot-shop in GitHub 
- Cloned the project to my local machine 
- Installed docker and changed directory to the one just created by the clone on the command line 
- Ran the command **docker-compose build** to build from source
- ERROR: In the mysql dockerfile line 12 needed a couple of changes, space between **/root/** and config.sh and for root access **echo** 
- Ran the command **docker-compose up -d** to bring up all the containers 
- **ERROR: /us/bin/env: ‘bash\r’: No such file or directory** - core.autocrlf was set to true in git. I changed it to false using **git config --global core.autocrlf false** and     cloned the repo again and rebuilt the containers and it worked 
- Accessed the application on http://localhost:8080/ 
-  ![image](https://user-images.githubusercontent.com/29515983/144965828-9f01851f-1e9c-41b9-82a8-4ddc4a327c49.png)

## Is there anything wrong with commiting directly to master branch?
When there are multiple developers in the picture its good practice to always have separate branches and only merge with master branch when you are ready to release changes or the bit you are adding/changing is finished and tested. You are also able to see what features are introduced in the software and can be easily rolled back.

## How would you prevent that?
- Repo settings > Branches > Branch Protection rule > Master selected:
- Require a pull request before merging
    - Require approvals before merging
- Required signed commits
- Include administrators


## Cool logo on the main page
- **web/static/index.html** > made changes to to the **img src**

## Signature AAR at the bottom left:
- Added **AAR** to the footer in **web/static/index.html**

![image](https://user-images.githubusercontent.com/29515983/145072600-58e4aa16-053f-4dbc-bd68-40dbfeec3423.png)

