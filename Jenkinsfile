pipeline {
    agent any

    environment {
        NODE_ENV = 'test'
        POSTGRES_PASSWORD = 'postgres'
        POSTGRES_DB = 'playwright_dashboard_test'
        REDIS_URL = 'redis://redis:6379'
        DATABASE_URL = 'postgres://postgres:postgres@postgres:5432/playwright_dashboard_test'
    }

    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Frontend Tests') {
            agent {
                docker {
                    image 'node:18'
                    args '-v $HOME/.npm:/root/.npm'
                }
            }
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run type-check'
                    sh 'npm run lint'
                    sh 'npm test'
                }
            }
        }

        stage('Backend Tests') {
            agent {
                docker {
                    image 'node:18'
                    args '-v $HOME/.npm:/root/.npm'
                }
            }
            services {
                postgres {
                    image 'postgres:15'
                    environment ['POSTGRES_PASSWORD': 'postgres', 'POSTGRES_DB': 'playwright_dashboard_test']
                }
                redis {
                    image 'redis:7-alpine'
                }
            }
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm run type-check'
                    sh 'npm run lint'
                    sh 'npm test'
                }
            }
        }

        stage('Integration Tests') {
            agent {
                docker {
                    image 'node:18'
                    args '-v $HOME/.npm:/root/.npm'
                }
            }
            services {
                postgres {
                    image 'postgres:15'
                    environment ['POSTGRES_PASSWORD': 'postgres', 'POSTGRES_DB': 'playwright_dashboard_test']
                }
                redis {
                    image 'redis:7-alpine'
                }
                docker {
                    image 'docker:dind'
                }
            }
            steps {
                sh 'npm ci'
                sh 'docker-compose up -d postgres redis'
                sh 'sleep 5'
                sh 'npm run test:e2e'
            }
        }

        stage('Build') {
            parallel {
                stage('Build Frontend') {
                    agent {
                        docker {
                            image 'node:18'
                            args '-v $HOME/.npm:/root/.npm'
                        }
                    }
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }

                stage('Build Backend') {
                    agent {
                        docker {
                            image 'node:18'
                            args '-v $HOME/.npm:/root/.npm'
                        }
                    }
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'playwright-report/', fingerprint: true
            junit 'playwright-report/**/*.xml'
        }
        success {
            echo 'Pipeline executed successfully'
        }
        failure {
            echo 'Pipeline execution failed'
        }
    }
}
