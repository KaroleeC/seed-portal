# Supabase Storage Setup for Email Attachments

## Current Implementation

- Attachments are stored as **base64 in PostgreSQL** (in drafts and potentially sent emails)
- Works well for small files (<10MB)
- Simple implementation, no external dependencies

## Future: Migrate to Supabase Storage

### Why Supabase Storage?

- ✅ Already integrated with our auth system
- ✅ CDN support for fast delivery
- ✅ Better for large files (supports up to 50MB+)
- ✅ Reduces database size
- ✅ Automatic image optimization

### Setup Steps

#### 1. Create Storage Bucket

```sql
-- Run in Supabase SQL editor
insert into storage.buckets (id, name, public)
values ('email-attachments', 'email-attachments', false);
```

#### 2. Set Storage Policies

```sql
-- Allow authenticated users to upload their own attachments
create policy "Users can upload their own attachments"
on storage.objects for insert
with check (
  bucket_id = 'email-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own attachments
create policy "Users can read their own attachments"
on storage.objects for select
using (
  bucket_id = 'email-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own attachments
create policy "Users can delete their own attachments"
on storage.objects for delete
using (
  bucket_id = 'email-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

#### 3. Update Attachment Upload Logic ✅ COMPLETE

**Hybrid Approach Implemented:**

- Files <1MB: Store as base64 (fast, simple)
- Files >=1MB: Upload to Supabase Storage (scalable)

**Updated Code:**

```typescript
import { supabase } from "@/lib/supabase";

// Upload to storage
const filePath = `${userId}/${draftId}/${file.name}`;
const { data, error } = await supabase.storage.from("email-attachments").upload(filePath, file);

if (error) throw error;

// Get public URL
const {
  data: { publicUrl },
} = supabase.storage.from("email-attachments").getPublicUrl(filePath);

attachments.push({
  filename: file.name,
  storageUrl: publicUrl,
  contentType: file.type,
  size: file.size,
});
```

#### 4. Run Database Migration

**Migration file created:** `db/migrations/0026_email_attachment_storage.sql`

**To apply:**

```bash
# From the seed-portal directory
psql $DATABASE_URL < db/migrations/0026_email_attachment_storage.sql
```

**What it does:**

- Adds `attachment_storage_paths` column to `email_drafts` table
- Maintains backward compatibility with existing `attachments` column (base64)
- Creates index for faster queries on drafts with attachments

**Updated Schema:**

```typescript
// email-schema.ts - emailDrafts table now supports both storage methods
attachments: jsonb("attachments").$type<
  Array<{
    filename: string;
    contentBase64?: string; // For small files (<1MB)
    storageUrl?: string; // For large files (>=1MB)
    contentType?: string;
    size?: number;
  }>
>();
```

### Benefits of Migration

1. **Performance**: Faster queries, smaller database
2. **Scalability**: Handle larger files easily
3. **CDN**: Automatic global distribution
4. **Cost**: Storage cheaper than database space

### Current Attachment Features ✅

- [x] Drag-and-drop anywhere in compose window
- [x] Progress indicators during upload
- [x] Preview thumbnails for images
- [x] Size validation (warn >10MB, block >25MB)
- [x] Base64 storage in PostgreSQL

### Future Enhancements

- [ ] Migrate to Supabase Storage for files >5MB
- [ ] Virus scanning on upload
- [ ] Image resizing/optimization
- [ ] Direct download links
- [ ] Attachment expiration (auto-delete after 30 days)
