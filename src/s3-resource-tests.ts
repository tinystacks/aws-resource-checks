import { S3 } from '@aws-sdk/client-s3';
import {
  logger,
  ConflictError,
  ChangeType,
  ResourceDiffRecord,
  CheckOptions,
  getStandardResourceType,
  S3_BUCKET
} from '@tinystacks/precloud';
import { getCredentials } from './utils/aws';

async function validateBucketNameIsUnique (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[]) {
  const bucketName = resource.properties?.Name;
  if (!bucketName) {
    return;
  }
  logger.info(`Checking if S3 bucket name ${bucketName} is unique...`);

  /**
   * Consider moving this to template checks.
   */
  const otherS3BucketsWithSameName = allResources.filter((res: ResourceDiffRecord) => (
    getStandardResourceType(res.resourceType) === S3_BUCKET &&
    res.logicalId !== resource.logicalId &&
    res.properties?.Name === bucketName
  ));

  if (otherS3BucketsWithSameName.length > 0) {
    throw new ConflictError(
      `Multiple buckets with the same name ("${bucketName}") found in template!`,
      'S3 bucket names must be unique.',
      `Consider renaming one or more of the following resource: \n${JSON.stringify(
        [...otherS3BucketsWithSameName, resource].map((res: ResourceDiffRecord) => res.logicalId),
        null,
        2
      )}`);
  }
  
  const s3Client = new S3({
    credentials: await getCredentials()
  });

  let error;
  try {
    await s3Client.headBucket({
      Bucket: bucketName
    });
  } catch (err) {
    error = err as any;
  }

  if (!error || error?.$metadata?.httpStatusCode === 403) {
    throw new ConflictError(`An S3 bucket with name ${bucketName} already exists!`);
  } else if (error.$metadata?.httpStatusCode !== 404) {
    throw error;
  }
}

async function s3BucketResourceTest (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], _config?: CheckOptions) {
  if (resource.changeType === ChangeType.CREATE) {
    await validateBucketNameIsUnique(resource, allResources);
  }
}

export {
  s3BucketResourceTest
};