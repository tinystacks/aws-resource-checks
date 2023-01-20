import {
  ResourceTester,
  ResourceDiffRecord,
  SmokeTestOptions,
  SQS_QUEUE,
  S3_BUCKET,
  getStandardResourceType,
  VPC
} from '@tinystacks/predeploy-infra';
import {
  s3BucketSmokeTest
} from './s3-resource-tests';
import {
  sqsQueueSmokeTest
} from './sqs-resource-tests';
import {
  vpcSmokeTest
} from './vpc-resource-tests';

class TinyStacksAwsResourceTester extends ResourceTester {
  resourceTests: {
    [key: string]: (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], config: SmokeTestOptions) => Promise<void>
  } = {
      [SQS_QUEUE]: sqsQueueSmokeTest,
      [S3_BUCKET]: s3BucketSmokeTest,
      [VPC]: vpcSmokeTest
    };

  async testResource (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], config: SmokeTestOptions) {
    const resourceType = getStandardResourceType(resource.resourceType);
    const resourceTest = this.resourceTests[resourceType];
    if (resourceTest) return await resourceTest(resource, allResources, config);
  }
}


export {
  TinyStacksAwsResourceTester
};
export default TinyStacksAwsResourceTester;