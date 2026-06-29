-- Add RISK source type for risk chunks (rag-requirements §3.3)
ALTER TYPE "DocumentSourceType" ADD VALUE IF NOT EXISTS 'RISK';
