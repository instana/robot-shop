node {
    def cart

    stage('Clone repository') {
        /* Cloning the Repository to our Workspace */

        git 'https://github.com/rafraf1987/robot-shop'
    }

    stage('Build image') {
        /* This builds the actual image */
        dir ('/robot-shop/tree/devops/cart') {

        cart = docker.build("rafraf1111/cart:${env.BUILD_NUMBER}")
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
        docker.withRegistry('https://registry.hub.docker.com', 'docker_hub') {
            cart.push("${env.BUILD_NUMBER}")
            } 
                echo "Trying to Push Docker Build to DockerHub"
    
    }
}
