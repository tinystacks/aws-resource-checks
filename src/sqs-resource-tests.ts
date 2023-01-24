import { SQS } from '@aws-sdk/client-sqs';
import {
  logger,
  ConflictError,
  ChangeType,
  ResourceDiffRecord,
  CheckOptions
} from '@tinystacks/precloud';
import { getCredentials } from './utils/aws';

async function validateQueueNameIsUnique (queueName: string): Promise<void | never> {
  logger.info(`Checking if queue name ${queueName} is unique...`);
  const sqsClient = new SQS({
    credentials: await getCredentials()
  });
  const response = await sqsClient.listQueues({
    QueueNamePrefix: queueName
  });
  const { QueueUrls = [] } = response || {};
  if (QueueUrls.some(url => url.endsWith(`/${queueName}`))) throw new ConflictError(`An SQS queue with name ${queueName} already exists!`);
}

async function sqsQueueResourceTest (resource: ResourceDiffRecord, _allResources?: ResourceDiffRecord[], _config?: CheckOptions): Promise<void | never> {
  if (resource.changeType === ChangeType.CREATE) {
    await validateQueueNameIsUnique(resource.properties.QueueName);
  }
}

export {
  sqsQueueResourceTest
};