"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPublicBase = apiPublicBase;
exports.oauthCallbackURL = oauthCallbackURL;
exports.configurePassport = configurePassport;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_microsoft_1 = require("passport-microsoft");
const passport_oauth2_1 = __importDefault(require("passport-oauth2"));
const env_1 = require("../config/env");
const oauth_service_1 = require("../services/oauth.service");
/** API public origin for OAuth callbacks. */
function apiPublicBase() {
    if (process.env.OAUTH_CALLBACK_BASE)
        return process.env.OAUTH_CALLBACK_BASE.replace(/\/$/, '');
    if (env_1.env.NODE_ENV !== 'production')
        return `http://localhost:${env_1.env.PORT}`;
    return 'https://api.planii.app';
}
function oauthCallbackURL(provider) {
    return `${apiPublicBase()}/api/auth/${provider}/callback`;
}
async function finishOAuth(provider, profile, done) {
    try {
        const email = profile.emails?.[0]?.value || '';
        const result = await (0, oauth_service_1.loginWithOAuth)({
            provider,
            subject: profile.id,
            email,
            name: profile.displayName || email,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            avatarUrl: profile.photos?.[0]?.value || null,
        });
        done(null, result);
    }
    catch (e) {
        done(e);
    }
}
/** OpenID Connect userinfo helper for LinkedIn / Yahoo. */
function oidcUserProfile(userInfoURL) {
    return function (accessToken, done) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;
        this._oauth2.get(userInfoURL, accessToken, (err, body) => {
            if (err)
                return done(err);
            try {
                const json = JSON.parse(body);
                const email = json.email || '';
                done(null, {
                    id: String(json.sub || json.id || ''),
                    displayName: json.name || email,
                    emails: email ? [{ value: email }] : [],
                    name: { givenName: json.given_name, familyName: json.family_name },
                    photos: json.picture ? [{ value: json.picture }] : [],
                });
            }
            catch (e) {
                done(e);
            }
        });
    };
}
function registerOidcStrategy(name, opts) {
    const strategy = new passport_oauth2_1.default({
        authorizationURL: opts.authorizationURL,
        tokenURL: opts.tokenURL,
        clientID: opts.clientID,
        clientSecret: opts.clientSecret,
        callbackURL: oauthCallbackURL(name),
        scope: opts.scope,
        state: true,
        pkce: true,
    }, (accessToken, refreshToken, profile, done) => {
        void accessToken;
        void refreshToken;
        void finishOAuth(name, profile, done);
    });
    strategy.name = name;
    strategy.userProfile = oidcUserProfile(opts.userInfoURL);
    passport_1.default.use(strategy);
}
function configurePassport() {
    if (env_1.env.googleClientId && env_1.env.googleClientSecret) {
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: env_1.env.googleClientId,
            clientSecret: env_1.env.googleClientSecret,
            callbackURL: oauthCallbackURL('google'),
            scope: ['profile', 'email'],
        }, async (_accessToken, _refreshToken, profile, done) => {
            await finishOAuth('google', profile, done);
        }));
    }
    if (env_1.env.microsoftClientId && env_1.env.microsoftClientSecret) {
        passport_1.default.use(new passport_microsoft_1.Strategy({
            clientID: env_1.env.microsoftClientId,
            clientSecret: env_1.env.microsoftClientSecret,
            callbackURL: oauthCallbackURL('microsoft'),
            scope: ['user.read', 'openid', 'profile', 'email'],
            tenant: 'common',
        }, async (_accessToken, _refreshToken, profile, done) => {
            await finishOAuth('microsoft', profile, done);
        }));
    }
    if (env_1.env.linkedinClientId && env_1.env.linkedinClientSecret) {
        registerOidcStrategy('linkedin', {
            clientID: env_1.env.linkedinClientId,
            clientSecret: env_1.env.linkedinClientSecret,
            authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
            tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
            userInfoURL: 'https://api.linkedin.com/v2/userinfo',
            scope: ['openid', 'profile', 'email'],
        });
    }
    if (env_1.env.yahooClientId && env_1.env.yahooClientSecret) {
        registerOidcStrategy('yahoo', {
            clientID: env_1.env.yahooClientId,
            clientSecret: env_1.env.yahooClientSecret,
            authorizationURL: 'https://api.login.yahoo.com/oauth2/request_auth',
            tokenURL: 'https://api.login.yahoo.com/oauth2/get_token',
            userInfoURL: 'https://api.login.yahoo.com/openid/v1/userinfo',
            scope: ['openid', 'profile', 'email'],
        });
    }
    passport_1.default.serializeUser((user, done) => done(null, user));
    passport_1.default.deserializeUser((user, done) => done(null, user));
}
//# sourceMappingURL=passport.js.map