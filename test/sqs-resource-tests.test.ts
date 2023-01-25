const mockLoggerInfo = jest.fn();
const mockGetCredentials = jest.fn();
const mockListQueues = jest.fn();
const mockSqs = jest.fn();

jest.mock('@tinystacks/precloud', () => {
  const original = jest.requireActual('@tinystacks/precloud');
  return {
    logger: {
      info: mockLoggerInfo
    },
    ChangeType: original.ChangeType,
    IacFormat: original.IacFormat,
    ResourceDiffRecord: original.ResourceDiffRecord,
    SQS_QUEUE: original.SQS_QUEUE,
    getStandardResourceType: original.getStandardResourceType,
    QuotaError: original.QuotaError,
    ConflictError: original.ConflictError
  };
});

jest.mock('../src/utils/aws', () => ({
  getCredentials: mockGetCredentials
}));

jest.mock('@aws-sdk/client-sqs', () => ({
  __esModule: true,
  SQS: mockSqs
}));

import {
  ChangeType, ResourceDiffRecord
} from '@tinystacks/precloud';
import {
  sqsQueueResourceTest
} from '../src/sqs-resource-tests';

describe('sqs smoke tests', () => {
  beforeEach(() => {
    mockSqs.mockReturnValueOnce({
      listQueues: mockListQueues
    });
  });

  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('sqsQueueResourceTest', () => {
    it('does nothing if change type is not create', async () => {
      const resource = {
        changeType: ChangeType.UPDATE
      } as ResourceDiffRecord;

      await sqsQueueResourceTest(resource, [resource]);

      expect(mockLoggerInfo).not.toBeCalled();
      expect(mockGetCredentials).not.toBeCalled();
      expect(mockListQueues).not.toBeCalled();
    });
    it('does nothing if resource does not have QueueName property', async () => {
      const resource = {
        changeType: ChangeType.CREATE
      } as ResourceDiffRecord;

      await sqsQueueResourceTest(resource, [resource]);

      expect(mockLoggerInfo).not.toBeCalled();
      expect(mockGetCredentials).not.toBeCalled();
      expect(mockListQueues).not.toBeCalled();
    });
    it('validates name is unique if change type is create', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        properties: {
          QueueName: 'mock-queue'
        }
      } as unknown as ResourceDiffRecord;

      await sqsQueueResourceTest(resource, [resource]);

      expect(mockLoggerInfo).toBeCalled();
      expect(mockLoggerInfo).toBeCalledWith('Checking if queue name mock-queue is unique...');
      expect(mockGetCredentials).toBeCalled();
      expect(mockListQueues).toBeCalled();
      expect(mockListQueues).toBeCalledWith({
        QueueNamePrefix: 'mock-queue'
      });
    });
    it('throws a ConflictError if name is not unique within the template', async () => {
      const resource1 = {
        resourceType: 'AWS::SQS::Queue',
        changeType: ChangeType.CREATE,
        properties: {
          QueueName: 'mock-queue'
        },
        logicalId: 'queue-1'
      } as unknown as ResourceDiffRecord;
      const resource2 = {
        resourceType: 'AWS::SQS::Queue',
        changeType: ChangeType.CREATE,
        properties: {
          QueueName: 'mock-queue'
        },
        logicalId: 'queue-2'
      } as unknown as ResourceDiffRecord;
      

      let thrownError;
      try {
        await sqsQueueResourceTest(resource1, [resource1, resource2]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking if queue name mock-queue is unique...');
        expect(mockGetCredentials).not.toBeCalled();
        expect(mockListQueues).not.toBeCalled();

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Conflict!');
        expect(thrownError).toHaveProperty('reason', 'Multiple SQS queues with the same name ("mock-queue") found in template!');
        expect(thrownError).toHaveProperty('hints', [
          'SQS queue names should be unique.',
          'Consider renaming one or more of the following resource: \n[\n  \"queue-2\",\n  \"queue-1\"\n]'
        ]);
      }
    });
    it('throws a ConflictError if name is not unique within the AWS environment', async () => {
      const resource = {
        changeType: ChangeType.CREATE,
        properties: {
          QueueName: 'mock-queue'
        }
      } as unknown as ResourceDiffRecord;
      mockListQueues.mockResolvedValueOnce({
        QueueUrls: ['https://aws-stuff/mock-queue']
      });

      let thrownError;
      try {
        await sqsQueueResourceTest(resource, [resource]);
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerInfo).toBeCalled();
        expect(mockLoggerInfo).toBeCalledWith('Checking if queue name mock-queue is unique...');
        expect(mockGetCredentials).toBeCalled();
        expect(mockListQueues).toBeCalled();
        expect(mockListQueues).toBeCalledWith({
          QueueNamePrefix: 'mock-queue'
        });

        expect(thrownError).not.toBeUndefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Conflict!');
        expect(thrownError).toHaveProperty('reason', 'An SQS queue with name mock-queue already exists!');
      }
    });
  });
});