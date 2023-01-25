import { SQS } from '@aws-sdk/client-sqs';
import {
  logger,
  ConflictError,
  ChangeType,
  ResourceDiffRecord,
  CheckOptions,
  SQS_QUEUE,
  getStandardResourceType
} from '@tinystacks/precloud';
import { getCredentials } from './utils/aws';

async function validateQueueNameIsUnique (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[]): Promise<void | never> {
  const queueName = resource.properties?.QueueName;
  if (!queueName) {
    return;
  }
  logger.info(`Checking if queue name ${queueName} is unique...`);

  /**
   * Consider moving this to template checks.
   */
  const otherQueuesWithSameName = allResources.filter((res: ResourceDiffRecord) => (
    getStandardResourceType(res.resourceType) === SQS_QUEUE &&
    res.logicalId !== resource.logicalId &&
    res.properties?.QueueName === queueName
  ));

  if (otherQueuesWithSameName.length > 0) {
    throw new ConflictError(
      `Multiple SQS queues with the same name ("${queueName}") found in template!`,
      'SQS queue names should be unique.',
      `Consider renaming one or more of the following resource: \n${JSON.stringify(
        [...otherQueuesWithSameName, resource].map((res: ResourceDiffRecord) => res.logicalId),
        null,
        2
      )}`);
  }

  const sqsClient = new SQS({
    credentials: await getCredentials()
  });
  const response = await sqsClient.listQueues({
    QueueNamePrefix: queueName
  });
  const { QueueUrls = [] } = response || {};
  if (QueueUrls.some(url => url.endsWith(`/${queueName}`))) throw new ConflictError(`An SQS queue with name ${queueName} already exists!`);
}

async function sqsQueueResourceTest (resource: ResourceDiffRecord, allResources: ResourceDiffRecord[], _config?: CheckOptions): Promise<void | never> {
  if (resource.changeType === ChangeType.CREATE) {
    await validateQueueNameIsUnique(resource, allResources);
  }
}

export {
  sqsQueueResourceTest
};