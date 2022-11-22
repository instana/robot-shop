# Steps taken to launch application
docker-compose pull
docker-compose up

# Image of homepage
![Alt text] (./homepge.png?raw=true "Home Page"

# Why is it wrong to commit directly 
Committing directly to the master branch allows people to push features to production without getting them code reviewed, this is especially bad if the feature causes breaking changes where if you are a business will affect customers. 

# How do we prevent this
settings -> branch -> branch protection and enable “require pull request before merging” 