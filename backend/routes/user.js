const { Router } = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { userModel, purchaseModel, courseModel, lessonModel } = require("../db");
const { JWT_USER_PASSWORD, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require("../config");
const { userMiddleware } = require("../middleware/user");
const userRouter = Router();

const zoduserSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6),
  firstName: z.string().min(3).max(20),
  lastName: z.string().min(3).max(20),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

userRouter.post("/signup", async function (req, res) {
  try {
    const { email, password, firstName, lastName } = zoduserSchema.parse(
      req.body
    );
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.send({
        message: "User already exists!!",
      });
    }
    const hashedpassword = await bcrypt.hash(password, 5);
    await userModel.create({
      email,
      password: hashedpassword,
      firstName,
      lastName,
    });
    res.json({
      message: "You are signed up",
    });
  } catch (e) {
    res.status(403).json({
      error: e.errors,
    });
  }
});

userRouter.post("/signin", async function (req, res, next) {
  try {
    const { email, password } = signinSchema.parse(req.body);
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(403).json({ message: "Users does not exists" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign({ id: user._id }, JWT_USER_PASSWORD);
      res.json({ token });
    } else {
      res.status(403).json({ message: "Invalid creadentials" });
    }
  } catch (e) {
    next(e);
  }
});

userRouter.post("/purchase/:courseId/order", userMiddleware, async function (req, res, next) {
  try {
    const userId = req.userId;
    const courseId = req.params.courseId;

    // Check if course exists
    const course = await courseModel.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if already purchased
    const existingPurchase = await purchaseModel.findOne({ userId, courseId });
    if (existingPurchase) {
      return res.status(409).json({ message: "You have already purchased this course" });
    }

    // Explicit check for Razorpay keys so the user knows exactly why it fails!
    if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === 'YOUR_RAZORPAY_KEY_ID') {
      return res.status(500).json({ message: "Admin has not configured Razorpay keys in .env yet!" });
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });

    const options = {
      amount: course.price * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.json({
      message: "Order generated successfully",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID || 'test_key'
    });
  } catch (e) {
    next(e);
  }
});

userRouter.post("/purchase/verify", userMiddleware, async function (req, res, next) {
  try {
    const userId = req.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;

    // Verify signature
    const secret = RAZORPAY_KEY_SECRET || 'test_secret';
    const generated_signature = crypto.createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Payment is authentic, grant access
    await purchaseModel.create({
      userId,
      courseId,
    });

    res.json({
      message: "Payment verified and course purchased successfully",
    });
  } catch (e) {
    next(e);
  }
});

userRouter.get("/purchase", userMiddleware, async function (req, res, next) {
  try {
    const userId = req.userId;
    const purchases = await purchaseModel.find({ userId });

    const purchasedCourseIds = purchases.map((p) => p.courseId);

    const coursesData = await courseModel.find({
      _id: { $in: purchasedCourseIds },
    });

    res.json({
      purchases,
      coursesData,
    });
  } catch (e) {
    next(e);
  }
});

userRouter.get("/course/:courseId/lessons", userMiddleware, async function (req, res, next) {
  try {
    const userId = req.userId;
    const courseId = req.params.courseId;

    // Check if user purchased the course
    const purchase = await purchaseModel.findOne({ userId, courseId });
    if (!purchase) {
      return res.status(403).json({ message: "You have not purchased this course yet." });
    }

    const lessons = await lessonModel.find({ courseId }).sort({ order: 1 });

    res.json({
      message: "Lessons retrieved successfully",
      lessons
    });
  } catch (e) {
    next(e);
  }
});

module.exports = {
  userRouter: userRouter,
};
