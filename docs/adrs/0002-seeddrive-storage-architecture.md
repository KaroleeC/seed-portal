# ADR-0002: SEEDDRIVE Storage Architecture

## Status

**Accepted**

- **Date**: 2024-10-13
- **Author(s)**: Development Team
- **Related**: ADR-0001 (Provider Pattern)

## Context

### Background

seed-portal currently uses Box for file storage (attachments, documents, profile photos). This creates several issues:

1. **Cost**: Box enterprise plan is expensive and scales linearly with users
2. **API Complexity**: Box SDK requires complex OAuth flows and token management
3. **Limited Control**: Dependent on Box's feature set and pricing changes
4. **Testing Difficulty**: Requires Box API credentials even for development/testing
5. **Attachment Policy Conflict**: We only store attachments in "support mode" (user explicitly requests), but Box is provisioned for all files

We already use Supabase for our database and auth. Supabase Storage provides S3-compatible object storage that integrates seamlessly.

### Forces at Play

- **Cost Reduction**: Supabase Storage significantly cheaper than Box enterprise
- **Existing Infrastructure**: Already using Supabase for database and auth
- **Developer Experience**: Supabase SDK already integrated, no new dependencies
- **Migration Path**: Need to handle existing Box files during transition
- **Security**: Must maintain same security model (RLS, signed URLs)
- **Attachment Policy**: Support-mode-only attachment storage still applies

## Decision

**We will use Supabase Storage as the default storage provider (SEEDDRIVE) and deprecate Box.**

### Key Points

- **Provider**: Supabase Storage with S3-compatible API
- **Bucket**: Single bucket named `seeddrive` for all application files
- **Access Control**: Row-Level Security (RLS) policies mirror database permissions
- **URL Strategy**: Signed URLs with 5-minute TTL for temporary access
- **Migration**: Moderate concurrency, exponential backoff for Box → Supabase transfer
- **Fallback**: Box remains available via `STORAGE_PROVIDER=box` during transition

### Implementation Details

**Environment Configuration:**

```bash
# Storage provider selection
STORAGE_PROVIDER=supabase  # default

# Disable Box SDK
DISABLE_BOX=1

# SEEDDRIVE configuration
SEEDDRIVE_BUCKET=seeddrive
SEEDDRIVE_SIGNED_URL_TTL=300  # 5 minutes
```

**Storage Service Interface:**

```typescript
interface IStorageProvider {
  upload(file: File, path: string): Promise<{ url: string }>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, ttl?: number): Promise<string>;
  list(path: string): Promise<string[]>;
}
```

**Supabase Storage Setup:**

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('seeddrive', 'seeddrive', false);

-- RLS Policy: Users can only access their own files
CREATE POLICY "Users can manage their own files"
ON storage.objects FOR ALL
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

**Configuration:**

- Bucket: `seeddrive`
- TTL: `300` seconds (5 minutes)
- Public access: `false` (requires authentication)

**Files Affected:**

- `server/services/storage-service.ts`
- `server/box-integration.ts` (deprecated, kept for rollback)
- `client/src/lib/attachmentStorage.ts`

## Consequences

### Positive Consequences

✅ **Cost Savings**: ~80% reduction in storage costs

- Supabase included in current plan
- Box enterprise license can be cancelled

✅ **Unified Infrastructure**: Single vendor (Supabase) for database, auth, and storage

- Simplified DevOps and monitoring
- Consistent authentication model
- Single SDK for all backend operations

✅ **Improved DX**: Simpler API, better TypeScript types

- No OAuth dance for storage access
- RLS policies match database patterns
- Local development easier (Supabase CLI)

✅ **Better Security**: RLS policies at storage layer

- Fine-grained access control per file
- Automatic auth integration
- Signed URLs prevent unauthorized access

### Negative Consequences

⚠️ **Migration Effort**: Must transfer existing Box files to Supabase

- **Mitigation**: Moderate concurrency script with backoff
- **Timeline**: Non-blocking, can run in background
- **Fallback**: Box remains accessible during migration

