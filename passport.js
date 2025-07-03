const { Strategy: JwtStrategy, ExtractJwt } = require("passport-jwt");
const mongoose = require("mongoose");
const { User } = require("./model");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: "jwtsecret10012000", // use .env in production
};

module.exports = (passport) => {
  passport.use(
    new JwtStrategy(opts, async (jwt_payload, done) => {
      // console.log("JWT payload received:", jwt_payload);
      try {
        const user = await User.findOne({ user: jwt_payload.user });
        if (user) return done(null, user);
        return done(null, false);
      } catch (err) {
        console.error("Error in JWT strategy:", err);
        return done(err, false);
      }
    })
  );
};
