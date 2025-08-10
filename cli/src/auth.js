import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const SCOPE = 'https://ai.azure.com/.default';

export async function getToken() {
  const { token } = await credential.getToken(SCOPE);
  return token;
}
