/** KYC document types the platform currently collects — matches Businesses.Module's
 * UploadBusinessDocumentHandler allow-list on the backend. Shared by AdminApiService
 * (document review) and BusinessApiService (document upload). */
export type BusinessDocumentType = 'pan' | 'fssai' | 'gst' | 'bank-proof';

/** One uploaded KYC document — see Businesses.Module's VerificationDocDto (backend). */
export interface VerificationDocDto {
  type: BusinessDocumentType;
  url: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}
