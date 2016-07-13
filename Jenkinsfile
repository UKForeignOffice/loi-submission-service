node {
    stage 'Step 1: Test'
        build job: 'Service Testing/Unit testing/Submission Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/Development']]
    stage 'Step 2: Deploy to Integration'
        build job: 'Service Deployment/Deploy to Integration', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'git@github-project-submission:UKForeignOffice/loi-submission-service.git'], [$class: 'StringParameterValue', name: 'Branch', value: 'Development'],[$class: 'StringParameterValue', name: 'Tag', value: 'submission-service-int'], [$class: 'StringParameterValue', name: 'Container', value: 'submission-service']]
}