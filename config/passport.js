import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/usermodel.js';

passport.use(new GoogleStrategy({
    clientID: '110269302681-pvanml2gc8a9hse29hrj74ekrs381i3v.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:5500/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                fullName: profile.displayName,
                email,
            
                profileImage: profile.photos[0].value 
            });
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

export default passport;