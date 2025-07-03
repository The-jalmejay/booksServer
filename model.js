const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  user: { type: String, required: true },
  password: { type: String, required: true },
});
const optionsSchema = new mongoose.Schema({
  maxResults: {
    type: Number,
    required: true,
    min: 1,
    default: 8,
  },
  printType: {
    type: Boolean,
    default: true,
  },
  langRestrict: {
    type: Boolean,
    default: true,
  },
  filter: {
    type: Boolean,
    default: true,
  },
  orderBy: {
    type: Boolean,
    default: true,
  },user: {
    type: String,
    default:"user",
    required: true,
  },
});
const cartSchema = new mongoose.Schema({
  user: { type: String, required: true },
  items: [
    {
      bookId: String,
      title: String,
      authors: [String],
      thumbnail: String,
      quantity: { type: Number, default: 1 },
    },
  ],
});
const Cart = mongoose.model("Cart", cartSchema);

module.exports = {
  User: mongoose.model("User", userSchema),
  Options: mongoose.model("Options", optionsSchema),
  Cart: Cart,
};
