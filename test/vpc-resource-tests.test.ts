const mockLoggerInfo = jest.fn();
const mockGetCredentials = jest.fn();
const mockDescribeVpcs = jest.fn();
const mockEc2 = jest.fn();
const mockGetAwsDefaultServiceQuota = jest.fn();
const mockServiceQuotas = jest.fn();

jest.mock('@tinystacks/iac-utils', () => {
  const original = jest.requireActual('@tinystacks/iac-utils');
  return {
    logger: {
      info: mockLoggerInfo
    },
    ChangeType: original.ChangeType,
    IacFormat: original.IacFormat,
    ResourceDiffRecord: original.ResourceDiffRecord,
    SmokeTestOptions: original.SmokeTestOptions,
    Json: original.Json,
    ROUTE_TABLE_ASSOCIATION: original.ROUTE_TABLE_ASSOCIATION,
    SUBNET: original.SUBNET,
    getStandardResourceType: original.getStandardResourceType,
    CliError: original.CliError,
    ConflictError: original.ConflictError
  };
});

jest.mock('../src/utils/aws', () => ({
  getCredentials: mockGetCredentials
}));

import {
  ChangeType,
  IacFormat,
  ResourceDiffRecord
} from '@tinystacks/iac-utils';
import {
  vpcSmokeTest
} from '../src/vpc-resource-tests';

describe('vpc smoke tests', () => {
  beforeEach(() => {
    mockEc2.mockReturnValue({
      describeVpcs: mockDescribeVpcs
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

  describe('vpcSmokeTest', () => {
    it('does nothing if requirePrivateSubnet is undefined', async () => {
      const mockVpc: ResourceDiffRecord = {
        'format': IacFormat.tf,
        'resourceType': 'aws_vpc',
        'changeType': ChangeType.CREATE,
        'address': 'module.ts_aws_vpc_hello_world.aws_vpc.ts_aws_vpc',
        'logicalId': 'ts_aws_vpc',
        'providerName': 'registry.terraform.io/hashicorp/aws',
        'properties': {
          'cidrBlock': '10.0.0.0/16',
          'instanceTenancy': 'default'
        }
      };
      const allResources = require('./test-data/vpc-stack/tf/with-nat/tf-diff.json');

      let thrownError;
      try {
        await vpcSmokeTest(mockVpc, allResources, {});
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).not.toBeCalled();
        expect(thrownError).toBeUndefined();
      }
    });
    it('does nothing if requirePrivateSubnet is false', async () => {
      const mockVpc: ResourceDiffRecord = {
        'stackName': 'SmokeTestApp',
        'format': IacFormat.awsCdk,
        'changeType': ChangeType.CREATE,
        'resourceType': 'AWS::EC2::VPC',
        'address': 'Vpc/Vpc',
        'logicalId': 'VpcC3027511',
        'properties': {
          'cidrBlock': '10.40.0.0/16',
          'instanceTenancy': 'default',
          'tagSet': [
            {
              'Key': 'Name',
              'Value': 'SmokeTestApp/Vpc/Vpc'
            }
          ]
        }
      };
      const allResources = require('./test-data/vpc-stack/tf/with-nat/tf-diff.json');

      let thrownError;
      try {
        await vpcSmokeTest(mockVpc, allResources, { requirePrivateSubnet: false });
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).not.toBeCalled();
        expect(thrownError).toBeUndefined();
      }
    });
    it('validates the route table for the private subnet has a route pointing to a NAT gateway', async () => {
      const mockVpc = {
        'stackName': 'SmokeTestApp',
        'format': 'aws-cdk',
        'changeType': 'CREATE',
        'resourceType': 'AWS::EC2::VPC',
        'address': 'Vpc/Vpc',
        'logicalId': 'VpcC3027511',
        'properties': {
          'cidrBlock': '10.40.0.0/16',
          'instanceTenancy': 'default',
          'tagSet': [
            {
              'Key': 'Name',
              'Value': 'SmokeTestApp/Vpc/Vpc'
            }
          ]
        }
      } as ResourceDiffRecord;
      const allResources = require('./test-data/vpc-stack/cdk/with-nat/aws-cdk-diff.json');

      let thrownError;
      try {
        await vpcSmokeTest(mockVpc, allResources, { requirePrivateSubnet: true });
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Verifying subnet configuration...');
        expect(thrownError).toBeUndefined();
      }
    });
    it('throws if there is not a subnet with a route pointing to a NAT gateway', async () => {
      const mockVpc: ResourceDiffRecord = {
        'stackName': 'SmokeTestApp',
        'format': IacFormat.awsCdk,
        'changeType': ChangeType.CREATE,
        'resourceType': 'AWS::EC2::VPC',
        'address': 'Vpc/Vpc',
        'logicalId': 'VpcC3027511',
        'properties': {
          'cidrBlock': '10.40.0.0/16',
          'instanceTenancy': 'default',
          'tagSet': [
            {
              'Key': 'Name',
              'Value': 'SmokeTestApp/Vpc/Vpc'
            }
          ]
        }
      };
      const allResources = require('./test-data/vpc-stack/cdk/no-nat/aws-cdk-diff.json');

      let thrownError;
      try {
        await vpcSmokeTest(mockVpc, allResources, { requirePrivateSubnet: true });
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Verifying subnet configuration...');
        
        expect(thrownError).toBeDefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Missing private subnets!');
        expect(thrownError).toHaveProperty('reason', 'Based on the configuration passed, private subnets with a NAT Gateway are required for all vpcs but none was found for "VpcC3027511".');
      }
    });
  });
});