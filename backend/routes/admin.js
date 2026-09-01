const { Router } = require("express");
const { z } = require("zod");
const { adminModel, courseModel, lessonModel } = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_ADMIN_PASSWORD } = require("../config");
const { adminMiddleware } = require("../middleware/admin");
const { upload } = require("../utils/cloudinary");

const adminRouter = Router();

const zodadminschema = z.object({
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

const createCourseSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(5),
  price: z.coerce.number().positive(),
});

const updateCourseSchema = z.object({
  courseId: z.string().length(24),
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(5).optional(),
  price: z.coerce.number().positive().optional(),
});

const createLessonSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  videoUrl: z.string().url(),
  order: z.number().optional()
});

adminRouter.post("/signup", async function (req, res) {
  try {
    const { email, password, firstName, lastName } = zodadminschema.parse(
      req.body
    );
    const existingadmin = await adminModel.findOne({ email });
    if (existingadmin) {
      return res.status(409).json({
        message: "Admin already exists",
      });
    }
    const adminhashedpassword = await bcrypt.hash(password, 5);

    await adminModel.create({
      email,
      password: adminhashedpassword,
      firstName,
      lastName,
    });
    return res.status(201).json({
      message: "Admin signup succeeded",
    });
  } catch (e) {
    res.status(403).send({
      error: e.errors || "something went wrong",
    });
  }
});

adminRouter.post("/signin", async function (req, res, next) {
  try {
    const { email, password } = signinSchema.parse(req.body);
    const admin = await adminModel.findOne({ email });
    if (!admin) {
      return res.status(403).json({ message: "Admin does not exists" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (passwordMatch) {
      const token = jwt.sign({ id: admin._id }, JWT_ADMIN_PASSWORD);
      res.json({ token });
    } else {
      res.status(403).json({ message: "Invalid creadentials" });
    }
  } catch (e) {
    next(e);
  }
});
adminRouter.post("/course", adminMiddleware, upload.single("image"), async function (req, res, next) {
  try {
    const adminId = req.userId;
    const { title, description, price } = createCourseSchema.parse(req.body);

    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const course = await courseModel.create({
      title,
      description,
      imageUrl: req.file.path, // Cloudinary secure URL
      price,
      createrId: adminId,
    });
    res.json({
      message: "Course created successfully",
      courseId: course._id,
    });
  } catch (e) {
    next(e);
  }
});
adminRouter.put("/course", adminMiddleware, upload.single("image"), async function (req, res, next) {
  try {
    const adminId = req.userId;
    const { title, description, price, courseId } = updateCourseSchema.parse(req.body);

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = price;
    if (req.file) updateData.imageUrl = req.file.path; // update image only if new one uploaded

    const course = await courseModel.updateOne(
      { _id: courseId, createrId: adminId },
      updateData
    );
    res.json({
      message: "Course updated",
      courseId: course._id, // note: updateOne does not return the updated doc, we might need findOneAndUpdate in the future if we want _id back
    });
  } catch (e) {
    next(e);
  }
});
adminRouter.get("/course/all", adminMiddleware, async function (req, res, next) {
  try {
    const adminId = req.userId;
    
    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const courses = await courseModel.find({
      createrId: adminId,
    })
    .skip(skip)
    .limit(limit);

    const totalCourses = await courseModel.countDocuments({ createrId: adminId });

    res.json({
      message: "Courses retrieved",
      courses,
      pagination: {
        total: totalCourses,
        page,
        limit,
        totalPages: Math.ceil(totalCourses / limit)
      }
    });
  } catch (e) {
    next(e);
  }
});

adminRouter.post("/course/:courseId/lesson", adminMiddleware, async function (req, res, next) {
  try {
    const adminId = req.userId;
    const courseId = req.params.courseId;
    
    // Check if the course belongs to the admin
    const course = await courseModel.findOne({ _id: courseId, createrId: adminId });
    if (!course) {
      return res.status(404).json({ message: "Course not found or you do not have permission" });
    }

    const { title, description, videoUrl, order } = createLessonSchema.parse(req.body);

    const lesson = await lessonModel.create({
      courseId,
      title,
      description,
      videoUrl,
      order: order || 0
    });

    res.status(201).json({
      message: "Lesson created successfully",
      lessonId: lesson._id
    });
  } catch (e) {
    next(e);
  }
});

// Update a course
adminRouter.put("/course/:courseId", adminMiddleware, upload.single('image'), async function(req, res, next) {
    try {
        const adminId = req.userId;
        const courseId = req.params.courseId;
        const { title, description, price } = req.body;

        const updateData = { title, description, price };
        
        // If a new image was uploaded, update the imageUrl
        if (req.file) {
            updateData.imageUrl = req.file.path;
        }

        const course = await courseModel.findOneAndUpdate(
            { _id: courseId, createrId: adminId },
            updateData,
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ message: "Course not found or you do not have permission to edit it" });
        }

        res.json({
            message: "Course updated successfully",
            courseId: course._id
        });
    } catch (e) {
        next(e);
    }
});

// Delete a course
adminRouter.delete("/course/:courseId", adminMiddleware, async function(req, res, next) {
    try {
        const adminId = req.userId;
        const courseId = req.params.courseId;

        const course = await courseModel.findOneAndDelete({
            _id: courseId,
            createrId: adminId
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found or you do not have permission to delete it" });
        }

        res.json({
            message: "Course deleted successfully"
        });
    } catch (e) {
        next(e);
    }
});

module.exports = {
  adminRouter,
};
