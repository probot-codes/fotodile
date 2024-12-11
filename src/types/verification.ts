export type Platform = 'facebook' | 'twitter' | 'instagram';

export interface VerificationResult {
  isReal: boolean;
  message: string;
  details: VerificationDetail[];
  riskScore: number;
}

export interface VerificationDetail {
  criterion: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
}