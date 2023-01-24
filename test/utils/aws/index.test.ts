const mockFromNodeProviderChain = jest.fn();
const mockFromEnv = jest.fn();

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: mockFromNodeProviderChain,  
  fromEnv: mockFromEnv
}));

import {
  getCredentials
} from '../../../src/utils/aws';

describe('aws utils', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('getCredentials', () => {
    it('prefers credentials from environment', async () => {
      mockFromEnv.mockReturnValueOnce(async () => 'env-creds');
      mockFromNodeProviderChain.mockReturnValueOnce(async () => 'chain-creds');

      const result = await getCredentials();

      expect(result).toEqual('env-creds');
    });
    it('return credentials from node provider chain if environment credentials are nil', async () => {
      mockFromEnv.mockReturnValueOnce(async (): Promise<any> => undefined);
      mockFromNodeProviderChain.mockReturnValueOnce(async () => 'chain-creds');

      const result = await getCredentials();

      expect(result).toEqual('chain-creds');
    });
    it('throws if both node provider chain and environment credentials are nil', async () => {
      mockFromEnv.mockReturnValueOnce(async () => { throw new Error('Error!') });
      mockFromNodeProviderChain.mockReturnValueOnce(async (): Promise<any> => undefined);

      let thrownError;
      try {
        await getCredentials();
      } catch (error) {
        thrownError = error;
      } finally {
        expect(thrownError).toBeDefined();
        expect(thrownError).toHaveProperty('name', 'CliError');
        expect(thrownError).toHaveProperty('message', 'Failed to detect AWS credentials!');
        expect(thrownError).toHaveProperty('reason', 'AWS credentials were not found in the environment or anywhere else on the node chain provider.');
        expect(thrownError).toHaveProperty('hints', ['Make sure you are authenticated to the AWS account you plan to deploy to.']);
      }
    });
  });
});