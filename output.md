Forked the project https://github.com/instana/robot-shop in GitHub
Cloned the project to my local machine.
Installed docker and changed directory to the one just created by the clone on the command line.
Ran command ‘docker-compose build’ to build from source.
ERROR: In the mysql dockerfile line 12 needed a couple of changes, space between /root/ and config.sh and for root access ‘echo’. 
docker-compose up -d to bring up all the containers
ERROR: /us/bin/env: ‘bash\r’: No such file or directory - core.autocrlf was set to true in git. I changed it to false using git config --global core.autocrlf false and cloned the repo again and rebuilt the containers and it worked.
Accessed the application on http://localhost:8080/
Screenshot link: ![image](https://user-images.githubusercontent.com/29515983/144965828-9f01851f-1e9c-41b9-82a8-4ddc4a327c49.png)
