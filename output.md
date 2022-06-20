hesonics@worker01:~$ git clone https://github.com/IdoG999/robot-shop.git
thesonics@worker01:~/robot-shop$ git branch -c Ido123
hesonics@worker01:~/robot-shop$ git push -u origin Ido123
Username for 'https://github.com': IdoG999
Password for 'https://IdoG999@github.com': 
Enumerating objects: 11, done.
Counting objects: 100% (11/11), done.
Delta compression using up to 8 threads
Compressing objects: 100% (8/8), done.
Writing objects: 100% (10/10), 1.89 KiB | 967.00 KiB/s, done.
Total 10 (delta 2), reused 0 (delta 0)
remote: Resolving deltas: 100% (2/2), completed with 1 local object.
remote: 
remote: Create a pull request for 'Ido123' on GitHub by visiting:
remote:      https://github.com/IdoG999/robot-shop/pull/new/Ido123
remote: 
To https://github.com/IdoG999/robot-shop.git
 * [new branch]      Ido123 -> Ido123
Branch 'Ido123' set up to track remote branch 'Ido123' from 'origin'.
thesonics@worker01:~/robot-shop$ git checkout Ido123
Switched to branch 'Ido123'
Your branch is up to date with 'origin/master'.
thesonics@worker01:~/robot-shop$ touch 3.key
thesonics@worker01:~/robot-shop$ echo "ls -lR | grep "^d" | wc -l"  > 3.key
thesonics@worker01:~/robot-shop$ touch 4.key
thesonics@worker01:~/robot-shop$ echo "find -type f | wc -l" > 4.key
thesonics@worker01:~/robot-shop$ git status
thesonics@worker01:~/robot-shop$ git add .
thesonics@worker01:~/robot-shop$ git config -l | grep gpg
thesonics@worker01:~/robot-shop$ git config --global --unset commit.gpgsign
thesonics@worker01:~/robot-shop$ git add .
thesonics@worker01:~/robot-shop$ git commit -m "adding they keys files"
[Ido123 6028181] adding they keys files
 2 files changed, 2 insertions(+)
 create mode 100644 3.key
 create mode 100644 4.key
thesonics@worker01:~/robot-shop$ git status
thesonics@worker01:~/robot-shop$ git checkout master
thesonics@worker01:~/robot-shop$ git pull
remote: Enumerating objects: 15, done.
remote: Counting objects: 100% (15/15), done.
remote: Compressing objects: 100% (15/15), done.
remote: Total 15 (delta 6), reused 0 (delta 0), pack-reused 0
Unpacking objects: 100% (15/15), 5.37 KiB | 229.00 KiB/s, done.
From https://github.com/IdoG999/robot-shop
   2e60111..dd14400  master     -> origin/master
   2e60111..43f03e6  Ido123     -> origin/Ido123
Updating e2cfded..dd14400
Fast-forward
 3.key | 1 +
 4.key | 1 +
 a.txt | 0
 3 files changed, 2 insertions(+)
 create mode 100644 3.key
 create mode 100644 4.key
 create mode 100644 a.txt
thesonics@worker01:~/robot-shop$ git checkout Ido123
Switched to branch 'Ido123'
Your branch is behind 'origin/Ido123' by 4 commits, and can be fast-forwarded.
  (use "git pull" to update your local branch)
thesonics@worker01:~/robot-shop$ git pull
Updating 2e60111..43f03e6
Fast-forward
 3.key.gpg  | Bin 364 -> 0 bytes
 4.key.gpg  | Bin 364 -> 0 bytes
 ido123     |   8 --------
 ido123.pub |   1 -
 4 files changed, 9 deletions(-)
 delete mode 100644 3.key.gpg
 delete mode 100644 4.key.gpg
 delete mode 100644 ido123
 delete mode 100644 ido123.pub
thesonics@worker01:~/robot-shop$ git merge master
Merge made by the 'recursive' strategy.
thesonics@worker01:~/robot-shop$ git merge master
Already up to date.
thesonics@worker01:~/robot-shop$ docker-compose pull
WARNING: The INSTANA_AGENT_KEY variable is not set. Defaulting to a blank string.
Pulling mongodb   ... done
Pulling redis     ... done
Pulling rabbitmq  ... done
Pulling catalogue ... done
Pulling user      ... done
Pulling cart      ... done
Pulling mysql     ... done
Pulling shipping  ... done
Pulling ratings   ... done
Pulling payment   ... done
Pulling dispatch  ... done
Pulling web       ... done

thesonics@worker01:~/robot-shop$ gpg --list-secret-keys --keyid-format=long
thesonics@worker01:~/robot-shop$ gpg --full-generate-key




