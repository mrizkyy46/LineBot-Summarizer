export function createLineConfig(env) {
  return {
    channelSecret: env.LINE_CHANNEL_SECRET,
  };
}
