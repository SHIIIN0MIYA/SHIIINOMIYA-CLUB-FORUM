import * as Ably from 'ably';

let restClient: Ably.Rest | null = null;

export function isAblyConfigured() {
  return Boolean(process.env.ABLY_API_KEY);
}

function getRestClient() {
  if (!process.env.ABLY_API_KEY) return null;
  restClient ??= new Ably.Rest({ key: process.env.ABLY_API_KEY });
  return restClient;
}

export async function publishRealtime(
  channelName: string,
  eventName: string,
  data: Record<string, unknown>
) {
  const client = getRestClient();
  if (!client) return;

  try {
    await client.channels.get(channelName).publish(eventName, data);
  } catch (error) {
    console.error('Ably publish failed', error);
  }
}

export async function createRealtimeToken(
  userId: string,
  conversationIds: string[]
) {
  const client = getRestClient();
  if (!client) return null;

  const capability: Record<string, string[]> = {
    [`private:user:${userId}`]: ['subscribe'],
  };

  for (const conversationId of conversationIds) {
    capability[`private:conversation:${conversationId}`] = [
      'subscribe',
      'publish',
      'presence',
    ];
  }

  return client.auth.createTokenRequest({
    clientId: userId,
    capability: JSON.stringify(capability),
    ttl: 60 * 60 * 1000,
  });
}
