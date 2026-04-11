function ensureAuthToken(userContext, events, done) {
  const authToken = process.env.AUTH_TOKEN;

  if (!authToken) {
    return done(new Error('AUTH_TOKEN is required to run the lifecycle performance test.'));
  }

  userContext.vars.authToken = authToken;
  return done();
}

module.exports = {
  ensureAuthToken,
};
