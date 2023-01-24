import {
  fromNodeProviderChain,
  fromEnv
} from '@aws-sdk/credential-providers';
import { CliError } from '@tinystacks/precloud';
import isNil from 'lodash.isnil';

async function getCredentials () {
  const envProvider = fromEnv();
  const envCreds = await envProvider().catch(() => undefined);
  const nodeChainProvider = fromNodeProviderChain();
  const nodeChainCreds = await nodeChainProvider().catch(() => undefined);
  const creds = envCreds || nodeChainCreds;
  if (isNil(creds)) throw new CliError('Failed to detect AWS credentials!', 'AWS credentials were not found in the environment or anywhere else on the node chain provider.', 'Make sure you are authenticated to the AWS account you plan to deploy to.');
  return creds;
}

export {
  getCredentials
};