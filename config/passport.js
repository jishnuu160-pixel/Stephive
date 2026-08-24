import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                fullName: profile.displayName,
                email:email,
                password:null,
        
                profileImage: profile.photos[0].value 
            });
        }

        if (user.isBlocked) {
            return done(null, false, { message: 'Your account has been blocked by admin.' });
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
    try{
      const user = await User.findById(id);

      if(!user || user.isBlocked){
        return done(null,false);
      }
      done(null,user);
    }catch(err){
       done(err,null);
    }
});

export default passport;