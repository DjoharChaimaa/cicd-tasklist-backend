pipeline {
    agent any
    triggers {
        githubPush()
    }
    environment {
        DOCKERHUB_CREDENTIALS = credentials('chaimaa-dockerhub-password')
        SONAR_TOKEN = credentials('chaimaa-sonar-token-backend')

        DOCKER_IMAGE = "${DOCKERHUB_CREDENTIALS_USR}/tasklist-backend-exam"
        DOCKER_TAG = "${env.BUILD_NUMBER}"
    }

    stages {

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'npx prisma generate'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npx prisma generate --schema=prisma/schema-test.prisma'
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml'
                }
            }
        }

        stage('E2E Tests') {
            steps {
                sh 'npm run test:e2e:coverage'
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
            withSonarQubeEnv('sonarqube-server-1') {
                sh 'npx sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                docker buildx create --use --name tasklist-builder || true

                docker buildx build \
                    --tag ${DOCKER_IMAGE}:${DOCKER_TAG} \
                    --tag ${DOCKER_IMAGE}:latest \
                    --load \
                    .
                '''
            }
        }

        stage('Trivy Scan') {
            steps {
                sh 'mkdir -p reports'

                sh '''
                trivy image \
                    --format json \
                    --output reports/trivy-report.json \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}

                trivy image \
                    --format sarif \
                    --output reports/trivy-report.sarif \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}

                trivy image \
                    --format table \
                    --output reports/trivy-report.txt \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}

                trivy image \
                    --exit-code 1 \
                    --severity CRITICAL \
                    --quiet \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}
                '''
            }

            post {
                always {
                    archiveArtifacts artifacts: 'reports/trivy-report.*'
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''
                trivy image \
                    --format spdx-json \
                    --output reports/sbom-spdx.json \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}

                trivy image \
                    --format cyclonedx \
                    --output reports/sbom-cyclonedx.json \
                    ${DOCKER_IMAGE}:${DOCKER_TAG}
                '''
            }

            post {
                always {
                    archiveArtifacts artifacts: 'reports/sbom-*'
                }
            }
        }

        stage('Docker Push') {
            steps {
                sh '''
                echo $DOCKERHUB_CREDENTIALS_PSW | docker login \
                    -u $DOCKERHUB_CREDENTIALS_USR \
                    --password-stdin

                docker buildx build \
                    --platform linux/amd64 \
                    --tag ${DOCKER_IMAGE}:${DOCKER_TAG} \
                    --tag ${DOCKER_IMAGE}:latest \
                    --sbom=true \
                    --provenance=true \
                    --push \
                    .
                '''
            }

            post {
                always {
                    sh 'docker logout'
                }
            }
        }
    }

    post {

        always {
            cleanWs()
        }

        success {
            echo 'Backend pipeline completed successfully!'
        }

        failure {
            echo 'Backend pipeline failed!'
        }
    }
}