⚠️ **Vendor Lock-in Trade**: Switching from Box to Supabase

- **Mitigation**: S3-compatible API allows future portability
- **Trade-off**: Accepted for cost and integration benefits

### Risks

🚨 **Risk**: Data loss during Box → Supabase migration

- **Mitigation**:
  - Verify checksums for each file transfer
  - Keep Box files until verification complete
  - Incremental migration with logging
- **Fallback**: Can revert to `STORAGE_PROVIDER=box` if issues

🚨 **Risk**: Supabase Storage limits or downtime

- **Mitigation**:
  - Monitor Supabase status page
  - Have Box credentials ready for emergency fallback
  - Implement retry logic with exponential backoff
- **Fallback**: Provider toggle to Box

### Neutral Consequences

ℹ️ **Support-Mode Attachment Policy Unchanged**: Only store attachments when user explicitly requests

- This policy is maintained regardless of storage provider
- Reduces storage usage and costs on either platform

## Alternatives Considered

### Alternative 1: AWS S3 Direct

**Description**: Use AWS S3 directly instead of Supabase Storage

**Pros:**

- ✅ Industry standard, maximum portability
- ✅ Fine-grained IAM controls
- ✅ Extensive ecosystem and tooling

**Cons:**

- ❌ Additional vendor to manage
- ❌ Separate authentication system
- ❌ More complex setup (IAM roles, policies, etc.)
- ❌ Additional costs and billing complexity

**Why Rejected**: Supabase Storage is S3-compatible and already in our stack. Adding AWS increases operational complexity without significant benefit.

### Alternative 2: Keep Box, Negotiate Better Pricing

**Description**: Negotiate with Box for better enterprise pricing

**Pros:**

- ✅ No migration effort
- ✅ Proven solution already in production

**Cons:**

- ❌ Still expensive compared to Supabase
- ❌ Maintains dependency on external vendor
- ❌ Doesn't solve API complexity issues
- ❌ Doesn't improve developer experience

**Why Rejected**: Cost savings are significant, and Supabase Storage offers better integration with existing infrastructure.

### Alternative 3: Self-Hosted MinIO

**Description**: Deploy MinIO (S3-compatible) on our own infrastructure

**Pros:**

- ✅ Complete control over data
- ✅ No vendor lock-in
- ✅ S3-compatible API

**Cons:**

- ❌ Infrastructure management overhead
- ❌ Must handle backups, replication, scaling
- ❌ Security and access control is our responsibility
- ❌ Operational complexity

**Why Rejected**: Not worth the operational burden. Supabase Storage provides managed S3-compatible storage without the ops overhead.

## References

### Related ADRs

- [ADR-0001: Provider Pattern & Environment Toggles](./0001-provider-pattern-env-toggles.md)

### Documentation

- [Integration Removal Plan](../INTEGRATION_REMOVAL_PLAN.md)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)

### External Resources

- [Supabase Storage Pricing](https://supabase.com/pricing)
- [S3 Compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)

### Code References

- `server/services/storage-service.ts` - Storage abstraction
- `server/box-integration.ts` - Legacy Box implementation (deprecated)

## Notes

### Implementation Notes

- **Migration Script**: Create background job for Box → Supabase file transfer
- **Concurrency**: Moderate (5-10 concurrent transfers) with exponential backoff
- **Verification**: Verify file checksums after transfer
- **Cleanup**: Keep Box files until migration 100% verified
- **No Hard Constraints**: Migration can proceed at comfortable pace

### Future Considerations

- **CDN**: Consider Cloudflare CDN for frequently accessed files
- **Image Optimization**: Supabase Image Transformation for profile photos
- **Backup Strategy**: Supabase handles backups, but consider additional snapshots for critical files

### Decision Review

- **Next Review**: After migration completion
- **Review Criteria**:
  - All files migrated successfully
  - 30 days of production usage without Box fallback
  - Cost savings realized

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-10-13 | Created and marked as Accepted | Development Team |
