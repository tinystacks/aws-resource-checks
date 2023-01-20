import {
  ResourceChecks,
  ResourceDiffRecord,
  SmokeTestOptions,
  SQS_QUEUE,
  S3_BUCKET,
  getStandardResourceType,
  VPC
} from '@tinystacks/predeploy-infra';
import {
  s3BucketResourceTest
} from './s3-resource-tests';
import {
  sqsQueueResourceTest
} from './sqs-resource-tests';
import {
  vpcResourceTest
} from './vpc-resource-tests';

class TinyStacksAwsResourceChecks extends ResourceChecks {
  resourceTests: {
    [key: string]: (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], config: SmokeTestOptions) => Promise<void>
  } = {
      [SQS_QUEUE]: sqsQueueResourceTest,
      [S3_BUCKET]: s3BucketResourceTest,
      [VPC]: vpcResourceTest
    };

  async checkResource (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], config: SmokeTestOptions) {
    const resourceType = getStandardResourceType(resource.resourceType);
    const resourceTest = this.resourceTests[resourceType];
    if (resourceTest) return await resourceTest(resource, allResources, config);
  }
}


export {
  TinyStacksAwsResourceChecks
};
export default TinyStacksAwsResourceChecks;