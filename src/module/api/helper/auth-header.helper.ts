/**
 * @description The helpers to extract the token values from the headers.
 */
const AUTH_HEADER = 'authorization';
const MATCHES_TOKEN = /(\S+)\s+(\S+)/;
const BEARER_AUTH_SCHEME = 'bearer';
export class AuthHeaderExtractor {
  /**
   * @description Parses the auth headers.
   * @param {string} authorization
   * @return {scheme: string; value: string}
   */
  static parseAuthHeader(authorization: string): { scheme: string; value: string } {
    const matches = authorization.match(MATCHES_TOKEN);
    return matches && { scheme: matches[1], value: matches[2] };
  }

  /**
   * @description Extract the token value from the authorization headers.
   * Inspired by https://github.com/nestjs/nest/blob/master/sample/19-auth-jwt/src/auth/strategies/jwt.strategy.ts
   * @param {string} authScheme
   */
  static fromAuthHeaderAsBearerToken(request: { headers: { [x: string]: any } }) {
    let token = null;
    const authSchemeLower = BEARER_AUTH_SCHEME.toLowerCase();
    if (request.headers[AUTH_HEADER]) {
      const authParams = this.parseAuthHeader(request.headers[AUTH_HEADER]);
      if (authParams && authSchemeLower === authParams.scheme.toLowerCase()) {
        token = authParams.value;
      }
    }
    return token;
  }
}
