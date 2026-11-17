import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3'
import { describe, expect, it, vi } from 'vitest'

describe('S3 XML response compatibility', () => {
  it('parses a ListBuckets response from a fake request handler', async () => {
    const xmlResponse = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">',
      '<Owner><ID>synthetic-owner</ID></Owner>',
      '<Buckets><Bucket><Name>submission-probe</Name>',
      '<CreationDate>2026-01-02T03:04:05.000Z</CreationDate></Bucket></Buckets>',
      '</ListAllMyBucketsResult>',
    ].join('')

    const handle = vi.fn(() =>
      Promise.resolve({
        response: {
          statusCode: 200,
          headers: { 'content-type': 'application/xml' },
          body: Buffer.from(xmlResponse),
        },
      }),
    )
    const client = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'synthetic-access-key',
        secretAccessKey: 'synthetic-secret-key',
      },
      maxAttempts: 1,
      requestHandler: {
        handle,
        destroy: vi.fn(),
      },
    })

    try {
      const result = await client.send(new ListBucketsCommand({}))

      expect(handle).toHaveBeenCalledOnce()
      expect(handle.mock.calls[0][0].method).toBe('GET')
      expect(result.Buckets?.[0]?.Name).toBe('submission-probe')
      expect(result.Buckets?.[0]?.CreationDate?.toISOString()).toBe('2026-01-02T03:04:05.000Z')
    } finally {
      client.destroy()
    }
  })
})
