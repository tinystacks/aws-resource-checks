const mockS3BucketResourceTest = jest.fn();
const mockSqsQueueResourceTest = jest.fn();
const mockVpcResourceTest = jest.fn();

jest.mock('../src/s3-resource-tests.ts', () => ({
  s3BucketResourceTest: mockS3BucketResourceTest  
}));
jest.mock('../src/sqs-resource-tests.ts', () => ({
  sqsQueueResourceTest: mockSqsQueueResourceTest
}));
jest.mock('../src/vpc-resource-tests.ts', () => ({
  vpcResourceTest: mockVpcResourceTest
}));

import { TinyStacksAwsResourceChecks } from '../src';
import {
  CloudformationTypes,
  TerraformTypes,
  ResourceDiffRecord
} from '@tinystacks/precloud';

const {
  CFN_S3_BUCKET,
  CFN_SQS_QUEUE
} = CloudformationTypes;
const {
  TF_VPC,
  TF_INTERNET_GATEWAY
} = TerraformTypes;

describe('TinyStacksAwsResourceChecks', () => {
  const tester = new TinyStacksAwsResourceChecks();
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

    await tester.checkResource(mockResource, [mockResource], {});

    expect(mockS3BucketResourceTest).not.toBeCalled();
    expect(mockSqsQueueResourceTest).not.toBeCalled();
    expect(mockVpcResourceTest).not.toBeCalled();
  });
  it('tests s3 bucket', async () => {
    const mockResource = {
      resourceType: CFN_S3_BUCKET
    } as ResourceDiffRecord;

    await tester.checkResource(mockResource, [mockResource], {});

    expect(mockS3BucketResourceTest).toBeCalled();
    expect(mockS3BucketResourceTest).toBeCalledWith(mockResource, [mockResource], {});
    expect(mockSqsQueueResourceTest).not.toBeCalled();
    expect(mockVpcResourceTest).not.toBeCalled();
  });
  it('tests sqs queue', async () => {
    const mockResource = {
      resourceType: CFN_SQS_QUEUE
    } as ResourceDiffRecord;

    await tester.checkResource(mockResource, [mockResource], {});

    expect(mockS3BucketResourceTest).not.toBeCalled();
    expect(mockSqsQueueResourceTest).toBeCalled();
    expect(mockSqsQueueResourceTest).toBeCalledWith(mockResource, [mockResource], {});
    expect(mockVpcResourceTest).not.toBeCalled();
  });
  it('tests vpc', async () => {
    const mockResource = {
      resourceType: TF_VPC
    } as ResourceDiffRecord;

    await tester.checkResource(mockResource, [mockResource], {});

    expect(mockS3BucketResourceTest).not.toBeCalled();
    expect(mockSqsQueueResourceTest).not.toBeCalled();
    expect(mockVpcResourceTest).toBeCalled();
    expect(mockVpcResourceTest).toBeCalledWith(mockResource, [mockResource], {});
  });
});