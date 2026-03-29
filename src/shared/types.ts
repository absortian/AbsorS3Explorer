export interface S3Connection {
  id: string;
  name: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket?: string;
  region?: string;
  isFolder?: boolean;
  parentId?: string | null;
}
