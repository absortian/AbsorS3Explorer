import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3'
import { S3Connection } from '../shared/types'
import * as fs from 'fs/promises'

function getClient(connection: S3Connection): S3Client {
  return new S3Client({
    region: connection.region || 'us-east-1',
    endpoint: connection.endpoint,
    credentials: {
      accessKeyId: connection.accessKeyId,
      secretAccessKey: connection.secretAccessKey,
    },
    // Force path style for minio/custom s3 compatibility
    forcePathStyle: true,
  })
}

export async function listBuckets(connection: S3Connection) {
  const client = getClient(connection)
  const command = new ListBucketsCommand({})
  const response = await client.send(command)
  return response.Buckets?.map(b => b.Name).filter(Boolean) as string[] || []
}

export async function listObjects(connection: S3Connection, bucket: string, prefix: string = '') {
  if (!bucket) throw new Error('No bucket specified')
  const client = getClient(connection)
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: '/'
  })
  
  const response = await client.send(command)
  return {
    folders: response.CommonPrefixes?.map(p => p.Prefix) || [],
    files: response.Contents?.map(c => ({
      key: c.Key,
      size: c.Size,
      lastModified: c.LastModified
    })).filter(c => c.key !== prefix) || []
  }
}

export async function uploadFile(connection: S3Connection, bucket: string, localPath: string, key: string) {
  if (!bucket) throw new Error('No bucket specified')
  const client = getClient(connection)
  
  const fileContent = await fs.readFile(localPath)
  // Determine content type (simple matching or default to application/octet-stream)
  const contentType = 'application/octet-stream' // Could use mime-types package
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileContent,
    ContentType: contentType
  })
  
  await client.send(command)
}

export async function createFolder(connection: S3Connection, bucket: string, key: string) {
  if (!bucket) throw new Error('No bucket specified')
  const client = getClient(connection)
  
  const folderKey = key.endsWith('/') ? key : `${key}/`
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: folderKey,
    Body: ''
  })
  
  await client.send(command)
}

export async function deleteObject(connection: S3Connection, bucket: string, key: string) {
  if (!bucket) throw new Error('No bucket specified')
  const client = getClient(connection)
  
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  })
  
  await client.send(command)
}

export async function downloadFile(connection: S3Connection, bucket: string, key: string, localDestPath: string) {
  if (!bucket) throw new Error('No bucket specified')
  const client = getClient(connection)
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  })
  
  const response = await client.send(command)
  if (!response.Body) throw new Error('Empty response body')
  
  // Node.js streams
  const byteArray = await response.Body.transformToByteArray()
  await fs.writeFile(localDestPath, byteArray)
}
