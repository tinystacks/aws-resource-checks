const mockLoggerInfo = jest.fn();
const mockGetCredentials = jest.fn();
const mockListBuckets = jest.fn();
const mockHeadBucket = jest.fn();
const mockS3 = jest.fn();
const mockGetAwsDefaultServiceQuota = jest.fn();
const mockServiceQuotas = jest.fn();

jest.mock('@tinystacks/precloud', () => {
  const original = jest.requireActual('@tinystacks/precloud');
  return {
    logger: {
      info: mockLoggerInfo
    },
    ChangeType: original.ChangeType,
    IacFormat: original.IacFormat,
    ResourceDiffRecord: original.ResourceDiffRecord,
    S3_BUCKET: original.S3_BUCKET,
    getStandardResourceType: original.getStandardResourceType,
    QuotaError: original.QuotaError,
    ConflictError: original.ConflictError
  };
});

jest.mock('../src/utils/aws', () => ({
  getCredentials: mockGetCredentials
}));

jest.mock('@aws-sdk/client-s3', () => ({
  __esModule: true,
  S3: mockS3
}));

import {
  ChangeType,
  IacFormat,
  ResourceDiffRecord
} from '@tinystacks/precloud';
import {
  s3BucketResourceTest
} from '../src/s3-resource-tests';

describe('s3 predeploy checks', () => {
  beforeEach(() => {
    mockS3.mockReturnValue({
      listBuckets: mockListBuckets,
      headBucket: mockHeadBucket
    });
    mockServiceQuotas.mockReturnValue({
      getAWSDefaultServiceQuota: mockGetAwsDefaultServiceQuota
    });
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('s3BucketResourceTest', () => {
    it('does nothing if change type is not create', async () => {
      const resource = {
        changeType: ChangeType.UPDATE
      } as ResourceDiffRecord;

      await s3BucketResourceTest(resource, [resource]);

      expect(mockLoggerInfo).not.toBeCalled();
      expect(mockGetCredentials).not.toBeCalled();
      expect(mockS3).not.toBeCalled();
      expect(mockHeadBucket).not.toBeCalled();
    });
    it('throws a ConflictError if user has multiple buckets with the same name in their template', async () => {
      const resource1 = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        resourceType: 'AWS::S3::Bucket',
        logicalId: 'bucket-1',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;
      const resource2 = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        resourceType: 'AWS::S3::Bucket',
        logicalId: 'bucket-2',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;

      let thrownError;
      try {
        await s3BucketResourceTest(resource1, [resource1, resource2]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking if S3 bucket name mock-bucket is unique...');
        expect(mockGetCredentials).not.toBeCalled();
        expect(mockHeadBucket).not.toBeCalled();

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Conflict!');
        expect(thrownError).toHaveProperty('reason', 'Multiple buckets with the same name found in template!');
        expect(thrownError).toHaveProperty('hints', [
          'S3 bucket names must be unique.',
          'Consider renaming one or more of the following resource: \n[\n  \"bucket-2\",\n  \"bucket-1\"\n]'
        ]);
      }
    });
    it('throws a ConflictError if user already has a bucket with the same name in their AWS environment', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        resourceType: 'AWS::S3::Bucket',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;
      mockHeadBucket.mockResolvedValueOnce({});

      let thrownError;
      try {
        await s3BucketResourceTest(resource, [resource]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking if S3 bucket name mock-bucket is unique...');
        expect(mockGetCredentials).toBeCalled();
        expect(mockHeadBucket).toBeCalled();
        expect(mockHeadBucket).toBeCalledWith({
          Bucket: 'mock-bucket'
        });

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Conflict!');
        expect(thrownError).toHaveProperty('reason', 'An S3 bucket with name mock-bucket already exists!');
      }
    });
    it('throws a ConflictError if the bucket name is not globally unique', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        resourceType: 'AWS::S3::Bucket',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;
      
      mockHeadBucket.mockRejectedValueOnce({
        '$metadata': {
          httpStatusCode: 403
        }
      });

      let thrownError;
      try {
        await s3BucketResourceTest(resource, [resource]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking if S3 bucket name mock-bucket is unique...');
        expect(mockGetCredentials).toBeCalled();
        expect(mockHeadBucket).toBeCalled();
        expect(mockHeadBucket).toBeCalledWith({
          Bucket: 'mock-bucket'
        });

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Conflict!');
        expect(thrownError).toHaveProperty('reason', 'An S3 bucket with name mock-bucket already exists!');
      }
    });
    it('does not validate bucket name if it is undefined/defaulted', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.awsCdk,
        properties: {}
      } as unknown as ResourceDiffRecord;

      await s3BucketResourceTest(resource, [resource]);

      expect(mockLoggerInfo).not.toBeCalled();
      expect(mockGetCredentials).not.toBeCalled();
      expect(mockHeadBucket).not.toBeCalled();
    });
    it('throws original error if it is not a 403 or 404', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        format: IacFormat.tf,
        resourceType: 'aws_s3_bucket',
        properties: {
          Name: 'mock-bucket'
        }
      } as unknown as ResourceDiffRecord;
      
      mockHeadBucket.mockRejectedValueOnce({
        '$metadata': {
          httpStatusCode: 500
        }
      });

      let thrownError;
      try {
        await s3BucketResourceTest(resource, [resource]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking if S3 bucket name mock-bucket is unique...');
        expect(mockGetCredentials).toBeCalled();
        expect(mockHeadBucket).toBeCalled();
        expect(mockHeadBucket).toBeCalledWith({
          Bucket: 'mock-bucket'
        });

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toEqual({
          '$metadata': {
            httpStatusCode: 500
          }
        });
      }
    });
  });
});