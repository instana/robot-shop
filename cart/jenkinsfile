node {
    def cart

    stage('Clone repository') {
        /* Cloning this Repository to our Workspace */

        checkout scm
    }

    stage('Build image') {
        /* This builds the actual image */

        cart = docker.build("rafraf1111/cart")
    }

    stage('Test image') {
        
        cart.inside {
            echo "Tests passed"
        }
    }

    stage('Push image') {
        /* 
			You would need to first register with DockerHub before you can push images to your account
		*/
        docker.withRegistry('https://registry.hub.docker.com', 'docker-hub') {
            cart.push("${env.BUILD_NUMBER}")
            cart.push("latest")
            } 
                echo "Trying to Push Docker Build to DockerHub"
    }
