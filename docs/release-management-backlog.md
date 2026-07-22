# Release Management Backlog

## Future Feature: Publish New Version

Status: Backlog. Not included in V1.

V1 release deployment remains a manual DevOps responsibility using the existing deployment process. Do not add a placeholder Publish button, upload dialog, deployment credentials, frontend-only privilege checks, release-management navigation, or incomplete deployment functionality in V1.

### Current Findings

- Current apparent hosting for `https://erp.plsrv.com`: Amazon S3 behind CloudFront.
- Confirm the authoritative S3 bucket and CloudFront distribution before implementation.
- The current ERP repository is frontend-only and does not contain a secure backend deployment service.
- Deployment credentials must never be stored or exposed in the browser application.

### Required Future Architecture

- Add real authentication and server-side authorization before exposing release publishing.
- Introduce a dedicated privilege: `RELEASE_PUBLISH`.
- Do not grant `RELEASE_PUBLISH` to QA users by default.
- Enforce authorization server-side, not only by hiding UI controls.
- Add a secured backend Release Management service to own deployment credentials and deployment orchestration.
- Validate release packages before deployment.
- Deploy approved static assets to S3.
- Invalidate CloudFront after deployment.
- Run a post-deployment health check before reporting success.
- Preserve immutable release history.
- Support rollback using S3 versioning or retained release artifacts where available.

### Future UI Scope

- Current version.
- New version.
- Package upload.
- Release notes.
- Package validation result.
- Confirmation step.
- Deployment progress.
- Success or failure result.
- Rollback action where supported by the deployment mechanism.
