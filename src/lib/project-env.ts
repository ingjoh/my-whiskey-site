/**
 * Dynamic project ID detection utility.
 * Prevents Next.js build-time inlining issues by inspecting runtime environments
 * on both the server (Cloud Run/Functions) and the client (Browser).
 */
export const detectProjectId = (): string => {
  // 1. Client-side browser check
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if the hostname corresponds to development or staging
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('mywhiskey-97620') ||
      hostname.includes('staging') ||
      (hostname.includes('vercel.app') && hostname !== 'my-whiskey-site.vercel.app')
    ) {
      return 'mywhiskey-97620';
    }
    // Any other domain (e.g. motoryachtwhiskey.com, mywhiskey.com, vercel.app production urls) is Production
    return 'my-whiskey-prod';
  }

  // 2. Server-side runtime check (inspecting Vercel credentials first)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      if (serviceAccount.project_id) {
        return serviceAccount.project_id;
      }
    } catch (e) {}
  }

  if (process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'development') {
    return 'mywhiskey-97620';
  }

  // 3. Server-side runtime check (inspecting Firebase / Google Cloud configuration)
  const firebaseConfigStr = process.env.FIREBASE_CONFIG;
  if (firebaseConfigStr) {
    try {
      const config = JSON.parse(firebaseConfigStr);
      if (config.projectId) {
        return config.projectId;
      }
    } catch (e) {}
  }

  // Standard GCP environment variables
  const gcpProject = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
  if (gcpProject) {
    return gcpProject;
  }

  // Cloud Run service name check
  const serviceName = process.env.K_SERVICE;
  if (serviceName && serviceName.includes('my-whiskey-prod')) {
    return 'my-whiskey-prod';
  }

  // Fallback to build-time variable (which is inlined by Next.js, hence staging default)
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mywhiskey-97620';
};
