/** Shared by every auth interceptor variant (firebase/business/admin). */
export function isPublicEndpoint(
  url: string,
  publicEndpoints: string[],
): boolean {
  return publicEndpoints.some((path) => url.includes(path));
}

export function isInternalApiRequest(url: string): boolean {
  if (url.includes('googleapis.com') || url.includes('places.googleapis.com')) {
    return false;
  }
  return url.includes('/api/');
}
