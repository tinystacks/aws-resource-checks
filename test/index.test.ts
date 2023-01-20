const mockS3BucketSmokeTest = jest.fn();
const mockSqsQueueSmokeTest = jest.fn();
const mockVpcSmokeTest = jest.fn();

jest.mock('../src/s3-resource-tests.ts', () => ({
  s3BucketSmokeTest: mockS3BucketSmokeTest  
}));
jest.mock('../src/sqs-resource-tests.ts', () => ({
  sqsQueueSmokeTest: mockSqsQueueSmokeTest
}));
jest.mock('../src/vpc-resource-tests.ts', () => ({
  vpcSmokeTest: mockVpcSmokeTest
}));

import { TinyStacksAwsResourceTester } from '../src';
import {
  CloudformationTypes,
  TerraformTypes,
  ResourceDiffRecord
} from '@tinystacks/predeploy-infra';

const {
  CFN_S3_BUCKET,
  CFN_SQS_QUEUE
} = CloudformationTypes;
const {
  TF_VPC,
  TF_INTERNET_GATEWAY
} = TerraformTypes;

describe('TinyStacksAwsResourceTester', () => {
  const tester = new TinyStacksAwsResourceTester();
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('does nothing if resource is not supported', async () => {
    const mockResource = {
      resourceType: TF_INTERNET_GATEWAY
    } as ResourceDiffRecord;

    await tester.testResource(mockResource, [mockResource], {});

    expect(mockS3BucketSmokeTest).not.toBeCalled();
    expect(mockSqsQueueSmokeTest).not.toBeCalled();
    expect(mockVpcSmokeTest).not.toBeCalled();
  });
  it('tests s3 bucket', async () => {
    const mockResource = {
      resourceType: CFN_S3_BUCKET
    } as ResourceDiffRecord;

    await tester.testResource(mockResource, [mockResource], {});

    expect(mockS3BucketSmokeTest).toBeCalled();
    expect(mockS3BucketSmokeTest).toBeCalledWith(mockResource, [mockResource], {});
    expect(mockSqsQueueSmokeTest).not.toBeCalled();
    expect(mockVpcSmokeTest).not.toBeCalled();
  });
  it('tests sqs queue', async () => {
    const mockResource = {
      resourceType: CFN_SQS_QUEUE
    } as ResourceDiffRecord;

    await tester.testResource(mockResource, [mockResource], {});

    expect(mockS3BucketSmokeTest).not.toBeCalled();
    expect(mockSqsQueueSmokeTest).toBeCalled();
    expect(mockSqsQueueSmokeTest).toBeCalledWith(mockResource, [mockResource], {});
    expect(mockVpcSmokeTest).not.toBeCalled();
  });
  it('tests vpc', async () => {
    const mockResource = {
      resourceType: TF_VPC
    } as ResourceDiffRecord;

    await tester.testResource(mockResource, [mockResource], {});

    expect(mockS3BucketSmokeTest).not.toBeCalled();
    expect(mockSqsQueueSmokeTest).not.toBeCalled();
    expect(mockVpcSmokeTest).toBeCalled();
    expect(mockVpcSmokeTest).toBeCalledWith(mockResource, [mockResource], {});
  });
});